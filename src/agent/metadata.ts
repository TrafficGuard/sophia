import { generateDefinition } from './generateDefinition';

/**
 * Decorator for classes which contain functions to make available to the LLMs.
 * This is required so ts-morph can read the source code to dynamically generate the definitions.
 * @param filename Must be __filename
 */
export function funcClass(filename: string) {
	return function ClassDecorator<C extends new (...args: any[]) => any>(target: C, ctx: ClassDecoratorContext) {
		target.prototype.__functions = generateDefinition(filename);
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
