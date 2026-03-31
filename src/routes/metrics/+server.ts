import { register } from 'prom-client';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ request }) => {
    const token = env.METRICS_TOKEN;
    if (!token) return new Response('Metrics disabled', { status: 403 });
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${token}`) return new Response('Unauthorized', { status: 401 });

    const headers = {
        'Content-Type': register.contentType
    };
    const metrics = await register.metrics();
    return new Response(metrics, { headers });
};
