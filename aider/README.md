
# Aider SWE Bench harness

[Aider recently scored 26.3%](https://github.com/swe-bench/experiments/pull/7)
on the
[SWE Bench Lite benchmark](https://www.swebench.com),
achieving a state-of-the-art result. 
This repo contains the benchmarking harness that was used to
obtain that result.

## Methodology

For the benchmark, 
aider was launched in each problem's git repository
with the problem statement
submitted as the opening chat message from "the user."
After that aider runs as normal, with the following modifications:

- Aider's suggestions were always accepted without user approval.
- A simple harness was used to retry the SWE Bench problem if aider produced code that wasn't *plausibly correct*.
Plausibly correct means that aider reported that it had successfully edited the repo
without causing syntax errors or breaking any *pre-existing* tests.
- If the solution isn't plausible, the harness launches aider to try again from scratch,
alternating between using aider with GPT-4o and Opus.
- If no plausible solution is found after six tries, the harness picks the solution
with the fewest edit/lint/test problems.

It's important to be clear that
*aider and the benchmark harness
only had access to the pre-existing tests in each problem's repo*.
The held out "acceptance tests" were *only* used
after benchmarking to compute statistics on which problems aider
correctly resolved.

See the
[article on Aider's SWE Bench Lite result](https://aider.chat/2024/05/22/swe-bench-lite.html)
for more details on the methodology.

## The "aider agent"

The "aider agent" is dead simple.
It simply invokes aider on a fresh copy the problem's git repo
over and over,
iterating through the models it's been told to use.
Aider is invoked repeatedly until aider reports that it
successfully edited the repo without any outstanding edit, lint or test errors.
This is a plausible solution, so the agent is done.

Aider is configured
with a test command to run all the pre-existing tests in the problem's repo.
Aider is also configured
to proceed with all its suggestioned actions
without any user approval.

In pseudo-code:

```python
def aider_agent(swe_bench_problem):
    num_tries = 3
    models = ["gpt-4o", "opus"]
    
    for attempt in range(num_tries):
        for model in models:
            repo_tmp_dirname = git_checkout_the_problems_repo(swe_bench_problem)

            aider_result = aider(
                model=model,
                repo_dirname=repo_tmp_dirname,
                user_input_message=swe_bench_problem.problem_statement,
                test_cmd=swe_bench_problem.test_cmd_for_preexisting_tests,
                accept_all_suggestions=True,
                )
            
            if aider_result.edit_outcome and \
               aider_result.lint_outcome and \
               aider_result.test_outcome:
                   # We found a plausible solution!
                   return aider_result.diffs
```

The 
[actual function for this](https://github.com/paul-gauthier/aider-swe-bench/blob/main/harness.py#L198)
is a bit more verbose because it's keeping
track of various data for statistics, etc.
It also handles the case where no plausible solution is ever found,
by picking the least bad candidate solution.

## Installation

```
# Clone this repo
git clone https://github.com/paul-gauthier/aider-swe-bench

# Clone the SWE Bench docker repo into a subdir of this repo
cd aider-swe-bench
git clone https://github.com/aorwall/SWE-bench-docker

# Install pip requirements
pip install -r requirements.txt

# You may want to install the latest main branch of aider
python -m pip install --upgrade git+https://github.com/paul-gauthier/aider.git
```

See the
[SWE Bench Docker docs](https://github.com/aorwall/SWE-bench-docker)
to ensure you have built or pulled all the SWE Bench testbed
docker images you'll need.

## Running the benchmark and computing results

The workflow for working with SWE Bench in general is 2 steps:

1. Run your agent on the problems to produce predictions, which are a series of json records that get bundled up into a jsonl file.
2. Evaluate the predictions jsonl file using the acceptance tests. This produces `.eval.log` files with logs of the testing procedure.

This repo is for running and evaluating aider on SWE Bench. As described in the README, it consists of 2 scripts:

1. The `harness.py` script will run aider on all the problems and produce predictions. It does not do any *acceptance* testing. It does run any pre-existing tests that were part of the problem's repo, but never runs any acceptance tests. This script produces a bunch of predictions as individual json files in `predictions/<DIRNAME>/<instance_id>.json`.

2. The `report.py` script consumes all those predictions and turns them into `predictions/<DIRNAME>/all_preds.jsonl`. It then feeds that jsonl file through the SWE Bench evaluation and reporting scripts to produce `logs/<DIRNAME>/<instance_id>...eval.log` files as well as a summary report in `predictions/<DIRNAME>/results.json`.
