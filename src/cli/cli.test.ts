import { expect } from 'chai';
import { parseProcessArgs } from './cli';

describe('parseProcessArgs', () => {
    it('should parse -r flag correctly', () => {
        const result = parseProcessArgs(['-r', 'some', 'initial', 'prompt']);
        expect(result.resumeLastRun).to.be.true;
        expect(result.remainingArgs).to.deep.equal(['some', 'initial', 'prompt']);
    });

    it('should handle no -r flag', () => {
        const result = parseProcessArgs(['some', 'initial', 'prompt']);
        expect(result.resumeLastRun).to.be.false;
        expect(result.remainingArgs).to.deep.equal(['some', 'initial', 'prompt']);
    });

    it('should handle multiple -r flags', () => {
        const result = parseProcessArgs(['-r', '-r', 'some', 'initial', 'prompt']);
        expect(result.resumeLastRun).to.be.true;
        expect(result.remainingArgs).to.deep.equal(['some', 'initial', 'prompt']);
    });

    it('should handle empty args', () => {
        const result = parseProcessArgs([]);
        expect(result.resumeLastRun).to.be.false;
        expect(result.remainingArgs).to.be.empty;
    });
});
