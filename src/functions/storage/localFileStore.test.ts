import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { LocalFileStore } from './localFileStore';
import * as fs from 'fs';
import * as path from 'path';

chai.use(chaiAsPromised);

describe('LocalFileStore', () => {
  it('should save a file successfully', async () => {
    const localFileStore = new LocalFileStore();
    const filename = 'test-file.txt';
    const contents = 'Test content';

    await localFileStore.saveFile(filename, contents);

    const fullPath = path.resolve(__dirname, filename);
    const savedContents = await fs.promises.readFile(fullPath, 'utf8');
    expect(savedContents).to.equal(contents);

    // Clean up
    await fs.promises.unlink(fullPath);
  });

  it('should retrieve file contents successfully', async () => {
    const localFileStore = new LocalFileStore();
    const filename = 'test-file.txt';
    const contents = 'Test content';

    const fullPath = path.resolve(__dirname, filename);
    await fs.promises.writeFile(fullPath, contents, 'utf8');

    const retrievedContents = await localFileStore.getFile(filename);
    expect(retrievedContents).to.equal(contents);

    // Clean up
    await fs.promises.unlink(fullPath);
  });

  it('should list files in the current directory', async () => {
    const localFileStore = new LocalFileStore();
    const testFiles = ['test-file1.txt', 'test-file2.txt'];

    // Create test files
    for (const file of testFiles) {
      const fullPath = path.resolve(__dirname, file);
      await fs.promises.writeFile(fullPath, 'Test content', 'utf8');
    }

    const listedFiles = await localFileStore.listFiles();

    for (const file of testFiles) {
      expect(listedFiles).to.include(file);
    }

    // Clean up
    for (const file of testFiles) {
      const fullPath = path.resolve(__dirname, file);
      await fs.promises.unlink(fullPath);
    }
  });

  it('should throw an error when trying to get a non-existent file', async () => {
    const localFileStore = new LocalFileStore();
    const nonExistentFile = 'non-existent-file.txt';

    await expect(localFileStore.getFile(nonExistentFile)).to.be.rejected;
  });

  afterEach(async () => {
    const localFileStore = new LocalFileStore();
    const files = await localFileStore.listFiles();
    for (const file of files) {
      if (file.startsWith('test-')) {
        const fullPath = path.resolve(__dirname, file);
        await fs.promises.unlink(fullPath);
      }
    }
  });
});
