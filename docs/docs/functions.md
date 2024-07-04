# Function calling

Following the design philosophy of using language features where possible and avoiding unnecessary framework abstractions,
nous provides a simple mechanism for defining functions.

Nous avoids the duplicate work of creating a function definition separate from the code implementation. The *ts-morph* package is used
to parse the source code at build-time/runtime to generate the definitions.

## Defining functions
The following is an example of a class which exposes class methods as callable functions by the LLM agents.

```typescript
import { func, funcClass } from '#functionDefinition/functions';

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

The `@funcClass(__filename)` annotation must be on the class so ts-morph can find the source file, and to register the functions.

The `@func()` annotation must be on each class method to expose it as a function to the agents.

The generated definitions will be under the folder `.nous/functions`  in json and in the xml format used by the autonomous agent.

The definition generation code could be extended to output in the native function calling format for OpenAI, Anthropic, Gemini etc.

If the definition files don't exist at runtime then they will automatically be generated. To improve startup time
the definition files are only re-built if the source file modified date is newer. Also, the definition files can be generated
at build time with the `npm run functions`.

The `@func` annotation also adds OpenTelemetry tracing to the function call.

### Function arguments

Function arguments must simple types or serializable to JSON. If an argument is an array type the runtime will convert a string that is a JSON array to an array object, otherwise it will split it by the newline character.

## Agent functions

Currently functions can only be made available as a group of all the functions defined in a class.
This is done by creating a FunctionSet with the applicable function class references.

```typescript
const config: RunAgentConfig = {
    agentName: 'ABC-123 discovery',
    llms: GPT(),
    functions: new FunctionSet(GitLab, Jira),
    initialPrompt: "What project in GitLab has the code to complete Jira ABC-123?",
};
// runAgent()
```
Each iteration of the autonomous agent control loop updates the system prompt with the available functions,
so its possibly to dynamically change which functions are available in a long-running agent.


## Application registration

To ensure the all functions have been registered when the application is running, add the function class to the array in `functionRegistry.ts`.
This is required by the web interface for the function selection list to be complete and for the `npm run functions` command to pre-build all the definitions.

## Cache/Retry
