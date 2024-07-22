import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { loadPyodide } from 'pyodide';
import { Perplexity } from '#functions/web/perplexity';
import { logger } from '#o11y/logger';

export async function main() {
	const pyodide = await loadPyodide();

	const p = new Perplexity();

	const jsGlobals = {
		fun1: async () => {
			console.log('In fun1');
			return 'abc';
		},
		search: async (key: string, mem: boolean) => {
			return p.research(key, mem);
		},
		// search: async(...args) => {return p.research(...args)}
	};
	console.log(jsGlobals);

	pyodide.setStdout({
		batched: (output) => {
			console.log(`Script stdout: ${JSON.stringify(output)}`);
		},
	});
	pyodide.setStderr({
		batched: (output) => {
			console.log(`Script stderr: ${JSON.stringify(output)}`);
		},
	});
	const result = await pyodide.runPythonAsync(
		`
import json
import re
import math
import datetime
from typing import List, Dict, Tuple, Optional, Union

async def main()
    res = await fun1()
    print("res " + res)
    s = await search("lah", True)
     print("s" + s)
    return s

main()`.trim(),
		{ globals: pyodide.toPy(jsGlobals) },
	);
	const pythonScriptResult = result?.toJs ? result.toJs() : result;
	console.log(`pyodide result ${pythonScriptResult}`);
}

main().then(
	() => console.log('done'),
	(e) => {
		console.error(e);
		console.error(e.type);
	},
);
