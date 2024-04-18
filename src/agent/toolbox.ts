import { FunctionDefinition } from '#agent/functions';
import { Invoke } from '#llm/llm';
import { Agent } from './agentFunctions';
import { toolFactory } from './metadata';

export class Toolbox {
	tools: { [toolName: string]: any } = {
		Agent: new Agent(),
	};

	toJSON() {
		return {
			tools: Object.keys(this.tools),
		};
	}

	fromJSON(obj: any): this {
		const toolNames = obj.tools as string[];
		for (const toolName of toolNames) {
			this.tools[toolName] = new toolFactory[toolName]();
		}
		return this;
	}

	getTools(): Array<any> {
		return Object.values(this.tools);
	}

	getToolDefinitions(): Array<FunctionDefinition> {
		return this.getTools().map((tool) => Object.getPrototypeOf(tool).__functionsObj);
	}

	addTool(tool: any, name: string): void {
		this.tools[name] = tool;
	}

	addToolType(...toolTypes: any): void {
		for (const toolType of toolTypes) this.tools[toolType.name] = new toolType();
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
			const funcsDef: Record<string,FunctionDefinition> = Object.getPrototypeOf(tool).__functionsObj; // this lookup should be a method in metadata
			if (!funcsDef) throw new Error(`__functionsObj not found on prototype for ${toolName}.${methodName}`);
			const funcDef = funcsDef[methodName];
			if (!funcDef.parameters) {
				console.error(`${toolName}.${methodName} definition doesnt have any parameters`);
				console.log(funcDef)
			}
			const args: any[] = new Array(funcDef.parameters.length);
			for (const [paramName, paramValue] of Object.entries(invocation.parameters)) {
				const paramDef = funcDef.parameters.find((paramDef) => paramDef.name === paramName);
				if (!paramDef) throw new Error(`Invalid parameter name: ${paramName} for tool ${invocation.tool_name}. Valid parameters are: ${funcDef.parameters.map((paramDef) => paramDef.name).join(', ')}`);
				args[paramDef.index] = paramValue;
			}
			result = await method.call(tool, ...args);
		}
		return result;
	}
}
