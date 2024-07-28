import { expect } from 'chai';
import { func, funcClass } from './functionDecorators';
import { functionSchemaParser } from './functionSchemaParser';
import { FunctionSchema } from './functions';

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
	let functionSchemas: Record<string, FunctionSchema>;

	before(async () => {
		functionSchemas = functionSchemaParser(__filename);
	});

	describe('parseDefinitions', () => {
		it('should parse simple method correctly', () => {
			expect(functionSchemas.TestClass_simpleMethod).to.deep.equal({
				class: 'TestClass',
				name: 'TestClass_simpleMethod',
				description: 'Simple method without parameters',
				parameters: [],
			});
		});

		it('should parse method with parameters correctly', () => {
			expect(functionSchemas['TestClass.methodWithParams']).to.deep.equal({
				class: 'TestClass',
				name: 'TestClass_methodWithParams',
				description: 'Method with parameters',
				parameters: [
					{ index: 0, name: 'arg1', type: 'string', description: 'First argument' },
					{ index: 1, name: 'arg2', type: 'number', description: 'Second argument' },
				],
			});
		});

		it('should parse method with optional parameter correctly', () => {
			expect(functionSchemas.TestClass_methodWithOptionalParam).to.deep.equal({
				class: 'TestClass',
				name: 'TestClass_methodWithOptionalParam',
				description: 'Method with optional parameter',
				parameters: [
					{ index: 0, name: 'arg1', type: 'string', description: 'First argument' },
					{ index: 1, name: 'arg2', type: 'number', description: 'Optional second argument', optional: true },
				],
			});
		});

		it('should parse method with return type correctly', () => {
			expect(functionSchemas.TestClass_methodWithReturnType).to.deep.equal({
				class: 'TestClass',
				name: 'TestClass_methodWithReturnType',
				description: 'Method with return type',
				parameters: [],
				returns: 'A string value',
			});
		});
	});
});
