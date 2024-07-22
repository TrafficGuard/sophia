import { expect } from 'chai';
import * as sinon from 'sinon';
import { gitHubRepoHomepageRegex } from './web';

describe('PublicWeb', () => {
	describe('GitHub url', () => {
		it('should match on GitHub repository homepage', async () => {
			let url = 'https://github.com/kyrolabs/awesome-agents';
			expect(gitHubRepoHomepageRegex.test(url)).to.be.true;
			url = 'https://github.com/kyrolabs/awesome-agents/';
			expect(gitHubRepoHomepageRegex.test(url)).to.be.true;
			url = 'https://github.com/kyrolabs/awesome-agents/blobs/master/README.md';
			expect(gitHubRepoHomepageRegex.test(url)).to.be.false;
		});
	});
});
