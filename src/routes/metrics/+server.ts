import { register } from 'prom-client';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ request }) => {
    // Optional security: if METRICS_TOKEN is set, require it
    if (env.METRICS_TOKEN) {
        const authHeader = request.headers.get('Authorization');
        // Check for "Bearer <token>"
        if (!authHeader || authHeader !== `Bearer ${env.METRICS_TOKEN}`) {
            return new Response('Unauthorized', { status: 401 });
        }
    }

    const headers = {
        'Content-Type': register.contentType
    };
    const metrics = await register.metrics();
    return new Response(metrics, { headers });
};
