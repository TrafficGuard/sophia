import { Agent } from '#agent/agentFunctions';
import { FunctionCall } from '#llm/llm';
import { logger } from '#o11y/logger';
import { FunctionDefinition } from '../functionDefinition/functions';

import { functionFactory } from '../functionDefinition/functionDecorators';

export class LlmFunctions {
	functionClasses: { [functionClassName: string]: any } = {
		Agent: new Agent(),
	};

	constructor(...functionClasses: any) {
		this.addFunctionClass(...functionClasses);
	}

	toJSON() {
		return {
			functionClasses: Object.keys(this.functionClasses),
		};
	}

	fromJSON(obj: any): this {
		const functionClassNames = (obj.functionClasses ?? obj.tools) as string[]; // obj.tools for backward compat with dev version
		for (const functionClassName of functionClassNames) {
			if (functionFactory[functionClassName]) this.functionClasses[functionClassName] = new functionFactory[functionClassName]();
			else logger.warn(`${functionClassName} not found`);
		}
		return this;
	}

	getFunctionClasses(): Array<any> {
		return Object.values(this.functionClasses);
	}

	getFunctionClassNames(): string[] {
		return Object.keys(this.functionClasses);
	}

	getFunctionDefinitions(): Array<FunctionDefinition> {
		return this.getFunctionClasses().map((classRef) => Object.getPrototypeOf(classRef).__functionsObj);
	}

	addFunctionClassInstance(functionClassInstance: any, name: string): void {
		this.functionClasses[name] = functionClassInstance;
	}

	addFunctionClass(...functionClassTypes: any): void {
		// Check the prototype of the instantiated function class has the functions metadata
		for (const functionClassType of functionClassTypes) {
			try {
				this.functionClasses[functionClassType.name] = new functionClassType();
			} catch (e) {
				logger.error(`Error instantiating function class from type of ${typeof functionClassType}`);
				throw e;
			}
		}
	}

	async callFunction(functionCall: FunctionCall): Promise<any> {
		const [functionClass, functionName] = functionCall.function_name.split('.');
		const functions = this.functionClasses[functionClass];
		if (!functions) throw new Error(`Function class ${functionClass} does not exist`);
		const func = functions[functionName];
		if (!func) {
			throw new Error(`Function ${functionClass}.${functionName} does not exist`);
		}
		if (typeof func !== 'function') throw new Error(`Function error: ${functionClass}.${functionName} is not a function. Is a ${typeof func}`);

		// console.log(`Invoking ${invocation.function_name} with ${JSON.stringify(invocation.parameters)}`);
		const args = Object.values(functionCall.parameters);
		let result: any;
		if (args.length === 0) {
			result = await func.call(functions);
		} else if (args.length === 1) {
			result = await func.call(functions, args[0]);
		} else {
			const functionDefinitions: Record<string, FunctionDefinition> = Object.getPrototypeOf(functions).__functionsObj; // this lookup should be a method in metadata
			if (!functionDefinitions) throw new Error(`__functionsObj not found on prototype for ${functionClass}.${functionName}`);
			const functionDefinition = functionDefinitions[functionName];
			if (!functionDefinition.parameters) {
				logger.error(`${functionClass}.${functionName} definition doesnt have any parameters`);
				logger.info(functionDefinition);
			}
			const args: any[] = new Array(functionDefinition.parameters.length);
			for (const [paramName, paramValue] of Object.entries(functionCall.parameters)) {
				const paramDef = functionDefinition.parameters.find((paramDef) => paramDef.name === paramName);
				if (!paramDef)
					throw new Error(
						`Invalid parameter name: ${paramName} for function ${functionCall.function_name}. Valid parameters are: ${functionDefinition.parameters
							.map((paramDef) => paramDef.name)
							.join(', ')}`,
					);
				args[paramDef.index] = paramValue;
			}
			result = await func.call(functions, ...args);
		}
		return result;
	}
}
