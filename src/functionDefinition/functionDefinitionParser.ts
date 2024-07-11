import { readFileSync, writeFileSync } from 'fs';
import fs from 'fs';
import path from 'path';
import { ClassDeclaration, Decorator, JSDoc, JSDocTag, MethodDeclaration, ParameterDeclaration, Project } from 'ts-morph';
import { logger } from '#o11y/logger';
import { FunctionDefinition, FunctionParameter } from './functions';

const CACHED_BASE_PATH = '.nous/functions/';

export function functionDefinitionParser(sourceFilePath: string): [string, any] {
	const cwd = process.cwd();
	let cachedPath = path.relative(cwd, sourceFilePath);
	// trim the .ts file extension
	cachedPath = cachedPath.slice(0, cachedPath.length - 3);
	cachedPath = path.join(CACHED_BASE_PATH, cachedPath);

	const sourceUpdatedTimestamp = getFileUpdatedTimestamp(sourceFilePath);
	const xmlUpdatedTimestamp = getFileUpdatedTimestamp(`${cachedPath}.xml`);

	// If the cached definitions are newer than the source file, then we can use them
	if (xmlUpdatedTimestamp && xmlUpdatedTimestamp > sourceUpdatedTimestamp) {
		try {
			const xml = readFileSync(`${cachedPath}.xml`).toString();
			const json = readFileSync(`${cachedPath}.json`).toString();
			logger.debug(`Loading cached definitions from ${cachedPath}.xml and ${cachedPath}.json`);
			return [xml, JSON.parse(json)];
		} catch (e) {
			logger.info('Error loading cached definitions: ', e.medium);
		}
	}

	logger.info(`Generating definition for ${sourceFilePath}`);
	const project = new Project();
	const sourceFile = project.createSourceFile('temp.ts', readFileSync(sourceFilePath, 'utf8'));

	const classes = sourceFile.getClasses();

	// The function definitions as an XML string
	let definition = '';
	// The function definitions as an object, keyed by the method name
	const objDefinition: Record<string, FunctionDefinition> = {};

	classes.forEach((cls: ClassDeclaration) => {
		const className = cls.getName();
		const classDescription = cls.getJsDocs()[0]?.getDescription().trim();

		cls.getMethods().forEach((method: MethodDeclaration) => {
			// This can be tidied up. Create the object definition first, then create the XML formatted version
			const methodName = method.getName();
			const methodDescription = method.getJsDocs()[0]?.getDescription().trim();

			const optionalParams = [];
			for (const parameter of method.getParameters()) {
				if (parameter.isOptional() || parameter.hasInitializer()) {
					optionalParams.push(parameter.getName());
				}
			}

			const hasFuncDecorator = method.getDecorators().some((decorator: Decorator) => decorator.getName() === 'func' || decorator.getName() === 'funcDef');
			if (!hasFuncDecorator) return;

			if (method.getJsDocs().length === 0) {
				logger.warn(`No JSDocs found for ${methodName}. Skipping function definition`);
				return;
			}

			// console.log(method.getName())
			const jsDocs: JSDoc = method.getJsDocs()[0];
			// extract the params and store the descriptions
			let returns = '';
			const paramDescriptions = {};
			jsDocs.getTags().forEach((tag: JSDocTag) => {
				if (tag.getTagName() === 'returns') {
					returns = tag.getText().replace('@returns', '').trim();
					// Convert first char to upper case
					if (returns.length) {
						returns = returns.charAt(0).toUpperCase() + returns.slice(1);
					}
				}
				if (tag.getTagName() === 'param') {
					const text = tag.getText();
					// text will be in the format:
					// "@param dirPath The directory to search under"
					// TODO handle when there is a type eg {string}
					// We need to extract the param name and the description
					// We also need to remove the @param keyword and trim the string
					// The code for this is:
					const paramName = text.split(' ')[1];
					let description = text.split(' ').slice(2).join(' ').trim();
					// if the description ends with a * then remove it
					if (description.endsWith('*')) {
						description = description.slice(0, -1).trim();
					}
					paramDescriptions[paramName] = description;
				}
			});

			const parameterDeclarations: ParameterDeclaration[] = method.getParameters();
			let index = 0;
			const paramText = parameterDeclarations
				.map((param) => {
					const name = param.getName();
					const type = param.getType().getText();
					const description = paramDescriptions[name]; // param.getJsDocs()[0]?.getComment()?.trim();
					// If there isn't a @param doc for a parameter, then its not exposed to the LLM
					if (!description || description.trim() === '') {
						return '';
					}
					return `
                    <parameter>
                    	<index>${index++}</index>
                        <name>${name}</name>
                        <type>${type}</type>${optionalParams[name] ? '\n<optional>true</optional>\n' : ''}
                        <description>${description || ''}</description>   
                    </parameter>`;
				})
				.join('');
			index = 0;
			const params = [];
			parameterDeclarations.map((param) => {
				const paramDef: FunctionParameter = {
					index: index++,
					name: param.getName(),
					type: param.getType().getText(),
					description: paramDescriptions[param.getName()] || '',
				};
				if (optionalParams[param.getName()]) paramDef.optional = true;
				// If there isn't a @param doc for a parameter, then its not exposed to the LLM
				if (paramDef.description) params.push(paramDef);
			});

			const parameters = paramText.trim().length
				? `
                <parameters>${paramText}
                </parameters>`
				: '';
			const returnsXml = returns.length
				? `
                <returns>${returns}</returns>`
				: '';
			const functionDescription = `
            <function_description>
                <function_name>${className}.${methodName}</function_name>
                <description>${methodDescription}</description>${parameters}${returnsXml}
            </function_description>`;
			objDefinition[methodName] = {
				class: className,
				name: methodName,
				description: methodDescription,
				parameters: params,
				returns,
			};

			definition += `${functionDescription}\n`;
		});
	});

	fs.mkdirSync(path.join(cachedPath, '..'), { recursive: true });
	writeFileSync(`${cachedPath}.xml`, definition);
	writeFileSync(`${cachedPath}.json`, JSON.stringify(objDefinition, null, 2));
	return [definition, objDefinition];
}

function getFileUpdatedTimestamp(filePath: string): Date | null {
	try {
		const stats = fs.statSync(filePath); // Get the stats object
		return stats.mtime; // mtime is the "modified time"
	} catch (error) {
		return null;
	}
}
