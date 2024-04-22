import { agentContextStorage } from '#agent/agentContext';

/**
 * Interface for storing and retrieving cached function call results
 */
export interface FunctionCacheService {
	get(className: string, method: string, params: any[]): Promise<any>;
	set(className: string, method: string, params: any[], value: any): Promise<void>;
}

interface CacheRetryOptions {
	retries: number;
	backOffMs: number;
	ttlSeconds?: number;
	/** Version of type of the data returned/cached. If you modify the method so that the cached values are incompatible, then increment the version.  */
	version: number;
	/** Cache scope. If no value is provided then the function call results won't be cached. */
	scope?: 'global' | 'agent' | 'execution' | 'user';
}

const DEFAULTS = { retries: 5, backOffMs: 250, version: 1 };

function cacheOpts(opts: Partial<CacheRetryOptions>): CacheRetryOptions {
	return { retries: 5, backOffMs: 250, version: 1, scope: 'execution', ...opts };
}

export class RetryableError extends Error {
	constructor(originalError: Error) {
		super();
		this.name = originalError.name;
		this.message = originalError.message;
		this.stack = originalError.stack;
	}
}

/**
 * Decorator for adding caching and retries to a class method
 * @param options
 */
export function cacheRetry(options: Partial<CacheRetryOptions> = DEFAULTS) {
	return function cacheRetryDecorator(originalMethod: any, context: ClassMethodDecoratorContext) {
		const methodName = String(context.name);

		async function replacementMethod(this: any, ...args: any[]) {
			const cacheService = agentContextStorage.getStore().functionCacheService;
			// console.log(this.constructor.name, methodName, args)
			const cachedValue = await cacheService.get(this.constructor.name, methodName, args);

			if (cachedValue !== undefined) {
				console.debug(`Cached return for ${this.constructor.name}.${methodName}`);
				return cachedValue;
			}
			const cacheOptions = cacheOpts(options);
			for (let attempt = 1; attempt <= cacheOptions.retries; attempt++) {
				console.debug(`${this.constructor.name}.${methodName} retry ${attempt - 1}`);
				try {
					let result = originalMethod.apply(this, args);
					if (typeof result?.then === 'function') result = await result;
					// convert undefined to null as we use undefined to indicate there's no cached value
					if (result === undefined) result = null;
					await cacheService.set(this.constructor.name, methodName, args, result);
					return result;
				} catch (error) {
					if (!(error instanceof RetryableError)) throw error;
					// NOT retryable ===============
					// if (error.message?.includes('Cannot read properties of undefined')) {
					// 	throw error;
					// }

					console.error(`Retry decorator attempt #${attempt} error ${error.message}`);
					if (attempt < cacheOptions.retries) {
						await new Promise((resolve) => setTimeout(resolve, cacheOptions.backOffMs * (attempt * attempt)));
					} else {
						throw error;
					}
				}
			}
		}

		return replacementMethod;
	};
}
