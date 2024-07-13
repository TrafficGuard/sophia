import { Agent } from '#agent/agentFunctions';
import { FunctionCall } from '#llm/llm';
import { logger } from '#o11y/logger';
import { FunctionDefinition, getFunctionDefinitions } from '../functionDefinition/functions';

import { functionFactory } from '../functionDefinition/functionDecorators';

/**
 * Holds the instances of the classes with function callable methods.
 */
export class LlmFunctions {
	functionInstances: { [functionClassName: string]: object } = {
		Agent: new Agent(),
	};

	constructor(...functionClasses: Array<new () => any>) {
		this.addFunctionClass(...functionClasses);
	}

	toJSON() {
		return {
			functionClasses: Object.keys(this.functionInstances),
		};
	}

	fromJSON(obj: any): this {
		const functionClassNames = (obj.functionClasses ?? obj.tools) as string[]; // obj.tools for backward compat with dev version
		for (const functionClassName of functionClassNames) {
			if (functionFactory[functionClassName]) this.functionInstances[functionClassName] = new functionFactory[functionClassName]();
			else logger.warn(`${functionClassName} not found`);
		}
		return this;
	}

	getFunctionInstances(): Array<object> {
		return Object.values(this.functionInstances);
	}

	getFunctionClassNames(): string[] {
		return Object.keys(this.functionInstances);
	}

	addFunctionInstance(functionClassInstance: object, name: string): void {
		this.functionInstances[name] = functionClassInstance;
	}

	addFunctionClass(...functionClasses: Array<new () => any>): void {
		// Check the prototype of the instantiated function class has the functions metadata
		for (const functionClass of functionClasses) {
			try {
				this.functionInstances[functionClass.name] = new functionClass();
			} catch (e) {
				logger.error(`Error instantiating function class from type of ${typeof functionClass}`);
				throw e;
			}
		}
	}

	async callFunction(functionCall: FunctionCall): Promise<any> {
		const [functionClass, functionName] = functionCall.function_name.split('.');
		const functionClassInstance = this.functionInstances[functionClass];
		if (!functionClassInstance) throw new Error(`Function class ${functionClass} does not exist`);
		const func = functionClassInstance[functionName];
		if (!func) throw new Error(`Function ${functionClass}.${functionName} does not exist`);
		if (typeof func !== 'function') throw new Error(`Function error: ${functionClass}.${functionName} is not a function. Is a ${typeof func}`);

		const args = Object.values(functionCall.parameters);
		let result: any;
		if (args.length === 0) {
			result = await func.call(functionClassInstance);
		} else if (args.length === 1) {
			result = await func.call(functionClassInstance, args[0]);
		} else {
			const functionDefinitions: Record<string, FunctionDefinition> = getFunctionDefinitions(functionClassInstance);
			const functionDefinition = functionDefinitions[functionName];
			if (!functionDefinition) throw new Error(`No function definition found for ${functionName}.  Valid functions are ${Object.keys(functionDefinitions)}`);
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
			result = await func.call(functionClassInstance, ...args);
		}
		return result;
	}
}
