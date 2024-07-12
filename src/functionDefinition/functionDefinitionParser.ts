import { readFileSync } from 'fs';
import { ClassDeclaration, Decorator, JSDoc, JSDocTag, MethodDeclaration, ParameterDeclaration, Project } from 'ts-morph';
import { logger } from '#o11y/logger';
import { FunctionDefinition, FunctionParameter } from './functions';

/**
 * Parses a source file which is expected to have a class with the @funClass decorator.
 * @param sourceFilePath the full path to the source file
 * @returns An array of FunctionDefinition objects
 */
export function functionDefinitionParser(sourceFilePath: string): FunctionDefinition[] {
	logger.info(`Generating definition for ${sourceFilePath}`);
	const project = new Project();
	const sourceFile = project.createSourceFile('temp.ts', readFileSync(sourceFilePath, 'utf8'));

	const classes = sourceFile.getClasses();

	const functionDefinitions: FunctionDefinition[] = [];

	classes.forEach((cls: ClassDeclaration) => {
		const className = cls.getName();

		cls.getMethods().forEach((method: MethodDeclaration) => {
			const methodName = method.getName();
			const methodDescription = method.getJsDocs()[0]?.getDescription().trim();

			const hasFuncDecorator = method.getDecorators().some((decorator: Decorator) => decorator.getName() === 'func' || decorator.getName() === 'funcDef');
			if (!hasFuncDecorator) return;

			if (method.getJsDocs().length === 0) {
				logger.warn(`No JSDocs found for ${methodName}. Skipping function definition`);
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
					const text = tag.getText();
					const paramName = text.split(' ')[1];
					let description = text.split(' ').slice(2).join(' ').trim();
					if (description.endsWith('*')) {
						description = description.slice(0, -1).trim();
					}
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

			functionDefinitions.push({
				class: className,
				name: methodName,
				description: methodDescription,
				parameters: params,
				returns,
			});
		});
	});

	return functionDefinitions;
}
