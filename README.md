# AI bot


# Getting started

Run `source ./bin/configure`

This will:
- Set up a Python virtual environment and install aider,
which is used for code editing.
- Set the node version using nvm, and run `npm install`

- brew install gh

## API KEYS

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


# Notes

In the src folder are the ai.ts, agent.ts, edit-local.ts, research.ts, util.ts files.

These can be run with `npm run ai`, `npm run agent`, `npm run edit-local`, `npm run research`, `npm run util`

`ai`, `agent` and `edit-local` read their input from the /ai-in file. Util is for testing individual bits.

- `ai` does a single completion from the AI
- `agent` runs the autonomous agent loop, using all the tool provided
- `edit-local` runs the edit local repository (i.e this repository) workflow.
- `research` runs the agent loop with the web reseach tools configured 
- `util` if for running any random bit of code

edit-local is a good place to start to make changes to the codebase.

You can set the HIL_BUDGET or HIL_COUNT environment variables so the program
waits for you to press enter before continuing (Human In the Loop).

HIL_BUDGET must be a number, and is valued in $USD.

HIL_COUNT is how many iterations of the main control loop can run before requiring human input to continue.


# Design

The framework is designed to support autonomous agents, which can create and execute a plan using
the tools available.

A simple tool example is the utils.ts

```Typescript
@funcClass(__filename)
export class UtilFunctions {
    /**
     * Uses a large language model to make changes to the input content by applying the provided natural language instruction
     * @param text the input text
     * @param descriptionOfChanges a description of the changes to make to the text
     * @returns the modified text
     */
    @func
    async processText(text: string, descriptionOfChanges: string): Promise<string> {
        const prompt =
            `<input>${text}<input>\n` +
            `<action>\n${descriptionOfChanges}. Output the response inside <response></response> tags.\n</action>`;
        const response = await llms().medium.generateText(prompt);
        response.trim().slice('<response>'.length, '</response>'.length * -1);
        return text;
    }
}
```
The `@funcClass(__filename)` decorator is required so the ts-morph package can locate the source file, 
parse the JSDoc tags and dynamically generate the function definition.

The `@fun` decorator indicates this is a function to be made available for the LLMs when this class is included in the `Toolbox`.

Its important the arguments are simple for the LLMs to be able to call them, so we maintain the workflow state in a AsyncLocalStorage
which can be retrieved using
`import { getFileSystem, workflowContext } from './agent/workflows';`

The workflow context must always be initialised, which you'll see in the entrypoint files.


# @fun @cacheRetry

Function arguments must be serializable by JSON.toString()

# Prompt engineering

One of the key skills in AI engineering is learning how to write prompts which gets the result you want from the AI.

There are a number of techniques such at Chain-of-Thought, Self-discovery, which enable to AI to think through a task and produce a better result.

Get some inspiration from https://github.com/Pythagora-io/gpt-pilot/tree/main/pilot/prompts

A big part is making explicit what we do unconsciously. The LLMs are smart and dumb at the same time.

You need to guide them by providing the relevant information and prompts.

For example a prompt when the task is coding TypeScript might include

> Consider sub-types, union types, generics, type narrowing, utility types,
declaration merging, enums, type compatability, function parameter bivariance
Type Inference, Contextual Typing, Generics, Generic Constraints.

>  Code defensively. Assert all assumptions on function arguments.
When complex logic is performed, assert expectations of the result where reasonable.

This primes the AI to think about these things when writing the code.

# What to work on

See TODO.md


# AI tools

### AI coder

https://github.com/stitionai/devika
https://stition.ai/products

https://github.com/OpenDevin/OpenDevin

GPT Pilot
https://www.pythagora.ai/
https://github.com/Pythagora-io/gpt-pilot

### Agents

https://github.com/agi-merge/waggle-dance
https://zapier.com/blog/introducing-zapier-central-ai-bots/
https://github.com/OpenBMB/ChatDev

## AI coder posts
https://blog.pythagora.ai/2024/02/19/gpt-pilot-what-did-we-learn-in-6-months-of-working-on-a-codegen-pair-programmer/
https://docs.sweep.dev/blogs

### Code style
Because of caching, timing, tracing, we want methods to await on returned promises.
Sometimes this is configured in lint rules to not do this as it can be unnecessary, but in our case we often want to do.
```
return await llms().hard.generateText(prompt);
```
