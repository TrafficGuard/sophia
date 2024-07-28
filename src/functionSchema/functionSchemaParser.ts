import { readFileSync, writeFileSync } from 'fs';
import fs, { writeFile } from 'node:fs';
import path from 'path';
import { promisify } from 'util';
import { ClassDeclaration, Decorator, JSDoc, JSDocTag, MethodDeclaration, ParameterDeclaration, Project } from 'ts-morph';
import { logger } from '#o11y/logger';
import { FUNC_DECORATOR_NAME } from './functionDecorators';
import { FunctionParameter, FunctionSchema } from './functions';

const writeFileAsync = promisify(writeFile);

const CACHED_BASE_PATH = '.nous/functions/';

/**
 * Parses a source file which is expected to have a class with the @funClass decorator.
 *
 * The JSON function schema is cached to file to avoid the overhead of ts-morph on startup.
 *
 * With the example class:
 * <code>
 * @funcClass(__filename)
 * export class FuncClass {
 *    /**
 *     * Description of simple method
 *     *\/
 *    @func()
 *    simpleMethod(): void {}
 *
 *   /**
 *     * Description of complexMethod
 *     * @param arg1 {string} the first arg
 *     * @param arg2 {number} the second arg
 *     * @return Promise<Date> the current date
 *     *\/
 *    @func()
 *    async complexMethod(arg1: string, arg2?: number): Promise<Date> {
 *        return new Date()
 *    }
 * }
 * </code>
 * Then the parsed result would be:
 * {
 * 	 "FuncClass_simpleMethod": {
 *      "name": "FuncClass_simpleMethod",
 *      "class": "FuncClass",
 *      "description": "Description of simple method",
 *      "returns": "",
 *      "params": []
 *    },
 * 	  "FuncClass_complexMethod": {
 *      "name": "FuncClass_complexMethod",
 *      "class": "FuncClass",
 *      "description": "Description of complexMethod",
 *      "returns": "Date - the current date",
 *      "params": [
 *          {
 *          	"name": "arg1",
 *          	"type": "string",
 *          	"description": "the first arg"
 *          },
 *          {
 *            "name": "arg2",
 *            "type": "string",
 *            "description": "the second arg",
 *            "optional": true
 *          }
 *      ]
 *   }
 * }
 * @param sourceFilePath the full path to the source file
 * @returns An array of FunctionSchema objects
 */
export function functionSchemaParser(sourceFilePath: string): Record<string, FunctionSchema> {
	const cwd = process.cwd();
	let cachedPath = path.relative(cwd, sourceFilePath);
	// trim the .ts file extension
	cachedPath = cachedPath.slice(0, cachedPath.length - 3);
	cachedPath = path.join(CACHED_BASE_PATH, cachedPath);

	const sourceUpdatedTimestamp = getFileUpdatedTimestamp(sourceFilePath);
	const jsonUpdatedTimestamp = getFileUpdatedTimestamp(`${cachedPath}.json`);

	// If the cached schemas are newer than the source file, then we can use them
	if (jsonUpdatedTimestamp && jsonUpdatedTimestamp > sourceUpdatedTimestamp) {
		try {
			const json = readFileSync(`${cachedPath}.json`).toString();
			logger.debug(`Loading cached function schemas from ${cachedPath}.json`);
			return JSON.parse(json);
		} catch (e) {
			logger.info('Error loading cached function schemas: ', e.message);
		}
	}

	logger.info(`Generating schema for ${sourceFilePath}`);
	const project = new Project();
	const sourceFile = project.createSourceFile('temp.ts', readFileSync(sourceFilePath, 'utf8'));

	const classes = sourceFile.getClasses();

	const functionSchemas: Record<string, FunctionSchema> = {};

	classes.forEach((cls: ClassDeclaration) => {
		const className = cls.getName();

		cls.getMethods().forEach((method: MethodDeclaration) => {
			const methodName = method.getName();
			const methodDescription = method.getJsDocs()[0]?.getDescription().trim();

			const hasFuncDecorator = method.getDecorators().some((decorator: Decorator) => decorator.getName() === FUNC_DECORATOR_NAME);
			if (!hasFuncDecorator) return;

			if (method.getJsDocs().length === 0) {
				logger.warn(`No JSDocs found for ${methodName}. Skipping function schema`);
				return;
			}

			const jsDocs: JSDoc = method.getJsDocs()[0];
			let returns = '';
			const paramDescriptions = {};
			jsDocs.getTags().forEach((tag: JSDocTag) => {
				if (tag.getTagName() === 'returns') {
					returns = tag.getText().replace('@returns', '').trim();
					if (returns.length) {
						returns = returns.charAt(0).toUpperCase() + returns.slice(1);
					}
				}
				if (tag.getTagName() === 'param') {
					const text = tag.getText().trim();
					const paramName = text.split(' ')[1];
					let description = text.split(' ').slice(2).join(' ').trim();
					if (description.endsWith('*')) {
						description = description.slice(0, -1).trim();
					}
					// Remove the type
					if (description.startsWith('{')) description = description.substring(description.indexOf('}') + 1).trim();
					paramDescriptions[paramName] = description;
				}
			});

			const parameterDeclarations: ParameterDeclaration[] = method.getParameters();
			const params: FunctionParameter[] = [];
			parameterDeclarations.forEach((param, index) => {
				const paramDef: FunctionParameter = {
					index,
					name: param.getName(),
					type: param.getType().getText(),
					description: paramDescriptions[param.getName()] || '',
				};
				if (param.isOptional() || param.hasInitializer()) {
					paramDef.optional = true;
				}
				if (paramDef.description) params.push(paramDef);
			});

			const funcDef: FunctionSchema = {
				class: className,
				name: `${className}_${methodName}`,
				description: methodDescription,
				parameters: params,
			};
			if (returns) funcDef.returns = returns;
			functionSchemas[funcDef.name] = funcDef;
		});
	});
	fs.mkdirSync(path.join(cachedPath, '..'), { recursive: true });
	writeFileAsync(`${cachedPath}.json`, JSON.stringify(functionSchemas, null, 2)).catch((e) => logger.info(`Error writing cached schema: ${e.message}`));
	return functionSchemas;
}

function getFileUpdatedTimestamp(filePath: string): Date | null {
	try {
		const stats = fs.statSync(filePath); // Get the stats object
		return stats.mtime; // mtime is the "modified time"
	} catch (error) {
		return null;
	}
}
