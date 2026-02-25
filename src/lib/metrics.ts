/**
 * @module lib/metrics
 * @description Prometheus metrics registry for application observability.
 *
 * Exposes:
 * - Default Node.js metrics (event-loop lag, memory, GC, etc.)
 * - Custom banking-specific counters and histograms
 *
 * Metrics are served via the `/api/metrics` route (see Phase 6 route).
 *
 * @example
 * ```ts
 * import { httpRequestDuration, chatActionCounter } from '@/lib/metrics';
 * chatActionCounter.inc({ action: 'GET_BALANCE' });
 * ```
 */

import client from 'prom-client';

/** The singleton Prometheus registry for the application. */
export const register = new client.Registry();

// Collect default Node.js / process metrics
client.collectDefaultMetrics({ register });

/**
 * HTTP request duration histogram (seconds).
 * Labels: method, route, status_code.
 */
export const httpRequestDuration = new client.Histogram({
    name: 'owbank_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [register],
});

/**
 * AI chat action counter.
 * Labels: action (e.g. GET_BALANCE, TRANSFER, APPLY_CREDIT_CARD).
 */
export const chatActionCounter = new client.Counter({
    name: 'owbank_chat_action_total',
    help: 'Total AI chat actions executed',
    labelNames: ['action'] as const,
    registers: [register],
});

/**
 * AI chat response latency (seconds).
 * Labels: session_type (banking, onboarding).
 */
export const chatLatency = new client.Histogram({
    name: 'owbank_chat_latency_seconds',
    help: 'Latency of AI chat responses in seconds',
    labelNames: ['session_type'] as const,
    buckets: [0.5, 1, 2, 3, 5, 10, 20],
    registers: [register],
});

/**
 * Active user sessions gauge.
 */
export const activeSessionsGauge = new client.Gauge({
    name: 'owbank_active_sessions',
    help: 'Number of active user sessions',
    registers: [register],
});

/**
 * Transfer volume counter (monetary amount).
 * Labels: currency.
 */
export const transferVolume = new client.Counter({
    name: 'owbank_transfer_volume_total',
    help: 'Total monetary volume of transfers',
    labelNames: ['currency'] as const,
    registers: [register],
});

/**
 * Error counter.
 * Labels: module, error_type.
 */
export const errorCounter = new client.Counter({
    name: 'owbank_errors_total',
    help: 'Total application errors',
    labelNames: ['module', 'error_type'] as const,
    registers: [register],
});

export default register;
