import { readFileSync, writeFileSync } from 'fs';
import { enterWithContext } from '#agent/agentContext';
import '#fastify/trace-init/trace-init';
import { LLM } from '#llm/llm';
import { Claude3_Sonnet_Vertex } from '#llm/models/anthropic-vertex';
import { Claude3_Opus, Claude3_Sonnet } from '#llm/models/claude';
import { GroqLLM } from '#llm/models/groq';
import { GPT } from '#llm/models/openai';
import { Gemini_1_0_Pro, Gemini_1_5_Pro } from '#llm/models/vertexai';
import { AGENT_LLMS } from './agentLLMs';

// Usage:
// npm run ai

let llm: LLM = Claude3_Sonnet_Vertex();
llm = Claude3_Opus();
// llm = Claude3_Sonnet()
// llm = new GroqLLM()
// llm = Gemini_1_0_Pro()
// llm = Gemini_1_5_Pro();

async function main() {
	const system = readFileSync('ai-system', 'utf-8');
	const prompt = readFileSync('ai-in', 'utf-8');
	enterWithContext(AGENT_LLMS);
	// console.log(prompt)
	const text = await llm.generateText(prompt);
	// console.log(text)
	try {
		writeFileSync('ai-out.json', JSON.parse(text));
		console.log('wrote to ai-out.json');
	} catch (e) {
		writeFileSync('ai-out', text);
		console.log(text);
		console.log('wrote to ai-out');
	}
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
