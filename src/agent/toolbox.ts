import { FunctionDefinition } from '#agent/functions';
import { Invoke } from '#llm/llm';
import { Agent } from './agentFunctions';

export class Toolbox {
	tools = {
		Agent: new Agent(),
	};

	getTools() {
		return Object.values(this.tools);
	}

	addTool(name: string, tool: any): void {
		this.tools[name] = tool;
	}

	async invokeTool(invocation: Invoke): Promise<any> {
		const [toolName, methodName] = invocation.tool_name.split('.');
		const tool = this.tools[toolName];
		if (!tool) throw new Error(`Tool ${toolName} does not exist`);
		const method = tool[methodName];
		if (!method) {
			throw new Error(`Method ${toolName}.${methodName} does not exist`);
		}
		if (typeof method !== 'function') throw new Error(`Tool error: ${toolName}.${methodName} is not a function. Is a ${typeof method}`);

		// console.log(`Invoking ${invocation.tool_name} with ${JSON.stringify(invocation.parameters)}`);
		const args = Object.values(invocation.parameters);
		let result: any;
		if (args.length === 0) {
			result = await method.call(tool);
		} else if (args.length === 1) {
			result = await method.call(tool, args[0]);
		} else {
			const funcDef: FunctionDefinition = Object.getPrototypeOf(tool).__functionsObj;
			const args: any[] = new Array(funcDef.parameters.length);
			for (const [paramName, paramValue] of Object.entries(invocation.parameters)) {
				const paramDef = funcDef.parameters.find((paramDef) => paramDef.name === paramName);
				if (paramDef) throw new Error(`Invalid parameter name: ${paramName}`);
				args[paramDef.index] = paramValue;
			}
			result = await method.call(tool, ...args);
		}
		return result;
	}
}
