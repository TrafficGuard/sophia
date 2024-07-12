import { expect } from 'chai';
import {functionDefinitionParser} from "./functionDefinitionParser";
import {funcClass} from "./functionDecorators";

@funcClass(__filename)
export class TestClass {

    /**
     * Simple method
     */
    simpleMethod(): void {
    }

    // TODO methods with arguments, optional arguments, return types
}

describe('functionDefinitionParser', () => {

    let jsonDefinition: any

    before(async() => {
        jsonDefinition = functionDefinitionParser(__filename)[1]
    })


    describe('parseDefinitions', () => {

        it('example', async () => {
            const object = JSON.parse('{ "foo": "bar" }');
            expect(object).to.deep.equal({foo: 'bar'});
        });
    })
})