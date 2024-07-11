# Prompt engineering

One of the key skills in AI engineering is learning how to write prompts which gets the result you want from the AI.

There are a number of techniques such at Chain-of-Thought, Self-discovery, which enable to AI to think through a task and produce a better result.

https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview
https://docs.cohere.com/docs/prompt-engineering-basics
https://mlflow.org/docs/latest/llms/prompt-engineering/index.html
https://whylabs.ai/learning-center/introduction-to-llms/llm-adaptation-methods-prompt-engineering-and-rags
https://platform.openai.com/docs/guides/prompt-engineering
https://developers.google.com/machine-learning/resources/prompt-eng
https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/introduction-prompt-design
https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/prompt-design-strategies
https://ai.google.dev/gemini-api/docs/prompting-strategies

Get some inspiration from https://github.com/Pythagora-io/gpt-pilot/tree/main/pilot/prompts

Making explicit in the prompts what we do unconsciously.



A prompt when the task is coding TypeScript might include

> Consider sub-types, union types, generics, type narrowing, utility types,
declaration merging, enums, type compatability, function parameter bivariance
Type Inference, Contextual Typing, Generics, Generic Constraints.
> 
>  Code defensively. Assert all assumptions on function arguments.
When complex logic is performed, assert expectations of the result where reasonable.

This primes the AI to think about these things when writing the code.



Try and get your prompts working on a less capable model. This will help highlight weaknesses in your prompt.

Then when you switch to a more capable model it should be even more robust.

