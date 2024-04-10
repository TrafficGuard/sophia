import { workflowContext } from '../agent/workflows';

/**
 * Interface for storing and retriving cached function call results
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
	/** Cache scope */
	scope: 'global' | 'workflow';
}

const DEFAULTS = { retries: 5, backOffMs: 250, version: 1 };

function cacheOpts(opts: Partial<CacheRetryOptions>): CacheRetryOptions {
	return { retries: 5, backOffMs: 250, version: 1, scope: 'workflow', ...opts };
}

export class RetryableError {
	constructor(private originalError: any) {}
}

/**
 * Decorator for adding caching and retries to a class method
 * @param options
 */
export function cacheRetry(options: Partial<CacheRetryOptions> = DEFAULTS) {
	return function cacheRetryDecorator(originalMethod: any, context: ClassMethodDecoratorContext) {
		const methodName = String(context.name);

		async function replacementMethod(this: any, ...args: any[]) {
			const cacheService = workflowContext.getStore().cacheService;
			// console.log(this.constructor.name, methodName, args)
			const cachedValue = await cacheService.get(this.constructor.name, methodName, args);

			if (cachedValue !== undefined) {
				console.debug(`Cached return for ${this.constructor.name}.${methodName}`);
				console.log(cachedValue);
				return cachedValue;
			}
			const cacheOptions = cacheOpts(options);
			for (let attempt = 1; attempt <= cacheOptions.retries; attempt++) {
				console.debug(`${this.constructor.name}.${methodName} retry ${attempt - 1}`);
				try {
					let result = await originalMethod.apply(this, args);
					// convert undefined to null as we use undefined to indicate there's no cached value
					if (result === undefined) result = null;
					await cacheService.set(this.constructor.name, methodName, args, result);
					return result;
				} catch (error) {
					// TODO determine if error is re-tryable
					// NOT retryable ===============
					if (error.message?.includes('Cannot read properties of undefined')) {
						throw error;
					}

					console.error(`Retry decorator error ${error.message}`);
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
