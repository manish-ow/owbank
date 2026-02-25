/**
 * @module instrumentation
 * @description Next.js instrumentation hook for OTel and metrics.
 *
 * This file is automatically loaded by Next.js at startup when
 * `instrumentation.ts` exists in the `src/` directory.
 * Only initialises OTel in the Node.js runtime (not Edge).
 */

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./lib/otel');
    }
}
