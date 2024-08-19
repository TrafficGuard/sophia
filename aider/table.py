#!/usr/bin/env python

import random
import sys
from collections import Counter, defaultdict

from dump import dump
from utils import choose_predictions

devin_only = False

dnames = sys.argv[1:]
preds = choose_predictions(dnames, devin_only=devin_only)

# dataset = get_dataset()

items = list(preds.items())
random.shuffle(items)

num_instances = len(items)
dump(num_instances)

name = {
    "gpt-4o": "Aider with GPT-4o",
    "openrouter/anthropic/claude-3-opus": "Aider with Opus",
    "n/a": "Aider with GPT-4o",
}

proposed = []
resolved = []

model_proposed = defaultdict(int)
model_resolved = defaultdict(int)

resolved_instances = set()

for inst, pred in items:
    is_resolved = pred["resolved"]
    model = pred.get("model", "n/a")
    attempt = pred["try"]

    model = name[model]

    key = (attempt, model)
    proposed.append(key)
    model_proposed[model] += 1
    if is_resolved:
        resolved.append(key)
        model_resolved[model] += 1
        resolved_instances.add(inst)


dump(len(resolved_instances))
dump(sorted(resolved_instances))


num_proposed = len(proposed)
dump(num_proposed)
num_resolved = len(resolved)
dump(num_resolved)

counts_proposed = Counter(proposed)
counts_resolved = Counter(resolved)
num = 0
for key, count_p in sorted(counts_proposed.items()):
    count_r = counts_resolved[key]
    num += 1
    attempt, model = key
    pct_p = count_p * 100 / num_proposed
    pct_r = count_r * 100 / num_resolved
    pct_of_all = count_r / num_instances * 100

    pct_r_of_p = count_r / count_p * 100

    print(
        f"| {num} | {model:20} | {count_p:3d} | {pct_p:4.1f}% | {count_r:2d} | {pct_r:4.1f}% |"
        f" {pct_of_all:4.1f}% |"
        # f" {pct_r_of_p:4.1f}%"
    )

pct_of_all = num_resolved / num_instances * 100

print(
    f"| **Total** | | **{num_proposed}** | **100%** | **{num_resolved}** | **100%** |"
    f" **{pct_of_all:4.1f}%** | "
)
print()

for model in sorted(model_proposed.keys()):
    count_p = model_proposed[model]
    count_r = model_resolved[model]
    pct = count_r * 100 / count_p
    print(f"| {model:20} | {count_p:3d} | {count_r:2d} |{pct:4.1f}% |")

pct = num_resolved * 100 / num_proposed
print(f"| **Total** | **{num_proposed}** | **{num_resolved}** |**{pct:4.1f}%** |")
