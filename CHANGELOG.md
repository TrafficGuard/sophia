
# August 2024

Added initial SWE-bench runner.  Also working on inference using the containerised environments at https://github.com/TrafficGuard/SWE-bench/blob/main/swebench/harness/run_inference.py

Added a process to generate documentation for a project.This is a bottom-up process which generates a one sentence and one-paragraph summary for each file
starting in the leaf folders, then generates the summary for the folder, and then iteratively moves up to the root node.

Prototyping new generateText methods on the LLM interface which have a message history to support both chatbots, and
setting the cache_control flag where the message history may be used like a stack for agentic workflows.

Add initial Slack chatbot integration.

Update the Aider wrapper to support editing Python projects in other directories, and to support using Vertex AI.

Fixes to GitHub integration.

Add LLM service integration tests.

Update CI build to run frontend and backend in parallel.

Fix Anthropic LLM service.

Add getFileSystemTreeStructure functions and other fixes to the FileSystem service.