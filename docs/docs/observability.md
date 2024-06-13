# Observability

## Logging

[Pino](https://getpino.io/) is used for logging and is instrumented to include the trace/span ids.

`import { logger } from '#o11y/logger';`

In the .env file the configuration variables are:
```
LOG_LEVEL=debug
# Pino pretty logging. Set to false for structured JSON logging when running in server mode
LOG_PRETTY=true
```

Any TypeScript file which is used as an application entry point should being with

`import '#fastify/trace-init/trace-init';`

to ensure the logger is instrumented.

## OpenTelemetry tracing

Tracing is implemented with OpenTelemetry. The environment variables which configure tracing are:
```
TRACE_AGENT_ENABLED=true
TRACE_SERVICE_NAME=nous
TRACE_AUTO_INSTRUMENT=true
TRACE_SAMPLE_RATE=1
```

The `TRACE_AUTO_INSTRUMENT` variable enables the trace instrumentation from the [@opentelemetry/auto-instrumentations-node](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) package.

The default exporter is for Google Cloud Trace.  The Google Cloud user/service account will require the Cloud Trace Agent role
(roles/cloudtrace.agent)

![Sample trace in Google Cloud](https://public.trafficguard.ai/nous/trace.png){ align=left }

If you're not using Google Cloud or another cloud provider with their own tracing service, then we would recommend [Honeycomb](https://www.honeycomb.io/) which has a generous free tier.

The `@func` annotation also creates a span for a function call, in addition to registering its function definition.

The `@span` annotation is available to create trace spans for any other class methods.

For non-class functions, or when you require more control over the span, the `withActiveSpan` method provides a callback with a `Span` object.

## UI

The UI provides
