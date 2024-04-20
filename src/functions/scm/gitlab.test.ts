import { expect } from 'chai';
import sinon from 'sinon';
import { getStartingLineNumber } from './gitlab';

describe('GitLab', () => {
	describe('diff', () => {
		it('should get the starting line number', async () => {
			expect(getStartingLineNumber(' @@ -0,0 +1,76 @@\n+async function()[]\n{')).to.equal(1);
			expect(getStartingLineNumber(' @@ -0,0 +152,76 @@\n+async function()[]\n{')).to.equal(152);
		});
	});
});
