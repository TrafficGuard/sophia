# Setup

## Prerequisites

- [pyenv](https://github.com/pyenv/pyenv) (Run `curl https://pyenv.run | bash`)
- [nvm](https://github.com/nvm-sh/nvm) (Run `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash`)
- [ripgrep](https://github.com/BurntSushi/ripgrep?tab=readme-ov-file#installation)
- [gcloud](https://cloud.google.com/sdk/docs/install)

## Installation
```bash
git clone https://github.com/TrafficGuard/sophia.git
cd sophia
source ./bin/configure
```
The configure script will:

- Ensure the python version in *.python-version* is installed and install [aider](https://aider.chat/).
- Ensure the node.js version in *.nvmrc* is installed and run `npm install`
- Initialise the environment variable file at *variables/local.env*
- Change to the `frontend` folder and run `npm install`

### Google Cloud setup (recommended)

When enabled Google Cloud is used for Firestore database persistence, the Gemini AI models, Anthropic Claude on Vertex, and tracing via OpenTelemetry.

A Dockerfile is also provided to deploy application in Cloud Run or on a VM with the container-optimised OS.

- Create a project in Google Cloud and install the [gcloud](https://cloud.google.com/sdk/docs/install) command line tool.
- In `variables/local.env` update the `GCLOUD_PROJECT` and `GCLOUD_REGION` variables.
- Run `./bin/gcp_setup` which will:
    - Enable the [AI platform](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com) and [Firestore](https://console.cloud.google.com/apis/library/firestore.googleapis.com) APIs
    - Create a default [Firestore database](https://console.cloud.google.com/firestore/databases) in native mode.
- Run `gcloud auth application-default login` which provide credentials for the Google Cloud SDKs. (If the webpage fails to load then ensure port the callback webpage opens with isn't in use)

To use Anthropic Claude through the Vertex API you will need to [enable the Claude models](https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-claude#grant-permissions) from the Model Garden. Make sure to click Accept on the final screen.

Model garden links - [3.5 Sonnet](https://console.cloud.google.com/vertex-ai/publishers/anthropic/model-garden/claude-3-5-sonnet?supportedpurview=project)
- [3.0 Haiku](https://console.cloud.google.com/vertex-ai/publishers/anthropic/model-garden/claude-3-haiku?supportedpurview=project)

As Claude is only available in [select regions](https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-claude#regions) there is an additional environment variable GCLOUD_CLAUDE_REGION in the sample local.env file which defaults to us-east5

### Non-Google Cloud setup

If you want to get running ASAP then in `variables/local.env` update the `DATABASE` variable to `memory`.

## Configuration quick start

The `variables/local.env` file contains the configuration when running Sophia locally.

If you have configured Google Cloud then update `TRACE_AGENT_ENABLED` to `true`.

By default, Sophia runs in `single_user` authentication mode. A user profile will be created the first time the application is run.
Update the `SINGLE_USER_EMAIL` variable with your email before running Sophia for the first time.

The LLM service API keys and integration configurations can be set in web UI, or alternatively in the `variables/local.env` file. Values in the user profile take preferences over the environment configuration values.

Quick links to create API keys:

LLMs
- [Anthropic](https://console.anthropic.com/settings/keys)
- [OpenAI](https://platform.openai.com/api-keys)
- [Groq](https://console.groq.com/keys)
- [Together.ai](https://api.together.ai/settings/api-keys)
- [Fireworks.ai](https://fireworks.ai/api-keys)
- [Deepseek](https://platform.deepseek.com/api_keys)

Integrations
- [Perplexity](https://www.perplexity.ai/settings/api)
- [Jira](https://id.atlassian.com/manage-profile/security/api-tokens)
- [GitLab](https://www.gitab.com/-/user_settings/personal_access_tokens)
- [GitHub](https://github.com/settings/tokens?type=beta)

For observability configuration (logging and tracing) see the [Observability page](observability.md).

## Running quick start

### CLI

In the *src/cli* folder are the file gen.ts, agent.ts, swe.ts, code.ts, research.ts, util.ts which are scripts that can be run with `npm run <script> <optional_prompt>`.

If a prompt isn't provided, then it will read the prompt from the file indicated. This gives the option of quick inputs and more prepared, structured inputs.

- `npm run gen` does a single text generation from an LLM, if no arguments reading the input from *src/cli/gen-in*
- `npm run agent` runs the autonomous agent, using the functions configured in src/cli/agent.ts, and if no arguments reading the input from *src/cli/agent-in*
- `npm run code` runs the Code Editing agent on the repository, if no arguments reading the input from *src/cli/code-in*
- `npm run swe` runs the Software engineer agent, which can find a remote repo to clone, edit and create a pull/merge request. If no arguments reading the input from *src/cli/swe-in*

Full details at [Running from the CLI](getting-started-cli.md)

### Local server & UI

In one terminal run
```bash
npm run start:local
```
In a second terminal run
```bash
cd frontend
npm run start:local
```
The UI will be available at [http://localhost:4200](http://localhost:4200)

Full details at [Running from the UI](getting-started-ui.md)

Documentation for deploying on Google Cloud will be provided soon.

### Tests

**Running tests**

Keep the Firestore emulator running in a separate shell or in the background
```bash
npm run emulators
```
```bash
npm run test
```


