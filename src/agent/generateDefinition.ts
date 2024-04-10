import { readFileSync } from 'fs';
import { ClassDeclaration, Decorator, JSDoc, JSDocTag, MethodDeclaration, ParameterDeclaration, Project } from 'ts-morph';

export function generateDefinition(sourceFilePath: string): string {
	console.log(`Generating definition for ${sourceFilePath}`);
	const project = new Project();
	const sourceFile = project.createSourceFile('temp.ts', readFileSync(sourceFilePath, 'utf8'));

	const classes = sourceFile.getClasses();

	let definition = '';

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
					if (returns.length) returns = returns.charAt(0).toUpperCase() + returns.slice(1);
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
			const paramText = parameterDeclarations
				.map((param) => {
					const name = param.getName();
					const type = param.getType().getText();
					const description = paramDescriptions[name]; // param.getJsDocs()[0]?.getComment()?.trim();
					return `
                    <parameter>
                        <name>${name}</name>
                        <type>${type}</type>
                        <description>${description || ''}</description>   
                    </parameter>`;
				})
				.join('');

			const parameters = paramText.trim().length
				? `
                <parameters>${paramText}
                </parameters>`
				: '';
			returns = returns.length
				? `
                <returns>${returns}</returns>`
				: '';
			const toolDescription = `
            <tool_description>
                <tool_name>${className}.${methodName}</tool_name>
                <description>${classDescription || ''}${methodDescription || ''}</description>${parameters}${returns}
            </tool_description>`;

			definition += `${toolDescription}\n`;
		});
	});
	return definition;
}
