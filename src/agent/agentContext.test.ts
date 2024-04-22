import { readFileSync } from 'fs';
import { expect } from 'chai';
import sinon from 'sinon';
import { createContext, deserializeContext, serializeContext } from '#agent/agentContext';
import { runAgent } from '#agent/agentRunner';
import { Toolbox } from '#agent/toolbox';
import { Claude3_Sonnet_Vertex } from '#llm/models/anthropic-vertex';
import { Claude3_Opus } from '#llm/models/claude';
import { GPT4 } from '#llm/models/openai';
import { Gemini_1_5_Pro } from '#llm/models/vertexai';
import { TestFunctions } from '../functions/testFunctions';
import { UtilFunctions } from '../functions/util';

describe('agentContext', () => {
	describe('serialisation', () => {
		it('should be be identical after serialisation and deserialization', async () => {
			const llms = {
				easy: Gemini_1_5_Pro(),
				medium: Claude3_Sonnet_Vertex(),
				hard: GPT4(),
				xhard: Claude3_Opus(),
			};
			const agentContext = createContext('test', llms, 'guid123');
			agentContext.fileSystem.setWorkingDirectory('./workingDir');
			agentContext.toolbox.addToolType(UtilFunctions);
			agentContext.memory.set('memory_key', 'memory_value');
			const serialized = serializeContext(agentContext);
			const serializedToString: string = JSON.stringify(serialized);

			expect(serializedToString).to.include('memory_key');
			expect(serializedToString).to.include('memory_value');
			expect(serializedToString).to.include('easy');
			expect(serializedToString).to.include('medium');
			expect(serializedToString).to.include('workingDir');
			expect(serializedToString).to.include('UtilFunctions');

			const deserialised = deserializeContext(serialized);
			const reserialised = serializeContext(deserialised);
			expect(serialized).to.be.deep.equal(reserialised);
		});
	});
});
