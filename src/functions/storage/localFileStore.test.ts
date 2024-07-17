import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import fs from 'fs';
import path from 'path';
import { agentContextStorage } from '#agent/agentContext';
import { LocalFileStore } from './localFileStore';

chai.use(chaiAsPromised);
const assert = chai.assert;

function setupMockAgentContext(agentId: string) {
  return agentContextStorage.run({ agentId } as any, () => {});
}

describe('LocalFileStore', () => {
  const testAgentId = 'test-agent-id';
  const basePath = path.join(process.cwd(), '.nous', 'filestore', testAgentId);

  beforeEach(() => {
    setupMockAgentContext(testAgentId);
  });

  afterEach(async () => {
    await fs.promises.rm(basePath, { recursive: true, force: true });
  });

  it('should save a file successfully with metadata', async () => {
    const localFileStore = new LocalFileStore();
    const filename = 'test-file.txt';
    const contents = 'Test content';
    const description = 'Test file description';

    await localFileStore.saveFile(filename, contents, description);

    const fullPath = path.join(basePath, filename);
    const savedContents = await fs.promises.readFile(fullPath, 'utf8');
    expect(savedContents).to.equal(contents);

    const metadataPath = path.join(basePath, '.metadata.json');
    const metadataContents = await fs.promises.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataContents);
    expect(metadata[filename]).to.exist;
    expect(metadata[filename].description).to.equal(description);
  });

  it('should retrieve file contents successfully', async () => {
    const localFileStore = new LocalFileStore();
    const filename = 'test-file.txt';
    const contents = 'Test content';
    const description = 'Test file description';

    await localFileStore.saveFile(filename, contents, description);

    const retrievedContents = await localFileStore.getFile(filename);
    expect(retrievedContents).to.equal(contents);
  });

  it('should list files with metadata', async () => {
    const localFileStore = new LocalFileStore();
    const testFiles = [
      { name: 'test-file1.txt', content: 'Test content 1', description: 'Description 1' },
      { name: 'test-file2.txt', content: 'Test content 2', description: 'Description 2' },
    ];

    // Create test files
    for (const file of testFiles) {
      await localFileStore.saveFile(file.name, file.content, file.description);
    }

    const listedFiles = await localFileStore.listFiles();

    expect(listedFiles).to.have.lengthOf(testFiles.length);
    for (const file of testFiles) {
      const listedFile = listedFiles.find(f => f.filename === file.name);
      expect(listedFile).to.exist;
      expect(listedFile.description).to.equal(file.description);
      expect(listedFile.sizeKb).to.match(/^\d+\.\d{2}$/);
      expect(listedFile.lastUpdated).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
  });

  it('should throw an error when trying to get a non-existent file', async () => {
    const localFileStore = new LocalFileStore();
    const nonExistentFile = 'non-existent-file.txt';

    await assert.isRejected(localFileStore.getFile(nonExistentFile), Error);
  });
});
