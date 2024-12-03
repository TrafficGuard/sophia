# Setup

```bash
git clone https://github.com/TrafficGuard/sophia.git
# Copy the default configuration file
cd sophia/variables
cp local.env.example local.env
```

## Configuration quick start

### Base configuration

The `variables/local.env` file contains the configuration when running Sophia using the `npm run start:local` command.

By default, Sophia runs in `single_user` authentication mode. A user profile will be created the first time the application is run.
Update the `SINGLE_USER_EMAIL` variable with your email before running Sophia for the first time.

The LLM service API keys and integration configurations can be set on your profile in the web UI, or alternatively in the `variables/local.env` file. Values in the user profile take preferences over the environment configuration values.

Quick links to create API keys:

LLMs
- [Anthropic](https://console.anthropic.com/settings/keys)
- [OpenAI](https://platform.openai.com/api-keys)
- [Groq](https://console.groq.com/keys)
- [Together.ai](https://api.together.ai/settings/api-keys)
- [Fireworks.ai](https://fireworks.ai/api-keys)
- [Deepseek](https://platform.deepseek.com/api_keys)
- [DeepInfra](https://deepinfra.com/dash/api_keys)

Integrations
- [Perplexity](https://www.perplexity.ai/settings/api)
- [Jira](https://id.atlassian.com/manage-profile/security/api-tokens)
- [GitLab](https://www.gitab.com/-/user_settings/personal_access_tokens)
- [GitHub](https://github.com/settings/tokens?type=beta)


### Google Cloud configuration (recommended)

When enabled, Google Cloud is used for Firestore database persistence, the Gemini AI models, Anthropic Claude on Vertex, and tracing via OpenTelemetry.

A Dockerfile is also provided to deploy application in Cloud Run or on a VM with the container-optimised OS. (Terraform and scripts coming soon)

- Install the [gcloud](https://cloud.google.com/sdk/docs/install) command line tool.
- Create a project in Google Cloud
- In `variables/local.env` update the `GCLOUD_PROJECT` and `GCLOUD_REGION` variables.
- Run `./bin/gcp_setup` which will:
    - Enable the [AI platform](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com) and [Firestore](https://console.cloud.google.com/apis/library/firestore.googleapis.com) APIs
    - Create a default [Firestore database](https://console.cloud.google.com/firestore/databases) in native mode.
- Run `gcloud auth application-default login` which provide credentials for the Google Cloud SDKs. (If the webpage fails to load then ensure port the callback webpage opens with isn't in use)

To use Anthropic Claude through the Vertex API you will need to [enable the Claude models](https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-claude#grant-permissions) from the Model Garden. Make sure to click Accept on the final screen. The model garden links are:

- [3.5 Sonnet V2](https://console.cloud.google.com/vertex-ai/publishers/anthropic/model-garden/claude-3-5-sonnet-v2?supportedpurview=project)
- [3.5 Haiku](https://console.cloud.google.com/vertex-ai/publishers/anthropic/model-garden/claude-3-5-haiku?supportedpurview=project)

As Claude is only available in [select regions](https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-claude#regions) there is an additional environment variable GCLOUD_CLAUDE_REGION in the sample local.env file which defaults to us-east5

### Non-Google Cloud configuration

If you want to get running ASAP then:

- In `variables/local.env` update `DATABASE` to `memory` and update `TRACE_AGENT_ENABLED` to `false`
- In `docker-compose.yml` comment out the line `~/.config/gcloud:/home/sophia/.config/gcloud`

### Additional configuration

For further configuration options see the [Environment variables](environment-variables.md) and [Observability](observability.md) pages.


## Docker setup

`docker compose up --build` starts the development container running the server and web UI.

The docker compose file mounts everything excluding the node_module folders.  On subsequent restarts after code changes you can simply run `docker compose up`

## Run on host setup

Install:

- [pyenv](https://github.com/pyenv/pyenv) (Run `curl https://pyenv.run | bash`)
- [nvm](https://github.com/nvm-sh/nvm) (Run `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash`)
- [ripgrep](https://github.com/BurntSushi/ripgrep?tab=readme-ov-file#installation)
- [gcloud](https://cloud.google.com/sdk/docs/install)

From the Sophia repository root run `source ./bin/configure`

The configure script will:

- Ensure the python version in *.python-version* is installed and install [aider](https://aider.chat/).
- Ensure the node.js version in *.nvmrc* is installed and run `npm install`
- Initialise the environment variable file at *variables/local.env*
- Change to the `frontend` folder and run `npm install`

To run the server and web UI locally, in one terminal run
```bash
npm run start:local
```
In a second terminal run
```bash
cd frontend
npm run start:local
```
The UI will be available at [http://localhost:4200](http://localhost:4200)

<br/>

Next see the [CLI](cli.md) page for running the server and UI, and the various scripts available.



