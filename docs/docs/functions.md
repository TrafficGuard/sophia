# LLM Function schemas

Sophia provides an automated way to create LLM function schemas, avoiding the duplicate work of creating a function schema separate from the code implementation. 

The *ts-morph* package is used to parse the source code at build-time/runtime to generate the schemas.

## Defining functions

The following is an example of a class which exposes class methods as callable functions to the LLM agents.

```typescript
import { func, funcClass } from '#functionSchema/functions';

@funcClass(__filename)
export class Jira {
    instance: AxiosInstance;

    constructor() {
        // Initialise axios instance...
    }

    /**
     * Gets the description of a JIRA issue
     * @param {string} issueId the issue id (e.g XYZ-123)
     * @returns {Promise<string>} the issue description
     */
    @func()
    async getJiraDescription(issueId: string): Promise<string> {
        const response = await this.instance.get(`issue/${issueId}`);
        return response.data.fields.description;
    }
}
```

The `@funcClass(__filename)` annotation must be on the class so ts-morph can find the source file, generate the function schema and register it.

The `@func()` annotation must be on each class method to be exposed as a LLM callable function.

If the schema files don't exist at runtime then they will automatically be generated. To improve startup time
the schema files are cached under the folder `.sophia/functions` and only re-built if the source file modified date is newer.

The schema files can be generated at build time with the `npm run functionSchemas` script.

Function calling agents can transform the object implementing the [FunctionSchema](https://github.com/TrafficGuard/sophia/blob/main/src/functionSchema/functions.ts#L13)
interface into the format required, e.g. the custom XML format, or (not yet implemented) native function calling types for OpenAI, Anthropic, Gemini etc.

The `@func` annotation also adds OpenTelemetry tracing to the function call.

### Function arguments

Function arguments must simple types or serializable to JSON. 

For array type arguments the runtime will convert a string that is a JSON array to an array object, otherwise it will split it by the newline character.

## Agent functions

Currently, functions can only be made available as a group of all the functions defined in a class.

```typescript
import { GitLab } from '#functions/gitlab'
import { Jira } from '#functions/jira'

await runAgent({
    agentName: 'ABC-123 discovery',
    llms: GPT(),
    functions: [GitLab, Jira],
    initialPrompt: "What project in GitLab has the code to complete Jira ABC-123?",
})
```

Each iteration of the autonomous agent control loop updates the system prompt with the available functions,
so its possibly to dynamically change which functions are available in a long-running agent.

## Application registration

To ensure the all functions have been registered when the application is running, add the function class to the array in `functionRegistry.ts`.
This is required by the web interface for the function selection list to be complete and for the `npm run functionsSchemas` command to pre-build all the schema.

See the [Tools/Integrations](integrations.md) page for information on the provided function callable integrations.
