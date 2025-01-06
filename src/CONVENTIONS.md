# Backend code standards

## Test code standards

Unit test files must be in the same directory as the source file.

Any usage of chai-as-promised should use async/await
```
it('should work well with async/await', async () => {
    (await Promise.resolve(42)).should.equal(42)
    await Promise.reject(new Error()).should.be.rejectedWith(Error);
});
```

Avoid mocking where possible. Prefer to test the actual implementation.

## Tool/function classes

Function classes with the @funcClass(__filename) must only have the default constructor.

Always use the Filesystem class in src/functions/storage/filesystem.ts to read/search/write to the local filesystem.
