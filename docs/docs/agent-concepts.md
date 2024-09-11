# Agent concepts

## Agent types

### 1. Autonomous agents

Sophia comes with two fully autonomous agents (XML and Python/dynamic), which applying reasoning to break down
a user request into a plan to be completed by the available function calls.

### 2. Workflow agents

Workflow agents typically have the majority of the high level control flow logic in code, and the results of the LLM calls
may influence the conditional control flow through the workflow.  This includes the Software Developer/Code Editing agents.

An autonomous agent may start a workflow agent via a function call, and a workflow may start an autonomous agent.

## Agent context

The code makes use of `AsyncLocalStorage`, which is similar to `ThreadLocal` in Java and `threading.local()` in Python,
to provide easy lookup of agent state, current user, tool configuration, default LLMs.

This does require the agent code to run within a context 
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

The agent has three LLMs configured for easy, medium and hard tasks, so its simple to evaluate different LLMs at a particular level of capability.

This was partly inspired when Claude 3 was released, having the Haiku, Sonnet and Claude models.