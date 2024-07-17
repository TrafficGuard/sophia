import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const expect = chai.expect;
const should = chai.should();
import fs from 'fs';
import path from 'path';
import { agentContextStorage } from '#agent/agentContext';
import { LocalFileStore } from './localFileStore';

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

  it('should save a file successfully', async () => {
    const localFileStore = new LocalFileStore();
    const filename = 'test-file.txt';
    const contents = 'Test content';

    await localFileStore.saveFile(filename, contents);

    const fullPath = path.join(basePath, filename);
    const savedContents = await fs.promises.readFile(fullPath, 'utf8');
    expect(savedContents).to.equal(contents);
  });

  it('should retrieve file contents successfully', async () => {
    const localFileStore = new LocalFileStore();
    const filename = 'test-file.txt';
    const contents = 'Test content';

    const fullPath = path.join(basePath, filename);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, contents, 'utf8');

    const retrievedContents = await localFileStore.getFile(filename);
    expect(retrievedContents).to.equal(contents);
  });

  it('should list files in the current directory', async () => {
    const localFileStore = new LocalFileStore();
    const testFiles = ['test-file1.txt', 'test-file2.txt'];

    // Create test files
    for (const file of testFiles) {
      const fullPath = path.join(basePath, file);
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, 'Test content', 'utf8');
    }

    const listedFiles = await localFileStore.listFiles();

    for (const file of testFiles) {
      expect(listedFiles).to.include(file);
    }
  });

  it('should throw an error when trying to get a non-existent file', async () => {
    const localFileStore = new LocalFileStore();
    const nonExistentFile = 'non-existent-file.txt';

    await expect(localFileStore.getFile(nonExistentFile)).to.eventually.be.rejectedWith(Error);
  });
});
