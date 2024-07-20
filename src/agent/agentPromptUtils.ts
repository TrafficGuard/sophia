import { agentContext, getFileSystem } from '#agent/agentContext';
import { FileMetadata, FileStore } from '#functions/storage/filestore';
import { FileSystem } from '#functions/storage/filesystem';
import { FunctionCallResult } from '#llm/llm';

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
 * Build the information for the FileSystem and FileStore tools, if they have been selected for the agent
 */
export async function buildFilePrompt(): Promise<string> {
	return (await buildFileStorePrompt()) + buildFileSystemPrompt();
}
/**
 * @return An XML representation of the FileSystem tool state
 */
function buildFileSystemPrompt(): string {
	const functions = agentContext().functions;
	if (!functions.getFunctionClassNames().includes(FileSystem.name)) return '';
	const fileSystem = getFileSystem();
	return `\n<file_system>
	<base_path>${fileSystem.basePath}</base_path>
	<current_working_directory>${fileSystem.getWorkingDirectory()}</current_working_directory>
</file_system>
`;
}

/**
 * @returnAn XML representation of the FileStore tool if one exists in the agents functions
 */
async function buildFileStorePrompt(): Promise<string> {
	const fileStore = agentContext().functions.getFunctionType('filestore') as FileStore;
	if (!fileStore) return '';
	const files: FileMetadata[] = await fileStore.listFiles();
	if (!files.length) return '';
	return `\n<filestore>
${JSON.stringify(files)}
</filestore>
`;
}

/**
 * @param maxLength {number} The maximum length of the returned string
 * @return An XML representation of the agent's function call history, limiting the history to a maximum length
 * of the returned string
 */
export function buildFunctionCallHistoryPrompt(maxLength = 20000): string {
	const allFunctionCalls: FunctionCallResult[] = agentContext().functionCallHistory;
	let result = '<function_call_history>\n';

	if (allFunctionCalls.length > 1) result += '<!-- Oldest -->';

	// To maintain a maximum length, we will iterate over the function calls in reverse order
	let currentLength = result.length; // Start with the length of the result header

	// Iterate over function calls in reverse order (newest first)
	for (let i = allFunctionCalls.length - 1; i >= 0; i--) {
		const call = allFunctionCalls[i];
		let params = '';
		for (let [name, value] of Object.entries(call.parameters)) {
			if (Array.isArray(value)) value = JSON.stringify(value, null, ' ');
			// if (typeof value === 'string' && value.length > 150) value = `${value.slice(0, 150)}...`;
			// if (typeof value === 'string') value = value.replace('"', '\\"');
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

		// Construct the function call string
		const functionCallString = `<function_call>\n ${call.function_name}({${params}})\n ${output}</function_call>\n`;
		const newLength = currentLength + functionCallString.length;

		// Check if adding this function call goes beyond maxLength
		if (newLength > maxLength) {
			break; // Stop adding if we exceed the max length
		}

		result = functionCallString + result; // Prepend to result
		currentLength = newLength; // Update currentLength
	}

	if (allFunctionCalls.length) result += '<!-- Newest -->';
	result += '</function_call_history>\n';
	return result;
}

/**
 * Update the system prompt to include all the function schemas available to the agent.
 * Requires the system prompt to contain <functions></functions>
 * @param systemPrompt {string} the initial system prompt
 * @param functionSchemas {string} the function schemas
 * @returns the updated system prompt
 */
export function updateFunctionSchemas(systemPrompt: string, functionSchemas: string): string {
	const regex = /<functions>[\s\S]*?<\/functions>/g;
	const updatedPrompt = systemPrompt.replace(regex, `<functions>${functionSchemas}</functions>`);
	if (!updatedPrompt.includes(functionSchemas)) throw new Error('Unable to update function schemas. Regex replace failed');
	return updatedPrompt;
}
