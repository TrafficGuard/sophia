import { readFileSync } from 'fs';
import { ClassDeclaration, Decorator, JSDoc, JSDocTag, MethodDeclaration, ParameterDeclaration, Project } from 'ts-morph';
import { FunctionDefinition } from '#agent/functions';

export function generateDefinition(sourceFilePath: string): [string, any] {
	console.log(`Generating definition for ${sourceFilePath}`);
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
		// console.log(cls.getName())
		cls.getMethods().forEach((method: MethodDeclaration) => {
			const methodName = method.getName();
			const methodDescription = method.getJsDocs()[0]?.getDescription().trim();
			// console.log(methodName)

			const hasFuncDecorator = method.getDecorators().some((decorator: Decorator) => decorator.getName() === 'func' || decorator.getName() === 'funcDef');
			if (!hasFuncDecorator) return;

			if (method.getJsDocs().length === 0) {
				console.log(`No JSDocs found for ${methodName}. Skipping function definition`);
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
					return `
                    <parameter>
                    	<index>${index++}</index>
                        <name>${name}</name>
                        <type>${type}</type>
                        <description>${description || ''}</description>   
                    </parameter>`;
				})
				.join('');
			index = 0;
			const params = [];
			parameterDeclarations.map((param) => {
				params.push({
					index: index++,
					name: param.getName(),
					type: param.getType().getText(),
					description: paramDescriptions[param.getName()] || '',
				});
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
			const toolDescription = `
            <tool_description>
                <tool_name>${className}.${methodName}</tool_name>
                <description>${classDescription || ''}${methodDescription || ''}</description>${parameters}${returnsXml}
            </tool_description>`;
			const tool = {
				class: className,
				name: methodName,
				description: `${classDescription || ''}${methodDescription || ''}`,
				parameters: params,
				returns,
			};
			objDefinition[methodName] = tool;

			definition += `${toolDescription}\n`;
		});
	});
	return [definition, objDefinition];
}
