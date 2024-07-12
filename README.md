<a id="banner"></a>
<p align="center">
  <img src="https://public.trafficguard.ai/nous/banner.png" alt="nous logo"/>
</p>
<p align="center">
  <em>The open-source TypeScript platform for autonomous AI agents and LLM based workflows </em>
</p>
<em><b>Nous</b></em> (Greek: νοῦς) is a term from classical philosophy often associated with intellect or intelligence, represents the human mind's capacity to comprehend truth and reality.

## Documentation site
[Home](https://nous.trafficguard.ai/) |  [Setup](https://nous.trafficguard.ai/setup/) | [Observability](https://nous.trafficguard.ai/observability/) | [Function calling](https://nous.trafficguard.ai/functions/) | 
[Autonomous AI Agent](https://nous.trafficguard.ai/xml-agent/) | [AI Software Engineer](https://nous.trafficguard.ai/software-engineer/) | [AI Code reviews](https://nous.trafficguard.ai/code-review/) |
[Tools/Integrations](https://nous.trafficguard.ai/integrations/) | [Roadmap](https://nous.trafficguard.ai/roadmap/)

---

[The Nous Story](#the-nous-story) | [Features](#features) | [UI Examples](#ui-examples) | [Code examples](#code-examples) | [Contributing](#contributing)

## The Nous Story

Nous started from a simple goal: to harness AI's potential to **enhance real-world productivity**, born in DevOps and Platform Engineering space. We envisioned a tool that could:

- Automate standard and simple requests using natural language prompts.
- Intelligently triage build failures, support requests and production incidents.
- Review code for compliance with standards and best practices.
- Assist with large/complex refactorings, and more.

At TrafficGuard we process billions of events a month for our global clients, [protecting their ad spend](https://www.trafficguard.ai/protect/google-search?ref=gh) from bots and other invalid traffic.
Our SaaS on GCP comprises projects developed in TypeScript, Python, GoogleSQL, PHP and Terraform, deployed from GitLab. 

Given that 1) Open source projects are typically Python/GitHub focused, and 2) the vendor AI tools are focused on their silos, 
we saw a need for TypeScript based tooling which can work across our entire tech stack, and understand how all of our pieces fit together.

Through its evolution we designed it as a flexible platform for the TypeScript community to expand and support the use cases and integrations of your choice.

For example our design choice of Firestore for the initial database implementation and Cloud Run for deployment provides a scale-to-zero solution with zero-cost using the free tier.
With the intention to support uses cases such as your own custom personal assistant, always available via mobile.

## Features

Key features include:

- Advanced autonomous agent
  - Reasoning/planning inspired from Google's [Self-Discover](https://arxiv.org/abs/2402.03620) paper
  - Custom XML-based function calling on any sufficiently capable LLM
  - Memory and function history for complex workflows
- LLM function definitions auto-generated from source code
- Function callable integrations:
  - Filesystem, Jira, Slack, Perplexity, Gitlab, GitHub and more
- Supports multiple LLMs/Services:
  - OpenAI GPT, Anthropic Claude (native and Vertex), Gemini, Groq, Fireworks, Together.ai, DeepSeek, Ollama
- Web interface
- Human-in-the-loop for:
  - Budget control
  - Agent initiated questions
  - Error handling
- Flexible deployment options:
  - Run locally from the command line or through the web UI
  - Scale-to-zero deployment on Firestore & Cloud Run
  - Multi-user SSO enterprise deployment (with [Google Cloud IAP](https://cloud.google.com/security/products/iap))
- Observability with OpenTelemetry tracing
- Code Editing Agent:
  - Auto-detection of project initialization, compile, test and lint
  - Find the relevant files to edit
  - Code editing loop with compile, lint, test, fix (editing delegates to [Aider](https://aider.chat/))
    - Compile error analyser can search online, add additional files and packages
- Software Engineer Agent:
  - Find the appropriate repository from GitLab/GitHub
  - Clone and create branch
  - Call the Code Editing Agent
  - Create merge request
- Code Review agent:
  - Configurable code review guidelines

## UI Examples

[New Agent](#new-agent) | [Sample trace](#sample-trace) | [Human in the loop notification](#human-in-the-loop-notification) | [Resume error](#resume-error)


### New Agent

![New Agent UI](https://public.trafficguard.ai/nous/start.png)

### Sample trace

![Sample trace in Google Cloud](https://public.trafficguard.ai/nous/trace.png)

### Human in the loop notification

<img src="https://public.trafficguard.ai/nous/feedback.png" width="702">

### Resume error

![Resume error](https://public.trafficguard.ai/nous/error.png)

## Code Examples

### Nous vs LangChain

Nous doesn't use LangChain, for [many reasons](https://www.octomind.dev/blog/why-we-no-longer-use-langchain-for-building-our-ai-agents) that [you](https://www.google.com/search?q=langchain+site%3Anews.ycombinator.com) can [read online](https://www.google.com/search?q=langchain+sucks+site%3Areddit.com)

Let's compare the LangChain document example for Multiple Chains to the equivalent Nous implementation.

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

#### Nous
```typescript
import { initAgentContext, llms } from '#agent/context'
import { anthropicLLMs } from '#llms/anthropic'

initAgentContext(anthropicLLMs());

const prompt1 = (person: string) => `What is the city ${person} is from? Only respond with the name of the city.`;
const prompt2 = (city: string, language: string) => `What country is the city ${city} in? Respond in ${language}.`;

const city = await llms().easy.generateText(prompt1('Obama'));
const result = await llms().easy.generateText(prompt2(city, 'German'));

console.log(result);
```

The Nous code also has the advantage of static typing with the prompt arguments, enabling you to refactor with ease.
Using simple control flow allows easy debugging with breakpoints/logging.

### Automated LLM function definitions

LLM function calling definitions are automatically generated by having the `@func` decorator on class methods.

![New Agent UI](https://public.trafficguard.ai/nous/jira-function-def.png)

Visit our [documentation site](https://nous.trafficguard.ai/) for the getting started guide and more details.

## Contributing

We welcome contributions to the project through [issues](https://github.com/TrafficGuard/nous/issues), [pull requests](https://github.com/TrafficGuard/nous/pulls)  or [discussions](https://github.com/TrafficGuard/nous/discussions)

Contributed by [TrafficGuard](https://www.trafficguard.ai) - Revenue-driving ad fraud protection.




