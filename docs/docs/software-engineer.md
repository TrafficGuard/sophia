# AI Software Engineer

The Software Engineer Agent is designed to automate tasks in environments with multiple repositories, making it suitable for enterprise environments. 


Nous comes with a Software Engineer agent which has a workflow of:

- Search projects in your SCM (source code management) tool (GitLab, GitHub) for the relevant project
- Clone the project and create a branch.
- Detect how to compile, test and lint the project.
- Select the relevant files to edit.
- Run a edit/compile/lint/test cycle
    - Calls Aider to edit the files.
    - Run compile, format, lint, test targets auto-detected from project configuration.
    - Fix (attempt to!) compile, lint and test errors.
        - Online research to assist with fixing compile errors.
        - Able to install missing packages.
- Push to SCM and raise a merge/pull request.

## Flexibility and Extensibility

The AI Software Engineer Agent is designed with modularity and adaptability in mind:

- The high-level workflow is abstracted through a SourceCodeManagement interface, allowing for easy integration with various SCM systems.
- The Code Editing workflow is encapsulated as a separate agent, enabling its use in standalone local repository editing scenarios or integration into alternative Software Engineer agents with custom workflows.
- Language specific tooling for code search/retrieval augmented generation and safe operations.
- The platform agent's architecture supports easy extension to accommodate new tools, languages, and development paradigms.





## AI-editing friendly code

There are some suggestions to follow to writing code that is amendable to AI editing.

TypeScript 5.5 introduced a new compile option called [Isolated Declarations](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/#isolated-declarations)
