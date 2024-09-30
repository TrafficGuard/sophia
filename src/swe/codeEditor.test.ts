import { expect } from 'chai';
import { AiderCodeEditor } from './aiderCodeEditor';

describe('CodeEditor', () => {
	let codeEditor: AiderCodeEditor;

	beforeEach(() => {
		codeEditor = new AiderCodeEditor();
	});

	describe('parseAiderInput', () => {
		it('should correctly parse input lines', () => {
			const input = `
SYSTEM This is a system message
USER This is a user message
ASSISTANT This should be ignored
SYSTEM Another system message
USER Another user message
`;
			const expected = 'This is a system message\nThis is a user message\nAnother system message\nAnother user message';
			// @ts-ignore: Accessing private method for testing
			expect(codeEditor.parseAiderInput(input)).to.equal(expected);
		});

		it('should return an empty array for no matching lines', () => {
			const input = `
ASSISTANT This should be ignored
Some other text
`;
			// @ts-ignore: Accessing private method for testing
			expect(codeEditor.parseAiderInput(input)).to.equal('');
		});
	});

	describe('parseAiderOutput', () => {
		it('should correctly parse output lines', () => {
			const input = `
SYSTEM This should be ignored
USER This should also be ignored
ASSISTANT This is an assistant message
ASSISTANT This is another assistant message
Some other text
ASSISTANT Final assistant message
`;
			const expected = 'This is an assistant message\nThis is another assistant message\nFinal assistant message';
			// @ts-ignore: Accessing private method for testing
			expect(codeEditor.parseAiderOutput(input)).to.equal(expected);
		});

		it('should return an empty array for no matching lines', () => {
			const input = `
SYSTEM This should be ignored
USER This should also be ignored
Some other text
`;
			// @ts-ignore: Accessing private method for testing
			expect(codeEditor.parseAiderOutput(input)).to.equal('');
		});
	});
});
