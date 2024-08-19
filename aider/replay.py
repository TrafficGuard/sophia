#!/usr/bin/env python

import shutil
import sys
from pathlib import Path

from aider import utils
from aider.coders import Coder
from aider.io import InputOutput
from aider.models import Model

import harness
from dump import dump


def main():
    dataset = harness.get_dataset()

    fnames = sys.argv[1:]
    for fname in fnames:
        doit(dataset, fname)


def doit(dataset, fname):
    fname = Path(fname)
    if fname.suffix != ".md":
        fname = fname.with_suffix(".md")

    text = fname.read_text()
    # if 'InvalidEditBlock' not in text and 'SearchReplaceNoExactMatch' not in text:
    #    return

    instance_id = fname.with_suffix("").name
    entry = dataset[instance_id]

    dump(fname)
    dump(instance_id)

    dump(entry["problem_statement"])
    dump(entry["patch"])

    messages = utils.split_chat_history_markdown(text, include_tool=True)
    utils.show_messages(messages)

    tmp_dname = Path("tmp.replay")
    if tmp_dname.exists():
        shutil.rmtree(tmp_dname)

    repo_dname = harness.checkout_repo(entry, tmp_dname)
    dump(repo_dname)
    input()
    return

    model = "deepseek/deepseek-chat"
    model = Model(model)
    io = InputOutput(
        pretty=False,
        yes=True,
        chat_history_file="/dev/null",
        input_history_file="/dev/null",
    )
    coder = Coder.create(
        main_model=model,
        io=io,
        git_dname=repo_dname,
    )

    dump(messages[3]["content"])
    coder.check_for_file_mentions(messages[3]["content"])

    edits = [
        i
        for i in range(len(messages))
        if messages[i]["role"] == "assistant" and "<<<<<<" in messages[i]["content"]
    ]
    bad_edit = min(edits)
    dump(edits)

    try:
        edit_error = messages[bad_edit + 1]["content"]
    except IndexError:
        print("No edit error message??")
        input()
        return

    # assert 'InvalidEditBlock' in edit_error or 'SearchReplaceNoExactMatch' in edit_error,
    # edit_error

    edit_error = messages[bad_edit + 2]["content"]

    # utils.show_messages(messages)
    bad_edit = messages[bad_edit]["content"]

    gold_patch = entry["patch"]
    print(gold_patch)
    print(bad_edit)
    print(edit_error)

    coder.partial_response_content = bad_edit

    coder.apply_updates()
    input()


if __name__ == "__main__":
    status = main()
    sys.exit(status)
