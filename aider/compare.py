#!/usr/bin/env python

import sys
from collections import Counter, defaultdict

from dump import dump
from report import load_predictions
from utils import choose_predictions, is_plausible

dnames = sys.argv[1:]

all_preds = dict()
all_insts = set()

for dname in dnames:
    dump(dname)
    preds = load_predictions([dname], devin_only=True)
    all_preds[dname] = preds

    dump(sum(pred["resolved"] for pred in preds.values()))

    all_insts.update(preds.keys())

chosen = choose_predictions(dnames, devin_only=True)

histories = dict()
resolved = defaultdict(int)

for inst in all_insts:
    history = []
    for dname in dnames:
        pred = all_preds[dname].get(inst)
        if pred is None:
            history += ["n/a", "n/a"]
            continue
        if is_plausible(pred):
            history += ["plausible"]
        else:
            history += ["no"]
        if pred["resolved"]:
            history += ["resolved"]
        else:
            history += ["no"]

    if history == ["non-plausible", "not resolved", "n/a", "n/a"]:
        dump(inst)

    history = [f"{x:10}" for x in history]
    history = " | ".join(history)
    histories[inst] = history

    if chosen[inst]["resolved"]:
        resolved[history] += 1


odd = []

for inst in odd:
    history = histories[inst]
    dump(history, inst)

histories = dict((inst, kind) for inst, kind in histories.items())

counts = Counter(histories.values())
counts = sorted(counts.items(), reverse=True)
row = 0
total = 0
for history, cnt in counts:
    label = chr(ord("A") + row)
    row += 1
    total += cnt
    print(f"| {label} | {history} | {cnt:3} | {resolved[history]:3d} |")

dump(total)
dump(sum(resolved.values()))
sys.exit()

dump(len(all_insts))

resolvers = []
for inst in all_insts:
    who_resolved = tuple(
        sorted(
            dname
            for dname, preds in all_preds.items()
            if preds.get(inst, dict()).get("resolved", False)
        )
    )
    resolvers.append(who_resolved)
    # if len(who_resolved) == 1:
    #    pred = all_preds[dname][inst]
    #    # dump(pred)


total_resolved = 0
counts = Counter(resolvers)
for who, cnt in counts.items():
    dump(who, cnt)
    if who:
        total_resolved += cnt

dump(total_resolved)
