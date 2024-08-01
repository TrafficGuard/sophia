# Autonomous AI Agents

Nous provides two autonomous agents which work to complete the request via a control loop which iteratively (re-)plans and calls the functions available to the agent.

At a high level they share the same internal state, agent memory, human-in-the loop, functional calling history etc. 

The key difference is:
- The XML agent returns the desired function call(s) in a custom XML format
- The dynamic agent returns Python code which calls the functions.

The dynamic agent has the advantage of being able to perform multiple function calls and perform validation logic,
which can significantly reduce the time and cost of running the agent depending on the tasks.

This custom prompt and parsing allows function calling on any sufficiently capable LLM. However, given the reasoning
capabilities required for optimal plan generation and function selection, the best results will be from using the 
most capable frontier models.
Currently, we prefer and recommend using Claude 3.5 Sonnet for the 'hard' LLM which is used by the autonomous agent control loop.

A second [agent](https://github.com/TrafficGuard/nous/blob/main/src/agent/pythonAgentRunner.ts) is available,
which prompts the agent to generate Python code to call the functions. Pyodide is used to execute the Python code in the Node.js runtime.
This has the advantage of being able to invoke multiple function calls in one iteration of the control loop, reducing costs and latency.

### AgentContext



## Built-in functions

The autonomous agent always has four function available:
- `Agent.requestFeedback`
- `Agent.completed`
- `Agent.saveMemory`
- `Agent.deleteMemory`

The `requestFeedback` function in the system prompt lets the LLM know it can request a decision or additional details.

If you would like to have input at a particular step, then in your prompt ask the model to request feedback at that point.

## Human-in-the-loop

Having a human in the loop is essential for any agent to handle a few cases:

- **Budget control** - Multiple iterations of calls to frontier LLMs can quickly add up.
- **Guidance** - Keeping the AI on track after a few control loop iterations.
- **Agent initiated feedback** - Provide details/decisions asked for by the AI
- **Error handling** - Transient errors, configuration errors, balance exceeded errors and more can be fixed and then resume the agent. With some errors you may be able to give the agent guidance for a change in plan, or to search for a solution with Perplexity etc.
- **Verification** - Manually verify function calls that could result in data loss, unwanted modifications etc.

Currently, if the Slack function is available, a message will be sent when a human-in-the-loop event occurs.

![Agent feedback request](https://public.trafficguard.ai/nous/feedback.png){ align=left }
