import { expect } from 'chai';
import { functionDefinitionParser } from "./functionDefinitionParser";
import { funcClass } from "./functionDecorators";

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
        return "test";
    }
}

describe('functionDefinitionParser', () => {
    let jsonDefinition: any;

    before(async () => {
        [, jsonDefinition] = functionDefinitionParser(__filename);
    });

    describe('parseDefinitions', () => {
        it('should parse simple method correctly', () => {
            expect(jsonDefinition.simpleMethod).to.deep.equal({
                class: 'TestClass',
                name: 'simpleMethod',
                description: 'Simple method without parameters',
                parameters: [],
                returns: '',
            });
        });

        it('should parse method with parameters correctly', () => {
            expect(jsonDefinition.methodWithParams).to.deep.equal({
                class: 'TestClass',
                name: 'methodWithParams',
                description: 'Method with parameters',
                parameters: [
                    { index: 0, name: 'arg1', type: 'string', description: 'First argument' },
                    { index: 1, name: 'arg2', type: 'number', description: 'Second argument' },
                ],
                returns: '',
            });
        });

        it('should parse method with optional parameter correctly', () => {
            expect(jsonDefinition.methodWithOptionalParam).to.deep.equal({
                class: 'TestClass',
                name: 'methodWithOptionalParam',
                description: 'Method with optional parameter',
                parameters: [
                    { index: 0, name: 'arg1', type: 'string', description: 'First argument' },
                    { index: 1, name: 'arg2', type: 'number', description: 'Optional second argument', optional: true },
                ],
                returns: '',
            });
        });

        it('should parse method with return type correctly', () => {
            expect(jsonDefinition.methodWithReturnType).to.deep.equal({
                class: 'TestClass',
                name: 'methodWithReturnType',
                description: 'Method with return type',
                parameters: [],
                returns: 'A string value',
            });
        });
    });
});
