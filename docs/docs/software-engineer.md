# AI Software Engineer

Nous comes with a Software Engineer agent which has a workflow of:

- Search projects in GitLab for the relevant project
- Clone the project and create a branch.
- Detect how to compile, test and lint the project.
- Select the relevant files to edit.
- Run a edit/compile/lint/test cycle
    - Calls Aider to edit the files.
    - Run compile, format, lint, test targets auto-detected from project configuration.
    - Fix (attempt to!) compile, lint and test errors.
        - Utilizes web research to help fix compile.
        - Is allowed to install missing packages.
- Push to GitLab and raise a merge request.

The workflow is not tied to GitLab as it uses the SourceCodeManagement interface. 
Once the GitHub implementation is complete it can be substituted by selecting 
the GitHub class instead of Gitlab when starting an agent.

The following two steps are encapsulated within a Code Editing agent for flexibility in using it directly when editing a local repository, or embedding in alternative software engineer agents with different workflows.
- Select files to edit.
- Run a edit/compile/lint/test cycle.
