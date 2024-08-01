import { expect } from 'chai';
import {func, funcClass} from './functionDecorators';
import { functionSchemaParser } from './functionSchemaParser';
import { FunctionSchema } from './functions';
import {unlinkSync} from "node:fs";


@funcClass(__filename)
export class TestClass {
	/**
	 * Simple method without parameters
	 */
	@func()
	simpleMethod(): void {}

	/**
	 * Method with parameters
	 * @param {string} arg1 - First argument
	 * @param {number} arg2 - Second argument
	 */
	@func()
	methodWithParams(arg1: string, arg2: number): void {}

	/**
	 * Method with optional parameter and no types or dash in jsdoc
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

	/**
	 * Method with Promise return type
	 * @returns {Promise<string>} A string value
	 */
	@func()
	methodReturnsPromise(): Promise<string> {
		return Promise.resolve('test');
	}
}

describe('functionDefinitionParser', () => {
	let functionSchemas: Record<string, FunctionSchema>;

	before(async () => {
		unlinkSync('.nous/functions/src/functionSchema/functionSchemaParser.test.json')
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
			expect(functionSchemas['TestClass_methodWithParams']).to.deep.equal({
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
				description: 'Method with optional parameter and no types or dash in jsdoc',
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

		it('should parse method with a Promise return type to unwrap the return type', () => {
			expect(functionSchemas.TestClass_methodReturnsPromise).to.deep.equal({
				class: 'TestClass',
				name: 'TestClass_methodReturnsPromise',
				description: 'Method with Promise return type',
				parameters: [],
				returns: 'A string value',
			});
		});
	});
});
