import { Span } from '@opentelemetry/api';
import { agentContext } from '#agent/agentContext';
import { logger } from '#o11y/logger';
import { getTracer, setFunctionSpanAttributes, withActiveSpan } from '#o11y/trace';
import { functionDefinitionParser } from './functionDefinitionParser';
import { FunctionDefinition, getFunctionDefinitions, setFunctionDefinitions } from './functions';

export const FUNC_DECORATOR_NAME = 'func';

/**
 * Decorator which flags a class method to be exposed as a function for the agents.
 */
export function func() {
	// NOTE - this is similar to span() in trace.ts and modified to trace all arguments
	// Any changes should be kept in sync
	return function spanDecorator(originalMethod: any, context: ClassMethodDecoratorContext): any {
		const methodName = String(context.name);
		return async function replacementMethod(this: any, ...args: any[]) {
			const tracer = getTracer();
			if (!tracer) {
				try {
					agentContext()?.callStack.push(methodName);
					return await originalMethod.call(this, ...args);
				} finally {
					agentContext()?.callStack.pop();
				}
			}
			const className = Object.getPrototypeOf(this).constructor.name;
			const functionName = `${className}.${methodName}`;
			// NOTE - modification, build attributeExtractors from all the arguments
			const funcDefinitions = getFunctionDefinitions(this);
			const funcDef: FunctionDefinition = funcDefinitions[functionName];
			if (!funcDef)
				throw new Error(`No function definition found for ${functionName}. Does the method have JSDoc?. Valid functions are ${Object.keys(funcDefinitions)}`);
			const attributeExtractors = {};
			if (funcDef.parameters === undefined) throw new Error(`No parameters defined for ${functionName}`);
			for (const param of funcDef.parameters) {
				attributeExtractors[param.name] = param.index;
			}

			return await withActiveSpan(methodName, async (span: Span) => {
				setFunctionSpanAttributes(span, methodName, attributeExtractors, args);
				span.setAttribute('call', agentContext()?.callStack.join(' > '));

				const result = originalMethod.call(this, ...args);
				if (typeof result?.then === 'function') await result;
				try {
					span.setAttribute('result', JSON.stringify(result));
				} catch (e) {
					logger.info(`Could not serialize result from function ${methodName}: ${e.message}`);
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
		setFunctionDefinitions(target, functionDefinitionParser(filename));
		return target;
	};
}
