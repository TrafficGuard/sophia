import { countTokens } from '#llm/tokens';

// node_modules is read-only for the typedai user in prod, so download in the docker build
countTokens('hi')
	.catch((err) => {
		console.error('Failed to download tiktoken model');
		console.error(err);
	})
	.finally(() => console.log('Done'));
