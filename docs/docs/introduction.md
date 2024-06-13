<p style="align-content: center">
  <!--<img src="https://public.trafficguard.ai/nous/banner.png" height="300" alt="noos logo"/>-->
  <b style="font-size: xx-large">nous.ai</b><br/>
  <em>🤖 An open-source platform for LLM based workflows and autonomous AI agents, in TypeScript 🤖</em>
</p>
<em><b>Nous</b></em>, or Greek νοῦς, sometimes equated to intellect or intelligence, is a concept from classical philosophy for the faculty of the human mind necessary for understanding what is true or real.

In a nutshell <em><b>nous</b></em> is a free, flexible, integrated platform for Node.js/TypeScript agentic and LLM-based applications.

The background for Nous was experimenting with what AI could achieve, or assist with, from a DevOps/Platform engineering perspective.
For example handling standard requests (new projects, database schema updates etc), triaging build failures, reviewing code for standards etc.

Through its evolution we designed it as a flexible platform that can be expanded to support the integrations of your choice.

Some of the key features include:

- Advanced autonomous agent
    - Reasoning/planning inspired from Google's [Self-Discover](https://arxiv.org/abs/2402.03620) paper
    - Custom XML-based function calling on any sufficiently capable LLM
    - Memory and function history for complex workflows
- Agent/LLM function definitions auto-generated from source code.
- Human-in-the-loop for:
    - Budget control
    - Agent initiated questions
    - Error handling
- Web interface
- Flexible deployment options
    - Run locally from the command line or through the web UI
    - Scale-to-zero deployment on Firestore & Cloud Run for a low-cost personal assistant always available via mobile
    - Multi-user SSO enterprise deployment ([Google Cloud IAP](https://cloud.google.com/security/products/iap))
- Observability with OpenTelemetry tracing
- Software Engineer Agent
    - Select the appropriate repository, clone, create branch
    - Auto-detection of project initialization, compile, test and lint
    - -> Code Editing Agent
        - Selects files to edit
        - Code editing with compile, lint, test, fix loop (delegates to [Aider](https://aider.chat/))
    - Create merge request
- Code Review agent
    - Configurable code review guidelines
- Supports multiple LLMs/Services
    - GPT, Gemini, Groq, Claude (Anthropic and Vertex), Fireworks, Together.ai
- Function callable tools
    - Filesystem, Jira, Slack, Perplexity, Gitlab


## New Agent

![New Agent UI](https://public.trafficguard.ai/nous/start.png){ align=left }

## Sample trace

![Sample trace in Google Cloud](https://public.trafficguard.ai/nous/trace.png){ align=left }

## Human in the loop example

![Human in the loop example](https://public.trafficguard.ai/nous/feedback.png){ align=left }

## Contributing 

If you would like to contribute to the codebase, [issues](https://github.com/TrafficGuard/nous/issues) or [pull requests](https://github.com/TrafficGuard/nous/pulls) are always welcome!

