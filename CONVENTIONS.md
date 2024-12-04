# General code standards 

Do not update project level configuration files unless explicitly instructed to.

Use async/await where possible

Test exceptional cases first and return/throw early.

Never edit files name CONVENTIONS.md or .cursorrules

# Test code standards

Unit test files should be in the same directory as the source file.

Any usage of chai-as-promised should use async/await
```
it('should work well with async/await', async () => {
    (await Promise.resolve(42)).should.equal(42)
    await Promise.reject(new Error()).should.be.rejectedWith(Error);
});
```

# Tool/function classes

Function classes with the @funcClass(__filename) must only have the default constructor.

Always use the Filesystem class in src/functions/storage/filesystem.ts to read/search/write to the local filesystem.
