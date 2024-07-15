import { expect } from 'chai';
import { convertTypeScriptToPython } from '#agent/pythonAgentRunner';

describe('TypeScript to Python Type Conversion', () => {
	it('should convert "string" to "str"', () => {
		const result = convertTypeScriptToPython('string');
		expect(result).to.equal('str');
	});

	it('should convert "number" to "float"', () => {
		const result = convertTypeScriptToPython('number');
		expect(result).to.equal('float');
	});

	it('should convert "boolean" to "bool"', () => {
		const result = convertTypeScriptToPython('boolean');
		expect(result).to.equal('bool');
	});

	it('should convert "any" to "Any"', () => {
		const result = convertTypeScriptToPython('any');
		expect(result).to.equal('Any');
	});

	it('should convert "void" to "None"', () => {
		const result = convertTypeScriptToPython('void');
		expect(result).to.equal('None');
	});

	it('should convert "undefined" to "None"', () => {
		const result = convertTypeScriptToPython('undefined');
		expect(result).to.equal('None');
	});

	it('should convert "null" to "None"', () => {
		const result = convertTypeScriptToPython('null');
		expect(result).to.equal('None');
	});

	it('should convert "Array<string>" to "List<str>"', () => {
		const result = convertTypeScriptToPython('Array<string>');
		expect(result).to.equal('List<str>');
	});

	it('should handle multiple types "string | number | boolean"', () => {
		const result = convertTypeScriptToPython('string | number | boolean');
		expect(result).to.equal('str | float | bool');
	});

	it('should handle generic arrays "Array<number> | Array<boolean>"', () => {
		const result = convertTypeScriptToPython('Array<number> | Array<boolean>');
		expect(result).to.equal('List<float> | List<bool>');
	});
});
