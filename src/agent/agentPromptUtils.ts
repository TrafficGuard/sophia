import { agentContext, getFileSystem } from '#agent/agentContext';

/**
 * @return An XML representation of the agent's memory
 */
export function buildMemoryPrompt(): string {
	const memory = agentContext().memory;
	let result = '<memory>\n';
	for (const mem of Object.entries(memory)) {
		result += `<${mem[0]}>\n${mem[1]}\n</${mem[0]}>\n`;
	}
	result += '</memory>\n';
	return result;
}

/**
 * @return An XML representation of the agent's memory
 */
export function buildFileSystemPrompt(): string {
	const functions = agentContext().functions;
	if (!functions.getFunctionClassNames().includes('FileSystem')) return '';
	const fileSystem = getFileSystem();
	return `\n<file_system>
			<base_path>${fileSystem.basePath}</base_path>
			<current_working_directory>${fileSystem.getWorkingDirectory()}</current_working_directory>
			</file_system>
`;
}

/**
 * @return An XML representation of the agent's function call history
 */
export function buildFunctionCallHistoryPrompt(): string {
	const functionCalls = agentContext().functionCallHistory;
	let result = '<function_call_history>\n';
	for (const call of functionCalls) {
		let params = '';
		for (let [name, value] of Object.entries(call.parameters)) {
			if (Array.isArray(value)) value = JSON.stringify(value, null, ' ');
			if (typeof value === 'string' && value.length > 150) value = `${value.slice(0, 150)}...`;
			if (typeof value === 'string') value = value.replace('"', '\\"');
			params += `\n  "${name}": "${value}",\n`;
		}
		let output = '';
		if (call.stdoutSummary) {
			output += `<output_summary>${call.stdoutSummary}</output_summary>\n`;
		} else if (call.stdout) {
			output += `<output>${call.stdout}</output>\n`;
		}
		if (call.stderrSummary) {
			output += `<error_summary>${call.stderrSummary}</error_summary>\n`;
		} else if (call.stderr) {
			output += `<error>${call.stderr}</error>\n`;
		}
		result += `<function_call>\n ${call.function_name}({${params}})\n ${output}</function_call>\n`;
	}
	result += '</function_call_history>\n';
	return result;
}

/**
 * Update the system prompt to include all the function definitions available to the agent.
 * Requires the system prompt to contain <functions></functions>
 * @param systemPrompt {string} the initial system prompt
 * @param functionDefinitions {string} the function definitions
 * @returns the updated system prompt
 */
export function updateFunctionDefinitions(systemPrompt: string, functionDefinitions: string): string {
	const regex = /<functions>[\s\S]*?<\/functions>/g;
	const updatedPrompt = systemPrompt.replace(regex, `<functions>${functionDefinitions}</functions>`);
	if (!updatedPrompt.includes(functionDefinitions)) throw new Error('Unable to update function definitions. Regex replace failed');
	return updatedPrompt;
}
