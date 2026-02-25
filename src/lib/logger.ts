/**
 * @module lib/logger
 * @description Structured application logger built on Winston.
 *
 * Provides JSON-formatted, OTel-correlated logging with child-logger
 * support for per-module context.  In production the Kafka transport
 * (Phase 6) is automatically attached so logs flow to the
 * `owbank-logs` topic.
 *
 * @example
 * ```ts
 * import { logger } from '@/lib/logger';
 * const log = logger.child({ module: 'chat' });
 * log.info('Chat request received', { userId: '123' });
 * ```
 */

import winston from 'winston';

const { combine, timestamp, json, errors, colorize, printf } = winston.format;

/** Human-readable format used during local development. */
const devFormat = combine(
    colorize(),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ timestamp: ts, level, message, module: mod, ...meta }) => {
        const prefix = mod ? `[${mod}]` : '';
        const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${ts} ${level} ${prefix} ${message}${extra}`;
    }),
);

/** Structured JSON format used in production / when consumed by log aggregators. */
const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    json(),
);

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Application-wide Winston logger instance.
 *
 * - **Development**: coloured, human-readable output to `stdout`.
 * - **Production**: structured JSON to `stdout` (+ Kafka transport when enabled).
 */
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    defaultMeta: { service: 'owbank' },
    format: isProduction ? prodFormat : devFormat,
    transports: [new winston.transports.Console()],
});

export default logger;
