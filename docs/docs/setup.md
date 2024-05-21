# Setup

Run `source ./bin/configure`

This will:
- Set up a Python virtual environment and install aider,
which is used for code editing.
- Set the node version using nvm, and run `npm install`
- Install ripgrep

### API KEYS

You will need an OpenAI key with some credits to use the CodeEditor function, unless [OpenRouter](https://aider.chat/docs/faq.html#accessing-other-llms-with-openrouter]) is configured for an alternative LLM.

You will want to have use of Claude 3 Opus for the main agent control loop, so signup at Anthropic and get free US$5 credits.

### Anthropic
Create an API key at https://console.anthropic.com/settings/keys and update ANTHROPIC_API_KEY in `.env`. 
You should get US$5 credits on signup.

### OpenAI

Create an API key at https://platform.openai.com/api-keys and update OPENAI_API_KEY in `.env`.

### Jira

Create an API key at https://id.atlassian.com/manage-profile/security/api-tokens and update JIRA_API_TOKEN in `.env`

### GitLab

Create an API key at https://gitlab.synrgy.mobi/-/user_settings/personal_access_tokens with the api, read_repo and write_repo roles, and update GITLAB_TOKEN in `.env`. You will need to also set GITLAB_HOST (e.g. gitlab.selfhost.com) and GITLAB_GROUPS (JSON array containing the top level groups it will search e.g ["group1", "group2"])

### GitHub

(Optional) Create a personal token at https://github.com/settings/tokens?type=beta and update GITHUB_TOKEN in `.env`.

## GCP/Vertex

Ensure you have authenticated the application default credentials with gcloud (`gcloud auth application-default login`)

(Ensure you don't have anything running on port the callback webpage opens with)

## Google Cloud

If you are using the glcoud function or Vertex AI you should install the gcloud CLI

https://cloud.google.com/sdk/docs/install

Then authenticate the application default credentials by running
`gcloud auth application-default login`
