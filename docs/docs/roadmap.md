# Roadmap

Some of the items to implement next:

Online demo

GitHub support

Add attachments to chat.

More authentication options with https://github.com/nextauthjs/next-auth/pull/9587

Additional agents:

- Slack chatbot agent
- Complete SWE-bench agent
- Add tools for GAIA agent
- CI/CD failure investigation agent

Improvements to the autonomous and code editing agents (a whole roadmap in itself)
- Include .cursorrules and CONVENTIONS.md files automatically

Real-time human-in-the-loop which doesn't stop the agent control loop.

Browser push notifications

Additional tools:

- GMail
- Google Drive
- Vector store
- ...

UI improvements
    - Real-time updates of agent state
    - Edit agent when paused (Available functions is implemented)

Postgresql persistence implementation

Prompt/response datasets

Update UI code to support Cloud Run with CPU only allocated during request cycle for scale-to-zero deployments

Refactor the repository to have modular packages (using [Nx](https://nx.dev/))
