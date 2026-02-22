import pino from 'pino';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import 'pino-loki';

/**
 * Configure transports for pino.
 * We use pino-pretty in development and pino-loki in production (if configured).
 */
const targets: pino.TransportTargetOptions[] = [];

// Add console target
if (dev) {
    targets.push({
        target: 'pino-pretty',
        level: env.LOG_LEVEL || 'debug',
        options: {
            colorize: true,
            ignore: 'pid,hostname'
        }
    });
} else {
    targets.push({
        target: 'pino/file',
        level: env.LOG_LEVEL || 'info',
        options: { destination: 1 } // stdout
    });
}

// Add Loki target if LOKI_HOST is configured
if (env.LOKI_HOST) {
    targets.push({
        target: 'pino-loki',
        level: env.LOG_LEVEL || 'info',
        options: {
            host: env.LOKI_HOST,
            labels: { app: 'sakanadesuyo' },
            batching: true,
            interval: 5
        }
    });
}

/**
 * Application logger using pino.
 *
 * Log levels (from most to least verbose):
 * - trace: Very detailed debugging info
 * - debug: Debugging info for development
 * - info: General information (default in production)
 * - warn: Warning conditions
 * - error: Error conditions
 * - fatal: Critical errors
 */
export const logger = pino(
    {
        level: env.LOG_LEVEL || (dev ? 'debug' : 'info')
    },
    pino.transport({ targets })
);

// Create child loggers for different modules
export const streamLogger = logger.child({ module: 'stream' });
export const analyzeLogger = logger.child({ module: 'analyze' });
export const openrouterLogger = logger.child({ module: 'openrouter' });
