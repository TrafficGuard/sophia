import * as path from 'path';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { llms } from '#agent/agentContextLocalStorage';
import { FileSystemService } from '#functions/storage/fileSystemService';
import { LlmTools } from '#functions/util';
import { logger } from '#o11y/logger';

const embeddings = new OpenAIEmbeddings({
	model: 'text-embedding-3-small',
});

const vectorStore = new Chroma(embeddings, {
	collectionName: 'codebase-collection',
	url: 'http://localhost:8000',
	collectionMetadata: {
		'hnsw:space': 'cosine',
	},
});

const fileSystem = new FileSystemService();
const llmTools = new LlmTools();

async function generateContextualEmbeddings() {
	try {
		const files = await fileSystem.listFilesRecursively();
		const filteredFiles = files.filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'));

		let documentId = 1;
		for (const file of filteredFiles) {
			const fileContents = await fileSystem.readFile(file);
			const functions = extractFunctions(fileContents);

			const documents: Document[] = [];

			for (const [functionName, functionCode] of Object.entries(functions)) {
				const context = await generateContext(file, functionName, functionCode);
				const embeddingInput = `${context}\n\n${functionCode}`;

				documents.push({
					pageContent: embeddingInput,
					metadata: {
						file,
						functionName,
						context,
					},
				});

				logger.info(`Prepared embedding for function ${functionName} from file ${file}`);
				documentId++;
			}

			// Add documents in batches
			if (documents.length > 0) {
				await vectorStore.addDocuments(documents, {
					ids: documents.map((_, index) => `${documentId - documents.length + index}`),
				});
				logger.info(`Added ${documents.length} documents from file ${file} to vector store`);
			}
		}

		logger.info('Finished generating contextual embeddings for the codebase');
	} catch (error) {
		logger.error('Error generating contextual embeddings:', error);
	}
}

function extractFunctions(fileContents: string): Record<string, string> {
	// This is a simplified function extraction.
	// In a real implementation, you'd use an AST parser for more accurate extraction.
	const functionRegex = /function\s+(\w+)\s*\([\s\S]*?\)\s*{[\s\S]*?}/g;
	const functions: Record<string, string> = {};
	let match: RegExpExecArray | null;
	match = functionRegex.exec(fileContents);
	while (match !== null) {
		functions[match[1]] = match[0];
		match = functionRegex.exec(fileContents);
	}
	return functions;
}

async function extractFunctionsWithLLM(filePath: string, fileContents: string): Promise<Record<string, string>> {
	const prompt = `
You are a code analysis tool. Your task is to extract all the functions from the given TypeScript file and return them in a structured format.

File: ${filePath}

File contents:
\`\`\`typescript
${fileContents}
\`\`\`

Please follow these instructions:
1. Identify all functions in the file, including methods within classes and arrow functions assigned to variables.
2. For each function, provide:
   - The function name (or 'anonymous' if it's an unnamed function)
   - The complete function code, including the function signature and body

Output the results in the following JSON format:
{
  "functionName1": "complete function code 1",
  "functionName2": "complete function code 2",
  ...
}

If there are no functions in the file, return an empty JSON object {}.
Only include the JSON in your response, without any additional text.
`;

	try {
		const response = await llms().easy.generateText(prompt);
		const extractedFunctions: Record<string, string> = JSON.parse(response);
		return extractedFunctions;
	} catch (error) {
		logger.error(`Error extracting functions from ${filePath}:`, error);
		return {};
	}
}

async function generateContext(filePath: string, functionName: string, functionCode: string): Promise<string> {
	const prompt = `
    Generate a concise context for the following function:
    File: ${filePath}
    Function: ${functionName}

    ${functionCode}

    Provide a brief description of the function's purpose and its role within the file and project structure.
    Limit the response to 2-3 sentences.
    `;

	return await llmTools.processText(functionCode, prompt);
}

// Export the function to be called from other modules
export async function initializeCodebaseVectorStore() {
	await generateContextualEmbeddings();
}
