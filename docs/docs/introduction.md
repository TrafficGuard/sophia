<p style="align-content: center">
  <!--<img src="https://public.trafficguard.ai/nous/banner.png" height="300" alt="noos logo"/>-->
  <b style="font-size: xx-large">nous.ai</b><br/>
  <em>🤖 An open-source platform for LLM based workflows and autonomous AI agents, in TypeScript 🤖</em>
</p>
<em><b>Nous</b></em> (Greek: νοῦς) is a term from classical philosophy often associated with intellect or intelligence, represents the human mind's capacity to comprehend truth and reality.

## Our Vision

Nous was born from a simple yet ambitious goal: to harness AI's potential to **enhance real-world productivity**, initially in DevOps and Platform Engineering space. We envisioned a tool that could:

- Automate standard requests using natural language prompts (e.g., new project setups, database schema updates)
- Intelligently triage build failures, support requests and production incidents
- Review code for compliance with standards and best practices
- Assist with large/complex refactorings

Through its evolution we designed it as a flexible platform for the TypeScript community to expand and support the use cases and integrations of your choice.

## Features

Some of the key features include:

- Advanced autonomous agent
    - Reasoning/planning inspired from Google's [Self-Discover](https://arxiv.org/abs/2402.03620) paper
    - Custom XML-based function calling on any sufficiently capable LLM
    - Memory and function history for complex workflows
- LLM function definitions auto-generated from source code.
- Function callable integrations
    - Filesystem, Jira, Slack, Perplexity, Gitlab and more.
- Supports multiple LLMs/Services
    - OpenAI GPT, Anthropic Claude (native and Vertex), Gemini, Groq, Fireworks, Together.ai, DeepSeek
- Web interface
- Human-in-the-loop for:
    - Budget control
    - Agent initiated questions
    - Error handling
- Flexible deployment options
    - Run locally from the command line or through the web UI
    - Scale-to-zero deployment on Firestore & Cloud Run, enabling a low-cost personal assistant always available via mobile
    - Multi-user SSO enterprise deployment ([Google Cloud IAP](https://cloud.google.com/security/products/iap))
- Observability with OpenTelemetry tracing
- Software Engineer Agent
    - Select the appropriate repository, clone, create branch
    - Auto-detection of project initialization, compile, test and lint
    - -> Code Editing Agent
        - Selects files to edit
        - Code editing with compile, lint, test, fix loop (delegates to [Aider](https://aider.chat/)) with search and actions to fix compile issues.
    - Create merge request
- Code Review agent
    - Configurable code review guidelines

## UI Examples

### New Agent

![New Agent UI](https://public.trafficguard.ai/nous/start.png){ align=left }

### Sample trace

![Sample trace in Google Cloud](https://public.trafficguard.ai/nous/trace.png){ align=left }

### Human in the loop example

![Human in the loop example](https://public.trafficguard.ai/nous/feedback.png){ align=left }

## Contributing 

If you would like to contribute to the codebase, [issues](https://github.com/TrafficGuard/nous/issues) or [pull requests](https://github.com/TrafficGuard/nous/pulls) are always welcome!

