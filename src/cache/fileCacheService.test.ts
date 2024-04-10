// import { expect } from 'chai';
// import * as fs from 'fs/promises';
// import * as path from 'path';
// import { FileCacheService } from './fileCacheService'; // Path to your cacheService file
//
// describe('CacheService', () => {
//   const baseFolderPath = path.join(__dirname, 'test_cache'); // Temporary cache folder
//
//   beforeEach(async () => {
//     await fs.rm(baseFolderPath, { recursive: true, force: true }); // Clean cache before each test
//   });
//
//   afterEach(async () => {
//     await fs.rm(baseFolderPath, { recursive: true, force: true }); // Clean cache after each test
//   });
//
//   it('should store and retrieve values', async () => {
//     const cacheService = new FileCacheService(baseFolderPath);
//     const cacheKey = 'test_key';
//     const value = { data: 'hello' };
//
//     await cacheService.set(cacheKey, value, 0);
//     const retrievedValue = await cacheService.get(cacheKey);
//
//     expect(retrievedValue).to.deep.equal(value);
//   });
//
//   it('should handle non-existent keys', async () => {
//     const cacheService = new FileCacheService(baseFolderPath);
//     const cacheKey = 'non_existent_key';
//
//     const retrievedValue = await cacheService.get(cacheKey);
//
//     expect(retrievedValue).to.be.undefined;
//   });
//
//   it.skip('should respect TTL', async () => {
//     const cacheService = new FileCacheService(baseFolderPath);
//     const cacheKey = 'ttl_key';
//     const value = { data: 'world' };
//
//     await cacheService.set(cacheKey, value, 1); // Set TTL to 1 second
//     await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for TTL to expire
//
//     const retrievedValue = await cacheService.get(cacheKey);
//
//     expect(retrievedValue).to.be.undefined;
//   });
//
//   it('should handle cache folder creation errors', async () => {
//     const invalidFolderPath = path.join(__dirname, 'invalid_folder');
//     const cacheService = new FileCacheService(invalidFolderPath);
//     const cacheKey = 'error_key';
//     const value = { data: 'error' };
//
//     try {
//       await cacheService.set(cacheKey, value, 0);
//       expect.fail('Should have thrown an error');
//     } catch (error) {
//       expect(error.message).to.contain('ENOENT'); // Expect file system error
//     }
//   });
// });
