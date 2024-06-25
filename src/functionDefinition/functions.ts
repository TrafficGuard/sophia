// - Types --------------------------------------------------------------------

import { logger } from '#o11y/logger';

export interface FunctionParameter {
	index: number;
	name: string;
	type: string;
	optional?: boolean;
	description: string;
}

export interface FunctionDefinition {
	class: string;
	name: string;
	description: string;
	parameters: FunctionParameter[];
	returns: string;
}

// - Utils --------------------------------------------------------------------

/**
 * Gets all the LLM function definitions on a class
 * @param obj the class instance
 * @returns {FunctionDefinition[]}
 */
export function getAllFunctions(obj: any): FunctionDefinition[] {
	if (obj.__functions === undefined || obj.__functions === null) {
		logger.warn(`no functions set for ${obj.constructor.name}`);
		return [];
	}
	return obj.__functions;
}

// - Decorators ---------------------------------------------------------------

// In functionDefinitionParser.ts are references to the func and funcDef names

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
