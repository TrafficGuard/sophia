export async function sleep(millis: number) {
	return new Promise((resolve) => {
		setTimeout(() => resolve(null), millis);
	});
}

export async function allSettledAndFulFilled<T>(promises: Promise<T>[]): Promise<T[]> {
	const settled = await Promise.allSettled(promises);
	return getFulfilled(settled);
}

export function getFulfilled<T>(settledResults: PromiseSettledResult<T>[]) {
	return settledResults.filter((result) => result.status === 'fulfilled').map((result) => (result as PromiseFulfilledResult<T>).value);
}

export interface ResolvablePromise<T> extends Promise<T> {
	resolveValue: (value: T) => void;
}
export function resolvablePromise<T>(): ResolvablePromise<T> {
	let resolver: (value: T) => void;
	const promise: any = new Promise((resolve) => {
		resolver = resolve;
	});
	promise.resolveValue = (value: T) => {
		resolver(value);
	};
	return promise;
}

export class Mutex {
	private lock: ResolvablePromise<void> | null = null;

	async run<T>(func: () => Promise<T>): Promise<T> {
		while (this.lock) {
			await this.lock;
		}

		this.lock = resolvablePromise();
		try {
			return func();
		} finally {
			this.lock.resolveValue();
			this.lock = null;
		}
	}
}

export function mutex(originalMethod: any, context: ClassMethodDecoratorContext): any {
	context.addInitializer(function () {
		this[context.name] = this[context.name].bind(this);
	});
	return function replacementMethod(this: any, ...args: any[]) {
		return this.mutex.run(async () => {
			return originalMethod.call(this, ...args);
		});
	};
}

/**
 * Executes a list of promises in batches
 */
export async function batch<T>(promises: Promise<T>[], batchSize: number) {
	const results: T[] = [];
	for (let i = 0; i < promises.length; i += batchSize) {
		const end = Math.min(i + batchSize, promises.length);
		const batch = promises.slice(i, end);
		results.push(...(await Promise.all(batch)));
	}
	return results;
}
