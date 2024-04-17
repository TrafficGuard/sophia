import { generateDefinition } from './generateDefinition';


export const toolFactory = {}
/**
 * Decorator for classes which contain functions to make available to the LLMs.
 * This is required so ts-morph can read the source code to dynamically generate the definitions.
 * @param filename Must be __filename
 */
export function funcClass(filename: string) {
	return function ClassDecorator<C extends new (...args: any[]) => any>(target: C, _ctx: ClassDecoratorContext) {
		toolFactory[target.name] = target;
		const [xml, obj] = generateDefinition(filename);
		target.prototype.__functions = xml;
		target.prototype.__functionsObj = obj;
		return target;
	};
}

/**
 * Generates the function definitions of the provided objects.
 * @param objects
 */
export function getFunctionDefinitions(objects: any[]): string {
	let defs = '';
	for (const obj of objects) {
		defs += Object.getPrototypeOf(obj).__functions ?? '';
	}
	return defs;
}
