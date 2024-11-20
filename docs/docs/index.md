#
<a id="banner"></a>
<p align="center">
  <img src="https://public.trafficguard.ai/sophia/banner.png" alt="nous logo"/>
</p>
<p align="center">
  <em><b>The open-source TypeScript platform for AI agents and LLM based workflows</b></em>
</p>
<p align="center">
The Ancient Greek word <em><b>sophía (σοφία)</b></em> variously translates to "clever, skillful, intelligent, wise"
</p>


The Sophia platform provides a complete out-of-the box experience for building AI agents and LLM based workflows with TypeScript.

- [Autonomous agents](https://sophia.dev//autonomous-agents)
- [Software developer agents](https://sophia.dev/software-engineer/)
- [Code review agents](https://sophia.dev/software-engineer/)
- Chat interface
- Chatbots (Slack integration provided)
- Functional callable tools (Filesystem, Jira, Slack, Perplexity, Google Cloud, Gitlab, GitHub and more)
- CLI and Web UI interface
- Run locally or deployed on the cloud with multi-user/SSO
- OpenTelemetry observability

## Autonomous agents

- Reasoning/planning inspired from Google's [Self-Discover](https://arxiv.org/abs/2402.03620) and other papers
- Memory and function call history for complex workflows
- Iterative planning with hierarchical task decomposition
- Sandboxed execution of generated code for multi-step function calling and logic
- LLM function schemas auto-generated from source code
- Human-in-the-loop for budget control, agent initiated questions and error handling

## Software developer agents

- Code Editing Agent:
  - Auto-detection of project initialization, compile, test and lint
  - Task file selection agent
  - Code editing loop with compile, lint, test, fix (editing delegates to [Aider](https://aider.chat/))
    - Compile error analyser can search online, add additional files and packages
  - Review the changes with an additional code editing loop if required.
- Software Engineer Agent (For issue to Pull Request workflow):
  - Find the appropriate repository from GitLab/GitHub
  - Clone and create branch
  - Call the Code Editing Agent
  - Create merge request
- Code review agents
- Query repository agent

## Chatbots

- Slack chatbot

## Flexible run/deploy options

- CLI interface
- Web interface
- Scale-to-zero deployment on Firestore & Cloud Run
- Multi-user SSO enterprise deployment (with [Google Cloud IAP](https://cloud.google.com/security/products/iap))

## LLM support 

OpenAI, Anthropic (native & Vertex), Gemini, Groq, Fireworks, Together.ai, DeepSeek, Ollama, Cerebras, X.ai


- Filesystem, Jira, Slack, Perplexity, Gitlab and more

- Observability with OpenTelemetry tracing

- Code Review agent:
    - Configurable code review guidelines
    - Posts comments on GitLab merge requests at the appropriate line with suggested changes

## UI Examples

### New Agent

![New Agent UI](https://public.trafficguard.ai/nous/start.png)

### Sample trace

![Sample trace in Google Cloud](https://public.trafficguard.ai/nous/trace.png)

### Human in the loop notification

<img src="https://public.trafficguard.ai/nous/feedback.png" width="702">

### Agent requested feedback

![Feedback requested](https://public.trafficguard.ai/nous/agent-feedback.png)

### List agents

![List agents](https://public.trafficguard.ai/nous/list.png)

### Code review configuration

![Code review configuration](https://public.trafficguard.ai/nous/code-review.png)

## Code Examples

### Sophia vs LangChain

Sophia doesn't use LangChain, for [many reasons](https://www.octomind.dev/blog/why-we-no-longer-use-langchain-for-building-our-ai-agents) that [you](https://www.google.com/search?q=langchain+site%3Anews.ycombinator.com) can [read online](https://www.google.com/search?q=langchain+sucks+site%3Areddit.com)

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
import { llms } from '#agent/context'
import { anthropicLLMs } from '#llms/anthropic'

const prompt1 = (person: string) => `What is the city ${person} is from? Only respond with the name of the city.`;
const prompt2 = (city: string, language: string) => `What country is the city ${city} in? Respond in ${language}.`;

runAgentWorkflow({ llms: anthropicLLMs() }, async () => {
  const city = await llms().easy.generateText(prompt1('Obama'));
  const result = await llms().easy.generateText(prompt2(city, 'German'));

  console.log(result);
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
