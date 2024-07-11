import { Span } from '@opentelemetry/api';
import { agentContext } from '#agent/agentContext';
import { logger } from '#o11y/logger';
import { getTracer, setFunctionSpanAttributes, withActiveSpan } from '#o11y/trace';
import { functionDefinitionParser } from './functionDefinitionParser';
import { FunctionDefinition } from './functions';

/**
 * Decorator for manually defining a function to be used by LLMs
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
 * Decorator which flags a class method to be exposed as a function for the agents.
 */
export function func() {
	// NOTE - this is similar to activeSpan() in trace.ts and modified to trace all arguments
	// Any changes should be kept in sync
	return function spanDecorator(originalMethod: any, context: ClassMethodDecoratorContext): any {
		const functionName = String(context.name);
		return function replacementMethod(this: any, ...args: any[]) {
			const tracer = getTracer();
			if (!tracer) {
				try {
					agentContext()?.callStack.push(functionName);
					return originalMethod.call(this, ...args);
				} finally {
					agentContext()?.callStack.pop();
				}
			}
			// NOTE - modification, build attributeExtractors from all the arguments
			if (!this.__functionsObj) throw new Error(`No function definitions found for ${functionName}. Does the class have the @funcClass decorator?`);
			const funcDef: FunctionDefinition = this.__functionsObj[functionName];
			if (!funcDef) throw new Error(`No function definition found for ${functionName}. Does the method have JSDoc?`);
			const attributeExtractors = {};
			if (funcDef.parameters === undefined) throw new Error(`No parameters defined for ${functionName}`);
			for (const param of funcDef.parameters) {
				attributeExtractors[param.name] = param.index;
			}

			return withActiveSpan(functionName, async (span: Span) => {
				setFunctionSpanAttributes(span, functionName, attributeExtractors, args);
				span.setAttribute('call', agentContext()?.callStack.join(' > '));

				const result = originalMethod.call(this, ...args);
				if (typeof result?.then === 'function') await result;
				try {
					span.setAttribute('result', JSON.stringify(result));
				} catch (e) {
					logger.info(`Could not serialize result from function ${functionName}: ${e.message}`);
				}
				return result;
			});
		};
	};
}

export const functionFactory = {};

/**
 * Decorator for classes which contain functions to make available to the LLMs.
 * This is required so ts-morph can read the source code to dynamically generate the definitions.
 * @param filename Must be __filename
 */
export function funcClass(filename: string) {
	return function ClassDecorator<C extends new (...args: any[]) => any>(target: C, _ctx: ClassDecoratorContext) {
		functionFactory[target.name] = target;
		const [xml, obj] = functionDefinitionParser(filename);
		target.prototype.__functions = xml;
		target.prototype.__functionsObj = obj;
		return target;
	};
}
