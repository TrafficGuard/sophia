import { expect } from 'chai';
import sinon from 'sinon';
import { LlmFunctions } from '#agent/LlmFunctions';
import { AgentContext, createContext, deserializeAgentContext, serializeContext } from '#agent/agentContext';
import { RunAgentConfig } from '#agent/agentRunner';
import { FileSystem } from '#functions/storage/filesystem';
import { UtilFunctions } from '#functions/util';
import { GPT4o } from '#llm/models/openai';
import { appContext } from '../app';

describe('agentContext', () => {
	describe('serialisation', () => {
		it('should be be identical after serialisation and deserialization', async () => {
			const llms = {
				easy: GPT4o(),
				medium: GPT4o(),
				hard: GPT4o(),
				xhard: GPT4o(),
			};
			const functions = new LlmFunctions();

			const config: RunAgentConfig = {
				agentName: 'SWE',
				llms,
				functions,
				user: appContext().userService.getSingleUser(),
				initialPrompt: 'question',
			};
			const agentContext: AgentContext = createContext(config);
			agentContext.fileSystem.setWorkingDirectory('./workingDir');
			agentContext.functions.addFunctionClass(UtilFunctions);
			agentContext.functions.addFunctionClass(FileSystem); // add this last so deep equals is happy as it gets re-added
			agentContext.memory.memory_key = 'memory_value';
			agentContext.functionCallHistory.push({
				function_name: 'func',
				parameters: {
					p1: 'v1',
					p2: true,
				},
				stdout: 'output',
				stderr: 'errors',
				stdoutSummary: 'outSummary',
				stderrSummary: 'stderrSummary',
			});
			const serialized = serializeContext(agentContext);
			const serializedToString: string = JSON.stringify(serialized);

			expect(serializedToString).to.include('memory_key');
			expect(serializedToString).to.include('memory_value');
			expect(serializedToString).to.include('easy');
			expect(serializedToString).to.include('medium');
			expect(serializedToString).to.include('workingDir');
			expect(serializedToString).to.include('UtilFunctions');

			const deserialised = await deserializeAgentContext(serialized);
			const reserialised = serializeContext(deserialised);
			expect(serialized).to.be.deep.equal(reserialised);
		});
	});
});
