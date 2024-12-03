<a id="banner"></a>
<p align="center">
  <img src="https://public.trafficguard.ai/sophia/banner.png" alt="Sophia banner"/>
</p>
<p align="center">
  <em>The open TypeScript platform for autonomous AI agents and LLM based workflows </em><br/>
  <small>The Ancient Greek word <em><b>sophía (σοφία)</b></em> variously translates to "clever, skillful, intelligent, wise"</small>
</p>

## Documentation site
[Home](https://sophia.dev/) |  [Setup](https://sophia.dev/setup/) | [Observability](https://sophia.dev/observability/) | [Function calling](https://sophia.dev/functions/) | 
[Autonomous AI Agent](https://sophia.dev/autonomous-agents/) | [AI Software Engineer](https://sophia.dev/software-engineer/) | [AI Code reviews](https://sophia.dev/code-review/) |
[Tools/Integrations](https://sophia.dev/integrations/) | [Roadmap](https://sophia.dev/roadmap/)

---

[Features](#key-features) | [UI Examples](#ui-examples) | [Code examples](#code-examples) | [Contributing](#contributing)

Sophia is a full-featured platform for developing and running agents, LLM based workflows and chatbots.

Included are capable software engineering agents, which have assisted building the platform.

## Key features

- [Advanced Autonomous agents](https://sophia.dev/autonomous-agents)
- [Software developer agents](https://sophia.dev/software-engineer/)
- [Pull request code review agent](https://sophia.dev/code-review/)
- [AI chat interface](https://sophia.dev/chat/)
- [Slack chatbot](https://sophia.dev/chatbot/)
- Supports many LLM services - OpenAI, Anthropic (native & Vertex), Gemini, Groq, Fireworks, Together.ai, DeepSeek, Ollama, Cerebras, X.ai
- Multi-agent [extend-reasoning implementations](https://github.com/TrafficGuard/sophia/tree/main/src/llm/multi-agent) of the LLM interface
- Configurable Human-in-the-loop settings
- [Functional callable tools/integrations](https://sophia.dev/integrations/) (Filesystem, Jira, Slack, Perplexity, Google Cloud, Gitlab, GitHub etc)
- CLI and Web UI interface
- Run locally or deployed on the cloud with multi-user/SSO
- OpenTelemetry based observability
- Leverages the extensive Python AI ecosystem through executing Python scripts/packages

## Autonomous agents

- Reasoning/planning inspired from Google's [Self-Discover](https://arxiv.org/abs/2402.03620) and other papers
- Memory and function call history for complex workflows
- Iterative planning with hierarchical task decomposition
- Sandboxed execution of generated code for multi-step function calling and logic
- LLM function schemas auto-generated from source code
- Human-in-the-loop for budget control, agent initiated questions and error handling

More details at the [Autonomous agent docs](https://sophia.dev/autonomous-agents)

## Software developer agents

- Code Editing Agent for local repositories
  - Auto-detection of project initialization, compile, test and lint
  - Task file selection agent selects the relevant files
  - Design agent creates the implementation plan.
  - Code editing loop with compile, lint, test, fix (editing delegates to [Aider](https://aider.chat/))
    - Compile error analyser can search online, add additional files and packages
  - Final review of the changes with an additional code editing loop if required.
- Software Engineer Agent (For ticket to Pull Request workflow):
  - Find the appropriate repository from GitLab/GitHub
  - Clone and create branch
  - Call the Code Editing Agent
  - Create merge request
- Code Review agent:
  - Configurable code review guidelines
  - Posts comments on GitLab merge requests at the appropriate line with suggested changes
- Repository ad hoc query agent
- Codebase awareness - optional index creation used by the task file selection agent

More details at the [Software developer agents](https://sophia.dev/software-engineer/) docs.

## Flexible run/deploy options

- Run from the repository or the provided Dockerfile in single user mode.
- CLI interface
- Web interface
- Scale-to-zero deployment on Firestore & Cloud Run
- Multi-user SSO enterprise deployment (with [Google Cloud IAP](https://cloud.google.com/security/products/iap))
- Terraform, infra scripts and more authentication options coming soon.

## UI Examples

### List agents

![List agents](https://public.trafficguard.ai/sophia/agent-list.png)

### New Agent

![New Agent UI](https://public.trafficguard.ai/sophia/agent-new.png)

### Agent error handling

![Feedback requested](https://public.trafficguard.ai/sophia/agent-feedback.png)

### Agent LLM calls

![Agent LLM calls](https://public.trafficguard.ai/sophia/agent-llm-calls.png)

### Sample trace (Google Cloud)

![Sample trace in Google Cloud](https://public.trafficguard.ai/sophia/trace.png)

### Human in the loop notification

<img src="https://public.trafficguard.ai/sophia/feedback.png" width="702">

### Code review configuration

![Code review configuration](https://public.trafficguard.ai/sophia/code-reviews.png)

### AI Chat

![AI chat](https://public.trafficguard.ai/sophia/chat.png)

### User profile

![Profile](https://public.trafficguard.ai/sophia/profile1.png)
![Profile](https://public.trafficguard.ai/sophia/profile2.png)

Default values can also be set from environment variables.

## Code Examples

### Sophia vs LangChain

Sophia doesn't use LangChain, for [many reasons](https://www.octomind.dev/blog/why-we-no-longer-use-langchain-for-building-our-ai-agents) that [you](https://www.google.com/search?q=langchain+site%3Anews.ycombinator.com) can [read](https://www.reddit.com/r/LangChain/comments/1gmfyi2/why_are_people_hating_langchain_so_much/) [online](https://www.google.com/search?q=langchain+sucks+site%3Areddit.com)

The scope of the Sophia platform covers functionality found in LangChain and LangSmith.

Let's compare the LangChain document example for Multiple Chains to the equivalent Sophia implementation.

#### LangChain
```typescript
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatAnthropic } from "@langchain/anthropic";

const prompt1 = PromptTemplate.fromTemplate(
  `What is the city {person} is from? Only respond with the name of the city.`
);
const prompt2 = PromptTemplate.fromTemplate(
  `What country is the city {city} in? Respond in {language}.`
);

const model = new ChatAnthropic({});

const chain = prompt1.pipe(model).pipe(new StringOutputParser());

const combinedChain = RunnableSequence.from([
  {
    city: chain,
    language: (input) => input.language,
  },
  prompt2,
  model,
  new StringOutputParser(),
]);

const result = await combinedChain.invoke({
  person: "Obama",
  language: "German",
});

console.log(result);
```

#### Sophia
```typescript
import { runAgentWorkflow } from '#agent/agentWorkflowRunner';
import { anthropicLLMs } from '#llms/anthropic'

const cityFromPerson = (person: string) => `What is the city ${person} is from? Only respond with the name of the city.`;
const countryFromCity = (city: string, language: string) => `What country is the city ${city} in? Respond in ${language}.`;

runAgentWorkflow({ llms: anthropicLLMs() }, async () => {
  const city = await llms().easy.generateText(cityFromPerson('Obama'));
  const country = await llms().easy.generateText(countryFromCity(city, 'German'));

  console.log(country);
});
```

The Sophia code also has the advantage of static typing with the prompt arguments, enabling you to refactor with ease.
Using simple control flow allows easy debugging with breakpoints/logging.

To run a fully autonomous agent:

```typescript
startAgent({
  agentName: 'Create ollama',
  initialPrompt: 'Research how to use ollama using node.js and create a new implementation under the llm folder. Look at a couple of the other files in that folder for the style which must be followed',
  functions: [FileSystem, Perplexity, CodeEditinAgent],
  llms,
});
```

### Automated LLM function schemas

LLM function calling schema are automatically generated by having the `@func` decorator on class methods, avoiding the
definition duplication using zod or JSON.

```typescript
@funcClass(__filename)
export class Jira {
    instance: AxiosInstance | undefined;
    
    /**
     * Gets the description of a JIRA issue
     * @param {string} issueId - the issue id (e.g. XYZ-123)
     * @returns {Promise<string>} the issue description
     */
    @func()
    async getJiraDescription(issueId: string): Promise<string> {
        if (!issueId) throw new Error('issueId is required');
        const response = await this.axios().get(`issue/${issueId}`);
        return response.data.fields.description;
    }
}
```

## Contributing

We warmly welcome contributions to the project through [issues](https://github.com/TrafficGuard/nous/issues), [pull requests](https://github.com/TrafficGuard/nous/pulls)  or [discussions](https://github.com/TrafficGuard/nous/discussions)
