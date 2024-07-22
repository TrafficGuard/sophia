[![nous logo](https://camo.githubusercontent.com/0fbdff71ec8fa3e828c786519a6385257151cac549f61c79bf7c64392822d3f2/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f62616e6e65722e706e67)](https://camo.githubusercontent.com/0fbdff71ec8fa3e828c786519a6385257151cac549f61c79bf7c64392822d3f2/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f62616e6e65722e706e67)

_The open-source TypeScript platform for autonomous AI agents and LLM based workflows_

_**Nous**_ (Greek: νοῦς) is a term from classical philosophy often associated with intellect or intelligence, represents the human mind's capacity to comprehend truth and reality.

Documentation site
------------------

[](#documentation-site)

[Home](https://nous.trafficguard.ai/) | [Setup](https://nous.trafficguard.ai/setup/) | [Observability](https://nous.trafficguard.ai/observability/) | [Function calling](https://nous.trafficguard.ai/functions/) | [Autonomous AI Agent](https://nous.trafficguard.ai/xml-agent/) | [AI Software Engineer](https://nous.trafficguard.ai/software-engineer/) | [AI Code reviews](https://nous.trafficguard.ai/code-review/) | [Tools/Integrations](https://nous.trafficguard.ai/integrations/) | [Roadmap](https://nous.trafficguard.ai/roadmap/)

* * *

[The Nous Story](#the-nous-story) | [Features](#features) | [UI Examples](#ui-examples) | [Code examples](#code-examples) | [Contributing](#contributing)

The Nous Story
--------------

[](#the-nous-story)

Nous started from a simple goal: to harness AI's potential to **enhance real-world productivity**, born in DevOps and Platform Engineering space. We envisioned a tool that could:

*   Automate standard and simple requests using natural language prompts.
*   Intelligently triage build failures, support requests and production incidents.
*   Review code for compliance with standards and best practices.
*   Assist with large/complex refactorings, and more.

At TrafficGuard we process billions of events a month for our global clients, [increasing their ad spend ROI](https://www.trafficguard.ai/case-studies?ref=gh) by protecting against bots and other forms of invalid traffic. Our SaaS on GCP comprises projects developed in TypeScript, Python, GoogleSQL, PHP and Terraform, deployed from GitLab.

With open source projects typically Python/GitHub focused, and the vendor AI tools being focused in their silos, we saw a need for TypeScript based tooling which can work across our entire tech stack, and understand the overall architecture.

Through its evolution we've designed nous as a flexible platform for the TypeScript community to expand and support the use cases and integrations of your choice.

Our design choice of Firestore for the initial database implementation, with Cloud Run, provides a scale-to-zero solution with zero-cost using the free tier. With the intention to support uses cases such as your own custom personal assistant, always available via mobile.

Features
--------

[](#features)

Key features include:

*   Advanced autonomous agents
    *   Reasoning/planning inspired from Google's [Self-Discover](https://arxiv.org/abs/2402.03620) paper
    *   Memory and function history for complex workflows
    *   Custom XML-based function calling agent on any sufficiently capable LLM
    *   Experimental code-generating function calling agent using Pyodide
*   LLM function specifications auto-generated from source code
*   Function callable integrations:
    *   Filesystem, Jira, Slack, Perplexity, Gitlab, GitHub and more
*   Supports multiple LLMs/Services:
    *   OpenAI, Anthropic (native & Vertex), Gemini, Groq, Fireworks, Together.ai, DeepSeek, Ollama
*   CLI and Web interface
*   Human-in-the-loop for:
    *   Budget control
    *   Agent initiated questions
    *   Error handling
*   Flexible deployment options:
    *   Run locally from the command line or through the web UI
    *   Scale-to-zero deployment on Firestore & Cloud Run
    *   Multi-user SSO enterprise deployment (with [Google Cloud IAP](https://cloud.google.com/security/products/iap))
*   Observability with OpenTelemetry tracing
*   Code Editing Agent:
    *   Auto-detection of project initialization, compile, test and lint
    *   Find the relevant files to edit
    *   Code editing loop with compile, lint, test, fix (editing delegates to [Aider](https://aider.chat/))
        *   Compile error analyser can search online, add additional files and packages
*   Software Engineer Agent:
    *   Find the appropriate repository from GitLab/GitHub
    *   Clone and create branch
    *   Call the Code Editing Agent
    *   Create merge request
*   Code Review agent:
    *   Configurable code review guidelines
    *   Posts comments on GitLab merge requests

UI Examples
-----------

[](#ui-examples)

[New Agent](#new-agent) | [Sample trace](#sample-trace) | [Human in the loop notification](#human-in-the-loop-notification) | [Resume error](#resume-error) | [List agents](#list-agents)

### New Agent

[](#new-agent)

[![New Agent UI](https://camo.githubusercontent.com/06d4cd7aef92f54b152ced98f2c6d1864e31386d351a85ff2f0529df7b7d14d5/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f73746172742e706e67)](https://camo.githubusercontent.com/06d4cd7aef92f54b152ced98f2c6d1864e31386d351a85ff2f0529df7b7d14d5/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f73746172742e706e67)

### Sample trace

[](#sample-trace)

[![Sample trace in Google Cloud](https://camo.githubusercontent.com/96ced6ef2b41da01949271677cca2a8085139b8bcc9e72daf90e18fa5ea934e5/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f74726163652e706e67)](https://camo.githubusercontent.com/96ced6ef2b41da01949271677cca2a8085139b8bcc9e72daf90e18fa5ea934e5/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f74726163652e706e67)

### Human in the loop notification

[](#human-in-the-loop-notification)

[![](https://camo.githubusercontent.com/2336e279838542cb1d0931a5708bfa0987bc0ceffaa3d00b22dd0a6027bfb453/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f666565646261636b2e706e67)](https://camo.githubusercontent.com/2336e279838542cb1d0931a5708bfa0987bc0ceffaa3d00b22dd0a6027bfb453/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f666565646261636b2e706e67)

### Resume error

[](#resume-error)

[![Resume error](https://camo.githubusercontent.com/98c82aa2d81591deedda5383ca36eb072ed6065fb6b14257a1fc1f5fc58e61ad/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f6572726f722e706e67)](https://camo.githubusercontent.com/98c82aa2d81591deedda5383ca36eb072ed6065fb6b14257a1fc1f5fc58e61ad/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f6572726f722e706e67)

### List agents

[](#list-agents)

[![List agents](https://camo.githubusercontent.com/953c4b7e00c2074e0548f9edb5d5e544f0eafda354756d3080f655e0bce1d405/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f6c6973742e706e67)](https://camo.githubusercontent.com/953c4b7e00c2074e0548f9edb5d5e544f0eafda354756d3080f655e0bce1d405/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f6c6973742e706e67)

Code Examples
-------------

[](#code-examples)

### Nous vs LangChain

[](#nous-vs-langchain)

Nous doesn't use LangChain, for [many reasons](https://www.octomind.dev/blog/why-we-no-longer-use-langchain-for-building-our-ai-agents) that [you](https://www.google.com/search?q=langchain+site%3Anews.ycombinator.com) can [read online](https://www.google.com/search?q=langchain+sucks+site%3Areddit.com)

Let's compare the LangChain document example for Multiple Chains to the equivalent Nous implementation.

#### LangChain

[](#langchain)

import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output\_parsers";
import { ChatAnthropic } from "@langchain/anthropic";

const prompt1 \= PromptTemplate.fromTemplate(
  \`What is the city {person} is from? Only respond with the name of the city.\`
);
const prompt2 \= PromptTemplate.fromTemplate(
  \`What country is the city {city} in? Respond in {language}.\`
);

const model \= new ChatAnthropic({});

const chain \= prompt1.pipe(model).pipe(new StringOutputParser());

const combinedChain \= RunnableSequence.from(\[
  {
    city: chain,
    language: (input) \=> input.language,
  },
  prompt2,
  model,
  new StringOutputParser(),
\]);

const result \= await combinedChain.invoke({
  person: "Obama",
  language: "German",
});

console.log(result);

#### Nous

[](#nous)

import { initAgentContext, llms } from '#agent/context'
import { anthropicLLMs } from '#llms/anthropic'

initAgentContext(anthropicLLMs());

const prompt1 \= (person: string) \=> \`What is the city ${person} is from? Only respond with the name of the city.\`;
const prompt2 \= (city: string, language: string) \=> \`What country is the city ${city} in? Respond in ${language}.\`;

const city \= await llms().easy.generateText(prompt1('Obama'));
const result \= await llms().easy.generateText(prompt2(city, 'German'));

console.log(result);

The Nous code also has the advantage of static typing with the prompt arguments, enabling you to refactor with ease. Using simple control flow allows easy debugging with breakpoints/logging.

### Automated LLM function specifications

[](#automated-llm-function-specifications)

LLM function calling specifications are automatically generated by having the `@func` decorator on class methods.

[![New Agent UI](https://camo.githubusercontent.com/e5a16b7a0b20a6acbfb7bd296ed85574d2e83f2311d0ac8ad43dd5d7f0996df6/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f6a6972612d66756e6374696f6e2d6465662e706e67)](https://camo.githubusercontent.com/e5a16b7a0b20a6acbfb7bd296ed85574d2e83f2311d0ac8ad43dd5d7f0996df6/68747470733a2f2f7075626c69632e7472616666696367756172642e61692f6e6f75732f6a6972612d66756e6374696f6e2d6465662e706e67)

### Getting Started

[](#getting-started)

Visit our [documentation site](https://nous.trafficguard.ai/setup/) for the getting started guide and more details.

Contributing
------------

[](#contributing)

We welcome contributions to the project through [issues](https://github.com/TrafficGuard/nous/issues), [pull requests](https://github.com/TrafficGuard/nous/pulls) or [discussions](https://github.com/TrafficGuard/nous/discussions)

Contributed by [TrafficGuard](https://www.trafficguard.ai/) - Increasing the ROI on your ad spend.