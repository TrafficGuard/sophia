# Roadmap

These are some of the items to implement next:

GitHub support

Ollama support

https://github.com/nextauthjs/next-auth/pull/9587

Additional agents:

- Slack chatbot agent
- SWE-bench agent
- Add tools for GAIA agent
- CI/CD failure investigation agent

Improvements to the autonomous and code editing agents (a whole roadmap in itself)

Real-time human-in-the-loop which doesn't stop the agent control loop.

Browser push notifications

Additional tools:

- GMail
- Google Drive
- File store
- Vector store
- ...

Code review configuration database persistence

UI improvements
    - Real-time updates of agent state
    - Edit agent when paused

Postgresql persistence implementation

Web UI authentication:

- OAuth
- user/password

Windows support

Prompt/response datasets

Update UI code to support Cloud Run with CPU only allocated during request cycle for scale-to-zero deployments

Refactor the repository to have modular packages (using [Nx](https://nx.dev/))
