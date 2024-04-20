
# Agent

An agent is defined by its system prompt and available tools.
Other configuration is human in loop settings

# Tool definition best practices 

https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling#best-practices

https://docs.anthropic.com/claude/docs/tool-use#tool-use-best-practices-and-limitations


# Prompt Engineering

Try and get your prompts working on a less capable model. This will help highlight weaknesses in your prompt.

Then when you switch to a more capable model it should be even more robust.

https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/prompt-design-strategies


# Use explicit types

While your IDE has access to the implicit type information, the LLMs do not. 
Having explicit types helps the LLM better understand your code.
Secondly, it makes the RAG process easier when there are explicit types, as these types need to be imported. 
So the RAG process can look at all the imports in a file, and then include them in the context


# Create focused tools when working in a specific area

For example if you're building an angular application, then you can create a focused search tool.
e.g.
```TypeScript
/**
 * Searches the angular documentation and top angular blogs
 * @param {string} query The search query
 * @returns {Promise<string>} The combined search results
 */
@func
searchAngularDocs(query: string): Promise<string> {
    const query1 = `site:angular.io ${query}`;
    const query2 = `site:angularl.dev ${query}`;
    const query3 = `site:netbasal.com ${query}`;
    const query4 = `site:blog.angular-university.io ${query}`;
}
```
