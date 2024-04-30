import { agentContextStorage } from '#agent/agentContext';
import { CDATA_END, CDATA_START } from '#utils/xml-utils';

export function buildMemoryPrompt(): string {
	const memory = agentContextStorage.getStore().memory;
	let result = '<memory>\n';
	for (const mem of memory.entries()) {
		result += `<${mem[0]}>${CDATA_START}\n${mem[1]}\n${CDATA_END}</${mem[0]}>\n`;
	}
	result += '</memory>\n';
	return result;
}

export function buildFunctionCallHistoryPrompt(): string {
	const functionCalls = agentContextStorage.getStore().functionCallHistory;
	let result = '<function_call_history>\n';
	for (const call of functionCalls) {
		let params = '';
		for (let [name, value] of Object.entries(call.parameters)) {
			if (Array.isArray(value)) value = JSON.stringify(value, null, ' ');
			if (typeof value === 'string' && value.length > 150) value = `${value.slice(0, 150)}...`;
			if (typeof value === 'string') value = value.replace('"', '\\"');
			params += `\n  "${name}": "${value}",\n`;
		}
		const output = call.stdout ? `<output>${call.stdout}</output>` : `<error>${call.stderr}</error>`;
		result += `<function_call>\n ${call.tool_name}({${params}})\n ${output}</function_call>\n`;
	}
	result += '</function_call_history>\n';
	return result;
}

/**
 * Update the system prompt to include all the function definitions.
 * Requires the system prompt to contain <tools></tools>
 * @param systemPrompt {string} the initial system prompt
 * @param functionDefinitions {string} the function definitions
 * @returns the updated system prompt
 */
export function updateToolDefinitions(systemPrompt: string, functionDefinitions: string): string {
	const regex = /<tools>[\s\S]*?<\/tools>/g;
	const updatedPrompt = systemPrompt.replace(regex, `<tools>${functionDefinitions}</tools>`);
	if (!updatedPrompt.includes(functionDefinitions)) throw new Error('Unable to update tool definitions. Regex replace failed');
	return updatedPrompt;
}
