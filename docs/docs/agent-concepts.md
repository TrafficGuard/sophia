# Agent concepts

## Agent categories

### 1. Autonomous agents

Sophia comes with two autonomous agent types (XML and CodeGen), which applying reasoning to break down
a user request into a plan to be completed by the available function calls.

The Slack chatbot uses an autonomous agent to provide a response to a user.

Function calls may be to API integrations or create sub-agents.

### 2. Workflow agents

Workflow agents have the control flow logic defined in code, and the results of the LLM calls
may determine the conditional control flow through the workflow.  This includes the Software Developer/Code Editing agents.

## Agent context

The codebase makes use of `AsyncLocalStorage`, which is similar to `ThreadLocal` in Java and `threading.local()` in Python,
to provide easy lookup of agent state, current user, tool configuration, and default LLMs.

This requires the agent code to run within a AsyncLocalStorage context.
```typescript
export const agentContextStorage = new AsyncLocalStorage<AgentContext>();

/**
 * Runs a workflow with an agentContext. This also persists the agent so its actions can be reviewed and resumed in the UI
 * @param runConfig
 * @param workflow
 * @returns the agentId
 */
export async function runAgentWorkflow(runConfig: RunAgentConfig, workflow: (agent: AgentContext) => any): Promise<string> {
    let agent: AgentContext = createContext(runConfig);
    // Run the workflow with the agent context bound to the AsyncLocalStorage store
    return agentContextStorage.run(agent, async () => {
        try {
            // Run with an active OpenTelemetry span
            await withActiveSpan(config.agentName, async (span: Span) => {
                // Now run the workflow
                await workflow(agent);
            });
            // load the completed agent
            agent = agentContext();
            agent.state = 'completed';
        } catch (e) {
            agent = agentContext();
            agent.state = 'error';
            agent.error = errorToString(e);
        } finally {
            await appContext().agentStateService.save(agent);
        }
        return agent.agentId;
    });
}
```

The agent has three LLMs configured for easy, medium and hard tasks, so it's simple to evaluate different LLMs at a particular level of capability.

This was partly inspired when Claude 3 was released, having the Haiku, Sonnet and Claude models.
