// Definitions for LLM function calling

// If the FunctionDefinition/FunctionParameter interfaces change then the loading of cached definitions in the
// parser will need to check for the old schema and discard

/**
 * Definition of a class method which can be called by agents
 */
export interface FunctionDefinition {
	class: string;
	name: string;
	description: string;
	parameters: FunctionParameter[];
	returns?: string;
}

export interface FunctionParameter {
	index: number;
	name: string;
	type: string;
	optional?: boolean;
	description: string;
}

/**
 * Sets the function definitions on a class prototype
 * @param ctor the function class constructor function
 * @param definitions
 */
export function setFunctionDefinitions(ctor: new (...args: any[]) => any, definitions: Record<string, FunctionDefinition>) {
	ctor.prototype.__functions = definitions;
}

/**
 * Gets the function definitions for an instance of a function class
 * @param instance
 */
export function getFunctionDefinitions(instance: any): Record<string, FunctionDefinition> {
	const funcDefinitions: Record<string, FunctionDefinition> | undefined = Object.getPrototypeOf(instance).__functions;
	if (funcDefinitions === undefined) {
		throw new Error(`Instance prototype did not have function definitions. Does the class have the @funcClass decorator? Object: ${JSON.stringify(instance)}`);
	}
	return funcDefinitions;
}

/**
 * Get the function definitions of the provided instances of function classes.
 * @param instances
 */
export function getAllFunctionDefinitions(instances: any[]): FunctionDefinition[] {
	const definitions = [];
	for (const instance of instances) {
		definitions.push(...Object.values(getFunctionDefinitions(instance)));
	}
	return definitions;
}
