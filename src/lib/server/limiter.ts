import { RateLimiter } from 'sveltekit-rate-limiter/server';
import { env } from '$env/dynamic/private';

const limit = env.RATE_LIMIT_OVERRIDE ? parseInt(env.RATE_LIMIT_OVERRIDE) : 30;

export const limiter = new RateLimiter({
    // A rate is defined as [number, unit]
    IP: [limit, 'h'], // requests per hour per IP
    IPUA: [limit, 'h'] // requests per hour per IP + User Agent
});
