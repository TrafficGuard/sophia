# Code styles

- Code defensively, always check for assumptions.
- Use async/await where possible.

- In async functions, await when returning a Promise object, e.g.
```TypeScript
async function doFoo(): Promise<Bar> {
    return await getBarAsync();
}
```

# Unit Testing Principles:

- Focus: Test individual units of code (classes, methods) in isolation.
- Goal: Ensure code correctness, improve developer productivity, and facilitate change.
- Maintainability: Prioritize writing tests that are resistant to breaking changes and easy to understand.

## Guidelines for Writing Effective Unit Tests:

- Unchanging Tests: Aim to write tests that only need to change when the system's requirements change, not due to refactoring or bug fixes.
- Public APIs: Test against the public API of the unit, not internal implementation details. This ensures tests reflect actual user interactions and reduces brittleness.
- State-based Testing: Verify the state of the system after an action, rather than focusing on specific interactions with collaborators (e.g., mocks).
- Completeness and Conciseness: Include all necessary information in the test while avoiding irrelevant details. Use helper methods to manage complexity and improve readability.
- Behavior-Driven: Test individual behaviors of the system, not just methods. Each test should focus on a specific "given" state, "when" action, and "then" expected outcome.
- Clear Naming: Use descriptive names that convey the tested behavior and expected outcome.
- Minimize Logic: Avoid complex logic within tests. Strive for simple, straight-line code that is easy to understand.
- Clear Failure Messages: Provide informative failure messages that clearly explain the expected and actual outcomes.
- DAMP not DRY: Prioritize clarity and meaning over complete avoidance of repetition. Duplication can be acceptable if it improves test understanding.
- Shared Helpers: Utilize helper methods for common test data setup and conceptually simple assertions. Avoid generic "validate" methods that obscure test intent.
