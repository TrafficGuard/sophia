# Setup

## Prerequisites

- [pyenv](https://github.com/pyenv/pyenv) (Run `curl https://pyenv.run | bash`)
- [nvm](https://github.com/nvm-sh/nvm) (Run `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash`)
- [ripgrep](https://github.com/BurntSushi/ripgrep?tab=readme-ov-file#installation)
- [gcloud](https://cloud.google.com/sdk/docs/install) (optional)

## Installation
```bash
git clone https://github.com/TrafficGuard/nous.git
cd nous
source ./bin/configure
cd frontend
npm install
```
The configure script will:

- Ensure the python version in *.python-version* is installed and install [aider](https://aider.chat/).
- Ensure the node.js version in *.nvmrc* is installed and run `npm install`
- Initialise the environment variable file at *variables/local.env*

### Google Cloud setup (optional/recommended)

When enabled Google Cloud is used for Firestore database persistence, the Gemini AI models, Anthropic Claude on Vertex, and tracing via OpenTelemetry.

A Dockerfile is also provided to deploy application in Cloud Run or on a VM with the container-optimised OS.

In the file `variables/local.env` update the `GCLOUD_PROJECT` and `GCLOUD_REGION` variables.

If you have [gcloud](https://cloud.google.com/sdk/docs/install) installed then run `./bin/gcp_setup` which will:

- Enable the [AI platform](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com) and [Firestore](https://console.cloud.google.com/apis/library/firestore.googleapis.com) APIs
- Create a default [Firestore database](https://console.cloud.google.com/firestore/databases) in native mode.

Run `gcloud auth application-default login` which will provide credentials for the Google Cloud SDKs. (If the webpage fails to load then ensure port the callback webpage opens with isn't already in use)

To use Anthropic Claude through the Vertex API you will need to first [enable the Claude models](https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-claude#grant-permissions) from the Model Garden. Make sure to click Accept on the final screen.

Model garden links - [3.5 Sonnet](https://console.cloud.google.com/vertex-ai/publishers/anthropic/model-garden/claude-3-5-sonnet?supportedpurview=project)
[3.0 Haiku](https://console.cloud.google.com/vertex-ai/publishers/anthropic/model-garden/claude-3-haiku?supportedpurview=project)

As Claude is only available in [select regions](https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-claude#regions) there is an additional environment variable GCLOUD_CLAUDE_REGION in the sample .env file which default to us-east5

## Configuration

*variables/local.env* contains the configuration when running Nous locally.

Update the SINGLE_USER_EMAIL variable with your email.

If you have configured Google Cloud then update `TRACE_AGENT_ENABLED` to `true`.

The LLM API keys and integration configurations can be set in the environment variables, which provides defaults for any user the app. By default Nous runs in a single user mode.

Alternately you can run the application and enter the LLM/integration configuration values in the UI.

Quick links to create API keys:

LLMs
- [Anthropic](https://console.anthropic.com/settings/keys)
- [OpenAI](https://platform.openai.com/api-keys)
- [Groq](https://console.groq.com/keys)
- [Together.ai](https://api.together.ai/settings/api-keys)
- [Fireworks.ai](https://fireworks.ai/api-keys)

Function callable integrations
- [Perplexity](https://www.perplexity.ai/settings/api)
- [Jira](https://id.atlassian.com/manage-profile/security/api-tokens)
- [GitLab.com](https://www.gitab.com/-/user_settings/personal_access_tokens) (Grant api, read_repo and write_repo roles)
- [GitHub](https://github.com/settings/tokens?type=beta)

## Running

### CLI

In the *src/cli* folder are the file chat.ts, agent.ts, swe.ts, code.ts, research.ts, util.ts which are scripts that can be run with `npm run <script>`

- `npm run chat` does a single text generation from an LLM, reading the input from *src/cli/chat-in*
- `npm run agent` runs the autonomous agent, using the functions configured, reading the input from *src/cli/agent-in*
- `npm run code` runs the Code Editing agent on the repository, reading the input from *src/cli/code-in*
- `npm run swe` runs the software engineer agent, which can find a remote repo to clone, edit and create a pull/merge request. Input read from *src/cli/swe-in*
- `npm run research` runs the autonomous agent with the web research functions configured.
- `npm run util` used for running any random piece of code to test.

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

Documentation for running deployed on Google Cloud will be provided soon.

### Tests

**Unit tests**

`npm run test:unit`

**Integration tests**
```
gcloud emulators firestore start --host-port=127.0.0.1:8243
npm run test:integration
```
