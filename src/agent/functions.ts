// - Types --------------------------------------------------------------------

interface FunctionParameter {
	name: string;
	type: string;
	description: string;
}

export interface FunctionDefinition {
	class: string;
	name: string;
	description: string;
	parameters: FunctionParameter[];
}

// - Utils --------------------------------------------------------------------

/**
 * Gets all the LLM function definitions on a class
 * @param obj the class instance
 * @returns {FunctionDefinition[]}
 */
export function getAllFunctions(obj: any): FunctionDefinition[] {
	if (obj.__functions === undefined || obj.__functions === null) {
		console.log(`no functions set for ${obj.constructor.name}`);
		return [];
	}
	return obj.__functions;
}

// - Decorators ---------------------------------------------------------------

// In generateDefinition.ts are references to the func and funcDef names

/**
 * Decorator for manually defining a function/tool to be used by the LLM
 * @param functionDefinition
 * @returns
 */
export function funcDef(functionDefinition: Omit<FunctionDefinition, 'class'>) {
	return function funcDecorator(originalMethod: any, context: ClassMethodDecoratorContext): any {
		context.addInitializer(function () {
			if (!(this as any).__functions) (this as any).__functions = [];
			(this as any).__functions.push(functionDefinition);
			(functionDefinition as FunctionDefinition).class = context.name.toString();
		});
		return originalMethod;
	};
}

/**
 * Decorator which flags a class method to be exposed as a tool for the agent control loop.
 */
export function func(originalMethod: any, context: ClassMethodDecoratorContext) {
	return originalMethod;
}
