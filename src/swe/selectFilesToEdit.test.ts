import { expect } from 'chai';
import { FileSystemService } from '#functions/storage/fileSystemService';
import { removeNonExistingFiles } from '#swe/selectFilesToEdit';

describe('removeNonExistingFiles', () => {
	const fileSystem = new FileSystemService();

	it('should remove non-existing files from the selection', async () => {
		const existingFilePath = './package.json'; // assuming package.json exists
		const randomFilePath = './random-file-that-does-not-exist.txt';

		const fileSelection = {
			primaryFiles: [
				{ path: existingFilePath, reason: 'editing' },
				{ path: randomFilePath, reason: 'editing' },
			],
			secondaryFiles: [{ path: randomFilePath, reason: 'reference' }],
		};

		const result = await removeNonExistingFiles(fileSelection);

		expect(result.primaryFiles).to.have.lengthOf(1);
		expect(result.primaryFiles[0].path).to.equal(existingFilePath);
		expect(result.secondaryFiles).to.be.empty;
	});
});
