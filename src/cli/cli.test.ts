import { expect } from 'chai';
import { parseUserCliArgs } from './cli';

describe('parseProcessArgs', () => {
	it('should parse -r flag correctly', () => {
		const result = parseUserCliArgs('test', ['-r', 'some', 'initial', 'prompt']);
		expect(result.resumeLastRun).to.be.true;
		expect(result.initialPrompt).to.equal('test', 'some initial prompt');
	});

	it('should handle no -r flag', () => {
		const result = parseUserCliArgs('test', ['some', 'initial', 'prompt']);
		expect(result.resumeLastRun).to.be.false;
		expect(result.initialPrompt).to.equal('some initial prompt');
	});

	it('should handle multiple -r flags', () => {
		const result = parseUserCliArgs('test', ['-r', '-r', 'some', 'initial', 'prompt']);
		expect(result.resumeLastRun).to.be.true;
		expect(result.initialPrompt).to.equal('some initial prompt');
	});

	it('should handle empty args', () => {
		const result = parseUserCliArgs('test', []);
		expect(result.resumeLastRun).to.be.false;
		expect(result.initialPrompt).to.be.empty;
	});
});
