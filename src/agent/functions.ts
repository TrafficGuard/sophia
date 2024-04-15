// - Types --------------------------------------------------------------------

import { Span } from '@opentelemetry/api';
import { getTracer } from '#o11y/trace';

interface FunctionParameter {
	index: number;
	name: string;
	type: string;
	description: string;
}

export interface FunctionDefinition {
	class: string;
	name: string;
	description: string;
	parameters: FunctionParameter[];
	returns: string;
}

// - Utils --------------------------------------------------------------------

/**
 * Parse a string into an array. Handles JSON array and line seperated formatting.
 * @param paramValue
 */
export function parseArrayParameterValue(paramValue: string): string[] {
	paramValue = paramValue.trim();
	if (paramValue.startsWith('[')) {
		try {
			return JSON.parse(paramValue);
		} catch (e) {}
	}
	return paramValue
		.split('\n')
		.map((path) => path.trim())
		.filter((path) => path.length);
}

/**
 * Gets all the LLM function definitions on a class
 * @param obj the class instance
 * @returns {FunctionDefinition[]}
 */
export function getAllFunctions(obj: any): FunctionDefinition[] {
	if (obj.__functions === undefined || obj.__functions === null) {
		console.log(`no functions set for ${obj.constructor.name}`);
		return [];
	}
	return obj.__functions;
}

// - Decorators ---------------------------------------------------------------

// In generateDefinition.ts are references to the func and funcDef names

/**
 * Decorator for manually defining a function/tool to be used by the LLM
 * @param functionDefinition
 * @returns
 */
export function funcDef(functionDefinition: Omit<FunctionDefinition, 'class'>) {
	return function funcDecorator(originalMethod: any, context: ClassMethodDecoratorContext): any {
		context.addInitializer(function () {
			if (!(this as any).__functions) (this as any).__functions = [];
			(this as any).__functions.push(functionDefinition);
			(functionDefinition as FunctionDefinition).class = context.name.toString();
		});
		return originalMethod;
	};
}

/**
 * Decorator which flags a class method to be exposed as a tool for the agent control loop.
 */
export function func() {
	// NOTE - this is copied from spanWithArgAttributes() in trace.ts and modified to trace all arguments
	// Any changes should be kept in sync
	return function spanDecorator(originalMethod: any, context: ClassMethodDecoratorContext): any {
		const functionName = String(context.name);
		return function replacementMethod(this: any, ...args: any[]) {
			const tracer = getTracer();
			if (!tracer) {
				return originalMethod.call(this, ...args);
			}

			// NOTE - modification, build attributeExtractors from all the arguments
			const funcDef: FunctionDefinition = this.__functionsObj[functionName];
			const attributeExtractors = {};
			for (const param of funcDef.parameters) {
				attributeExtractors[param.name] = param.index;
			}

			return tracer.withActiveSpan(functionName, (span: Span) => {
				for (const [attribute, extractor] of Object.entries(attributeExtractors)) {
					if (typeof extractor === 'number') {
						const value = args[extractor] ?? '';
						// If value is an object type, then iterate over the entries and set the attributes for primitive types
						if (typeof value === 'object') {
							for (const [key, val] of Object.entries(value)) {
								if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
									span.setAttribute(`${attribute}.${key} ${val}`, val);
								}
							}
						} else {
							span.setAttribute(attribute, value);
						}
					} else if (typeof extractor === 'function') {
						span.setAttribute(attribute, extractor(...args));
					} else {
						console.warn(`Invalid attribute extractor for ${functionName}() attribute[${attribute}], must be a number or function`);
					}
				}
				return originalMethod.call(this, ...args);
			});
		};
	};
}
