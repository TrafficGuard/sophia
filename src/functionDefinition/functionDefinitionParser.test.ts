import { expect } from 'chai';
import { func, funcClass } from './functionDecorators';
import { functionDefinitionParser } from './functionDefinitionParser';
import { FunctionDefinition } from './functions';

@funcClass(__filename)
export class TestClass {
	/**
	 * Simple method without parameters
	 */
	@func()
	simpleMethod(): void {}

	/**
	 * Method with parameters
	 * @param arg1 First argument
	 * @param arg2 Second argument
	 */
	@func()
	methodWithParams(arg1: string, arg2: number): void {}

	/**
	 * Method with optional parameter
	 * @param arg1 First argument
	 * @param arg2 Optional second argument
	 */
	@func()
	methodWithOptionalParam(arg1: string, arg2?: number): void {}

	/**
	 * Method with return type
	 * @returns A string value
	 */
	@func()
	methodWithReturnType(): string {
		return 'test';
	}
}

describe('functionDefinitionParser', () => {
	let functionDefinitions: Record<string, FunctionDefinition>;

	before(async () => {
		functionDefinitions = functionDefinitionParser(__filename);
	});

	describe('parseDefinitions', () => {
		it('should parse simple method correctly', () => {
			expect(functionDefinitions['TestClass.simpleMethod']).to.deep.equal({
				class: 'TestClass',
				name: 'TestClass.simpleMethod',
				description: 'Simple method without parameters',
				parameters: [],
			});
		});

		it('should parse method with parameters correctly', () => {
			expect(functionDefinitions['TestClass.methodWithParams']).to.deep.equal({
				class: 'TestClass',
				name: 'TestClass.methodWithParams',
				description: 'Method with parameters',
				parameters: [
					{ index: 0, name: 'arg1', type: 'string', description: 'First argument' },
					{ index: 1, name: 'arg2', type: 'number', description: 'Second argument' },
				],
			});
		});

		it('should parse method with optional parameter correctly', () => {
			expect(functionDefinitions['TestClass.methodWithOptionalParam']).to.deep.equal({
				class: 'TestClass',
				name: 'TestClass.methodWithOptionalParam',
				description: 'Method with optional parameter',
				parameters: [
					{ index: 0, name: 'arg1', type: 'string', description: 'First argument' },
					{ index: 1, name: 'arg2', type: 'number', description: 'Optional second argument', optional: true },
				],
			});
		});

		it('should parse method with return type correctly', () => {
			expect(functionDefinitions['TestClass.methodWithReturnType']).to.deep.equal({
				class: 'TestClass',
				name: 'TestClass.methodWithReturnType',
				description: 'Method with return type',
				parameters: [],
				returns: 'A string value',
			});
		});
	});
});
