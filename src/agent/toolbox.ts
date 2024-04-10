import { Invoke } from '../llm/llm';
import { Workflow } from './workflowFunctions';

export class Toolbox {
	tools = {
		Workflow: new Workflow(),
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
			console.error(`Need to handle multiple params for ${invocation.tool_name}`);
			process.exit(1);
		}
		return result;
	}
}
