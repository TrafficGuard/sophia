## package.json scripts

There are a number of convenience scripts in the package.json for running agents, where the entrypoint file matches `/src/cli/<script-name>.ts`

### agent

`npm run agent` will run the autonomous agent configured in `src/cli/agent.ts`

If no arguments are supplied the user prompt will be read from `src/cli/agent-in`

Alternatively you can provide the prompt with additional arguments. It's not necessary to quote the prompt unless it has special characters that the shell would interpret.

For example, you could run:
```bash
npm run agent research the latest news about large language models and write a report to the file ai-news.md
```

### code

`npm run code` runs the CodeEditingAgent configured in `src/cli/code.ts`

Without arguments the prompt is read from `src/cli/code-in` otherwise it uses the provided arguments for the prompt.

This is a useful for editing the sophia codebase. You could run a command like:

```bash
npm run code In the anthropic vertex class update the pricing for claude 3.5 sonnet to be 3 dollars per million input tokens and 15 dollars per million output tokens
```

When editing other local repositories you will need to provide the initial arg `-fs=<path>` to set the agent's virtual filesystem working 
directory to the repository you want to edit.

### swe

`npm run swe` runs the SoftwareDeveloperAgent configured in `src/cli/swe.ts`

Without arguments the prompt is read from `src/cli/swe-in` otherwise it uses the provided arguments for the prompt.

The agent is used for editing a remote repository which it will clone, branch and push a merge/pull request.

This agent can be used for process automation and handling requests within the limits of the CodeEditingAgent capabilities in a multi-repo environment.

### gen

`npm run gen` runs the script at `src/cli/gen.ts`

This simply generates text from a prompt. As with the other scripts you can provide arguments for a quick prompt. 
Otherwise, prepare the prompt in `src/cli/gen-in` and don't provide any other arguments.

The output is written to `src/cli/gen-in` and the console

### gaia

`npm run gaia <task_id>` runs an agent which completes a task from the [GAIA agent benchmark suite](https://huggingface.co/datasets/gaia-benchmark/GAIA) and
completes with the answer in the required format, read and appending from the files defined by the `tasksFile` and `resultsFile` consts in `gaia.ts`.

Without the task_id argument it will attempt to complete all questions in the dataset.

You will first need to download the dataset and convert it to the format required (more detailed steps soon...)

It is extremely important you don't commit and push to a public repository the test/validation dataset.
Make sure the directory you save the files to is in the .gitignore.

### scrape

`npm run scrape <url>` runs the PublicWeb.getWebPage function which uses a headless browser to scrape a web page, and then converts
it to a slim format by using the `@mozilla/readability` module to first extract the main contents of the page, and then the `turndown`
package to convert the HTML to Markdown, further reducing the token count.

By default, it writes the output to `scrape.md`. Alternatively you can provide an argument for the file to write to.

## CLI usage optimizations

### Speech-to-text

Speech-to-text is useful writing longer prompts with additional details to guide the agents.

On Mac's you can enable Dictation for quick-access speech-to-text
![List agents](https://public.trafficguard.ai/nous/dictation.png)

### Helper scripts

If you get tired of writing `npm run` all the time, copy this script to a file named `n` on your PATH
then you can simply run `n agent list the files in the current directory`

```bash
#!/bin/bash

# Shortcut to running `npm run <script> <arg>`
# Usage: `n <script> <args>`qq

# Check if at least one argument is passed
if [ $# -lt 1 ]; then
  echo "Usage: r <script> [args]"
  exit 1
fi

# Capture the first argument as the npm script
script=$1
shift # Shift the arguments so $@ contains the remaining args

# Run the npm script with any additional arguments
npm run "$script" "$@"
```
