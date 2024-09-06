import '#fastify/trace-init/trace-init'; // leave an empty line next so this doesn't get sorted from the first line

import { loadPyodide } from 'pyodide';
import { GitLab } from '#functions/scm/gitlab';
import { logger } from '#o11y/logger';

export async function main() {
	const pyodide = await loadPyodide();

	// const gitlab = new GitLab();

	const jsGlobals = {
		fun1: async () => {
			console.log('In fun1');
			return 'abc';
		},
		getProjects: async () => {
			return await new GitLab().getProjects();
		},
		save: async (value: any) => {
			console.log(typeof value, 'object');
			console.log(`saving ${value}`);
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
from pyodide.ffi import JsProxy

class JsProxyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, JsProxy):
            return obj.to_py()
        # Let the base class default method raise the TypeError
        return super().default(obj)

async def main():
    res = await fun1()
    print("res " + res)
    projects = await getProjects()
    await save(json.dumps({"projects": projects}, cls=JsProxyEncoder))
    return {"projects": projects}

main()`.trim(),
		{ globals: pyodide.toPy(jsGlobals) },
	);
	logger.info(`1: ${typeof result}`);
	logger.info(`1: ${Object.keys(result).length}`);
	const pythonScriptResult = result?.toJs ? result.toJs() : result;
	logger.info(`2: ${typeof pythonScriptResult}`);
	logger.info(`2: ${Object.keys(pythonScriptResult).length}`);
	console.log('pyodide result:');
	console.log(pythonScriptResult);
	const jsResult = {};
	for (const [key, value] of Object.entries(pythonScriptResult)) {
		jsResult[key] = (value as any)?.toJs ? (value as any).toJs() : value;
	}
	console.log('jsResult result:');
	console.log(jsResult);
}

main().then(
	() => console.log('done'),
	(e) => {
		console.error(e);
		console.error(e.type);
	},
);
