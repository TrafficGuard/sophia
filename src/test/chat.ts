import { readFileSync, writeFileSync } from 'fs';
import { Span } from '@opentelemetry/api';
import { AgentContext, AgentLLMs, agentContext, createContext, enterWithContext } from '#agent/agentContext';
import '#fastify/trace-init/trace-init';
import { LLM } from '#llm/llm';
import { Claude3_Sonnet_Vertex } from '#llm/models/anthropic-vertex';
import { Claude3_Opus, Claude3_Sonnet } from '#llm/models/claude';
import { GroqLLM } from '#llm/models/groq';
import { GPT } from '#llm/models/openai';
import { Gemini_1_0_Pro, Gemini_1_5_Pro } from '#llm/models/vertexai';
import { withActiveSpan } from '#o11y/trace';
import { AGENT_LLMS } from '../agentLLMs';

// Usage:
// npm run ai

let llm: LLM = Claude3_Sonnet_Vertex();
llm = Claude3_Opus();
llm = Gemini_1_5_Pro();

const llms: AgentLLMs = {
	easy: llm,
	medium: llm,
	hard: llm,
	xhard: llm,
};

async function main() {
	// const system = readFileSync('chat-system', 'utf-8');
	const prompt = readFileSync('src/test/chat-in', 'utf-8');

	const context: AgentContext = createContext('chat', llms);
	agentContext.enterWith(context);
	context.toolbox.addTool(context.fileSystem, 'FileSystem');

	// console.log(prompt)
	const text =  await llm.generateText(prompt);

	writeFileSync('src/test/chat-out', text);
	console.log('wrote to chat-out');
}

main()
	.then(() => {
		console.log('done');
	})
	.catch((e) => {
		console.error(e);
	});

/*
The following is an example of how a plan structure evolves as information is discovered
<revised_task>
</revised_task>
<task_tool_plan_pseudocode>
</task_tool_plan_pseudocode>

3. Update a revised version of the current phase task_tool_plan_pseudocode

An example pseudocode for the task "Increment the version of the waf node.js project"
<task_tool_plan_pseudocode>
    # Discovery
    project = GitLabServer.selectProject(requirements)
    project =
</task_tool_plan_pseudocode>

An example pseudocode for the task "Increment the version of the waf node.js project"
<task_tool_plan_pseudocode>
    # Discovery
    project = GitLabServer.selectProject(requirements)
    project =
</task_tool_plan_pseudocode>



You must answer in the following format:
<revised_task>Updated task taking into account any new information retrieved by tools from function calls</revised_task>
<plan_outline></plan_outline>
<function_call_plan description="">
    <phase:requirements goal="Gather the requirements">
        <tool toolName="ToolGroup.toolName" toolParam="paramValue"></tool>
    </phase:requirements>
    <pending_output tool="ToolGroup.toolName"></pending_output>
</function_call_plan>
<current_plan_step></current_plan_step>
<next_step_details>Details of the next step to take with reasoning</next_step_details>
<function_calls></function_calls>



*/
