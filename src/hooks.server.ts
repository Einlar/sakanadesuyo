import { collectDefaultMetrics, Histogram, Counter } from 'prom-client';
import type { Handle } from '@sveltejs/kit';

// Initialize default metrics (CPU, RAM, etc.)
collectDefaultMetrics();

// Define custom HTTP metrics
const httpRequestDurationMicroseconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

export const handle: Handle = async ({ event, resolve }) => {
    const start = performance.now();

    const response = await resolve(event);

    const duration = (performance.now() - start) / 1000;
    const route = event.route.id || 'unknown';
    const method = event.request.method;
    const status_code = response.status.toString();

    httpRequestDurationMicroseconds
        .labels(method, route, status_code)
        .observe(duration);
    httpRequestsTotal.labels(method, route, status_code).inc();

    return response;
};
