import { expect } from 'chai';
import sinon from 'sinon';
import { AgentContext, createContext, deserializeAgentContext, serializeContext } from '#agent/agentContext';
import { RunAgentConfig, runAgent } from '#agent/agentRunner';
import { getHumanInLoopSettings } from '#agent/humanInLoop';
import { Toolbox } from '#agent/toolbox';
import { FileSystem } from '#functions/filesystem';
import { UtilFunctions } from '#functions/util';
import { GPT4 } from '#llm/models/openai';
import { initInMemoryApplicationContext } from '../app';

import { currentUser } from '#user/userService/userContext';

describe('agentContext', () => {
	describe('serialisation', () => {
		it('should be be identical after serialisation and deserialization', async () => {
			initInMemoryApplicationContext();
			const llms = {
				easy: GPT4(),
				medium: GPT4(),
				hard: GPT4(),
				xhard: GPT4(),
			};
			const toolbox = new Toolbox();
			toolbox.addToolType(FileSystem);

			const config: RunAgentConfig = {
				agentName: 'SWE',
				llms,
				toolbox,
				user: currentUser(),
				initialPrompt: 'question',
				humanInLoop: getHumanInLoopSettings(),
			};
			const agentContext: AgentContext = createContext(config);
			agentContext.fileSystem.setWorkingDirectory('./workingDir');
			agentContext.toolbox.addToolType(UtilFunctions);
			agentContext.memory.memory_key = 'memory_value';
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
