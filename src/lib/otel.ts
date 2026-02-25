/**
 * @module lib/otel
 * @description OpenTelemetry (OTel) instrumentation bootstrap.
 *
 * Initialises the OTel Node SDK with:
 * - Auto-instrumentation (HTTP, fetch, MongoDB, etc.)
 * - OTLP HTTP trace exporter (configurable via `OTEL_EXPORTER_OTLP_ENDPOINT`)
 *
 * Import this module at application startup (`instrumentation.ts`) to
 * enable distributed tracing across all API routes and downstream calls.
 *
 * @example
 * ```ts
 * // src/instrumentation.ts
 * export async function register() {
 *   if (process.env.NEXT_RUNTIME === 'nodejs') {
 *     await import('./lib/otel');
 *   }
 * }
 * ```
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import logger from '@/lib/logger';

const log = logger.child({ module: 'otel' });

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

const sdk = new NodeSDK({
    serviceName: 'owbank',
    traceExporter: new OTLPTraceExporter({
        url: `${otlpEndpoint}/v1/traces`,
    }),
    instrumentations: [
        getNodeAutoInstrumentations({
            // Disable noisy instrumentation
            '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
    ],
});

try {
    sdk.start();
    log.info('OpenTelemetry SDK started', { endpoint: otlpEndpoint });
} catch (error) {
    log.error('Failed to start OpenTelemetry SDK', { error: (error as Error).message });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    sdk.shutdown().then(
        () => log.info('OpenTelemetry SDK shut down'),
        (err: Error) => log.error('Error shutting down OTel SDK', { error: err.message }),
    );
});

export { sdk };
