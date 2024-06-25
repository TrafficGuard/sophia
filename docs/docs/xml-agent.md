# Autonomous AI Agent

Nous provides an agent which can perform work autonomously by a control loop which plans and calls functions.

The system prompt instructs the LLM to break down the task into steps which can be completed by the functions, 
and then output a structured XML response. The XML part of the response is parsed to execute the function call to an integration/agent.

This custom prompt and parsing allows function calling on any sufficiently capable LLM. However, given the reasoning
capabilities required for optimal plan generation and function selection, the best results will be from using the 
most capable frontier models i.e. GPT-4o or Claude Opus.

A useful strategy is to first attempt to get your agent working with a less capable model, e.g. Claude Sonnet.
As you observe where the agent goes off-track you can tune your prompt and the documentation for the functions and their parameters.
Then for production use switch to a more capable model for more reliable results.

## Built-in functions

The autonomous agent always has two function available, `requestFeedback` and `completed`.

The `requestFeedback` function definition in the system prompt lets the LLM know it can request a decision or additional details.

If you definitely want to have input at a particular step, then in your prompt ask it to request feedback at that point.

## Human-in-the-loop

Having a human in the loop is essential for any agent to handle a few cases:

- **Budget control** - Multiple iterations of calls to frontier LLMs can quickly add up.
- **Guidance** - Keeping the AI on track after a few control loop iterations.
- **Agent initiated feedback** - Provide details/decisions asked for by the AI
- **Error handling** - Transient errors, configuration errors, balance exceeded errors and more can be fixed and then resume the agent. With some errors you may be able to give the agent guidance for a change in plan, or to search for a solution with Perplexity etc.
- **Verification** - Manually verify function calls that could result in data loss, unwanted modifications etc.

Currently, if the Slack function is available, a message will be sent when a human-in-the-loop event occurs.

![Agent feedback request](https://public.trafficguard.ai/nous/feedback.png){ align=left }
