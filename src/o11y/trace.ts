/* eslint-disable semi */
import { Span, SpanStatusCode, Tracer } from '@opentelemetry/api';
import { SugaredTracer, wrapTracer } from './trace/SugaredTracer';

/**
 * Dummy tracer for when tracing is not enabled. As we use more trace methods we will need to fill out this stub further.
 */
const dummyTracer = {
	startSpan: () => {
		return {
			end: () => {},
		};
	},
};

const fakeSpan = {
	setAttribute: () => {},
} as unknown as Span;

let tracer: SugaredTracer | null = null;

/**
 * @param {Tracer} theTracer - Tracer to be set by the trace-init service
 */
export function setTracer(theTracer: Tracer): void {
	tracer = wrapTracer(theTracer);
}

export function getTracer(): SugaredTracer | null {
	return tracer;
}

/**
 * Starts a new independent span. The returned span must have end() called on it.
 * Only use this if your work won’t create any sub-spans.
 * @see https://opentelemetry.io/docs/instrumentation/js/instrumentation/#create-independent-spans
 * @param spanName - The name of the span
 * @returns a new span
 */
export function startSpan(spanName: string): Span {
	return tracer?.startSpan(spanName) ?? <Span>(<unknown>dummyTracer.startSpan());
}

/**
 * Convenience wrapper which uses the appropriate tracer and always ends the parent span.
 * @see https://opentelemetry.io/docs/instrumentation/js/instrumentation/#create-spans
 * @param spanName - The name of the span
 * @param func - Function which performs the work in the span
 * @returns the value from work function
 */
export function withActiveSpan<T>(spanName: string, func: (span: Span) => T): T {
	if (!tracer) {
		return func(fakeSpan);
	}
	return tracer.withActiveSpan(spanName, func);
	// return tracer.startActiveSpan(spanName, async (span: Span) => {
	//   try {
	//     const result = await work();
	//     span.setStatus({ code: SpanStatusCode.OK });
	//     return result;
	//   } catch (e: any) {
	//     span.recordException(e);
	//     span.setStatus({
	//       code: SpanStatusCode.ERROR,
	//       message: e.message,
	//     });
	//     throw e;
	//   } finally {
	//     span.end();
	//   }
	// });
}

/**
 * Only use it if your function won’t create any sub-spans.
 * @param spanName
 * @param func
 */
export function withSpan<T>(spanName: string, func: (span: Span) => T): T {
	if (!tracer) {
		return func(fakeSpan);
	}
	return tracer.withSpan(spanName, func);
}

export function span(originalMethod: any, context: ClassMethodDecoratorContext): any {
	const functionName = String(context.name);
	return function replacementMethod(this: any, ...args: any[]) {
		if (!tracer) {
			return originalMethod.call(this, ...args);
		}
		return tracer.withActiveSpan(functionName, () => {
			return originalMethod.call(this, ...args);
		});
	};
}

/**
 * Decorator for creating a span around a function, which can add the function arguments as
 * attributes to the span. The decorator argument object has the keys as the attribute names
 * and the values as either 1) the function args array index 2) a function which takes the args array as its one argument
 * e.g.
 * @spanWithArgAttributes({ bar: 0, baz: (args) => args[1].toSpanAttributeValue() })
 * public foo(bar: string, baz: ComplexType) {}
 *
 *
 * @param attributeExtractors
 * @returns
 */
export function spanWithArgAttributes(attributeExtractors: any = {}) {
	// NOTE this has been copied to func() in functions.ts and modified
	// Any changes should be kept in sync
	return function spanDecorator(originalMethod: any, context: ClassMethodDecoratorContext): any {
		const functionName = String(context.name);
		return function replacementMethod(this: any, ...args: any[]) {
			if (!tracer) {
				return originalMethod.call(this, ...args);
			}
			return tracer.withActiveSpan(functionName, (span: Span) => {
				for (const [attribute, extractor] of Object.entries(attributeExtractors)) {
					if (typeof extractor === 'number') {
						const value = args[extractor] ?? '';
						// If value is an object type, then iterate over the entries and set the attributes for primitive types
						if (typeof value === 'object') {
							for (const [key, val] of Object.entries(value)) {
								if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
									span.setAttribute(`${attribute}.${key} ${val}`, val);
								}
							}
						} else {
							span.setAttribute(attribute, value);
						}
					} else if (typeof extractor === 'function') {
						span.setAttribute(attribute, extractor(...args));
					} else {
						console.warn(`Invalid attribute extractor for ${functionName}() attribute[${attribute}], must be a number or function`);
					}
				}
				return originalMethod.call(this, ...args);
			});
		};
	};
}

// export function span<This, Args extends any[], Return extends Promise<Return>>(targetFunction: (this: This, ...args: Args) => Return, context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>) {
//   const functionName = String(context.name);

//   function replacementMethod(this: This, ...args: Args): Return {
//     return withSpan<Return>(functionName, () => {
//       return targetFunction.call(this, ...args);
//     }) as Return;
//   }

//   return replacementMethod;
// }
