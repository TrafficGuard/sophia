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
			const agentContext = createContext(llms, 'guid123');
			agentContext.fileSystem.setWorkingDirectory('./workingDir');
			agentContext.toolbox.addToolType(UtilFunctions);
			agentContext.memory.set('memory_key', 'memory_value');
			const serialised: string = serializeContext(agentContext);

			expect(serialised).to.include('memory_key');
			expect(serialised).to.include('memory_value');
			expect(serialised).to.include('easy');
			expect(serialised).to.include('medium');
			expect(serialised).to.include('workingDir');
			expect(serialised).to.include('UtilFunctions');

			const deserialised = deserializeContext(serialised);
			const reserialised: string = serializeContext(deserialised);
			expect(JSON.parse(serialised)).to.be.deep.equal(JSON.parse(reserialised));
		});
	});
});
