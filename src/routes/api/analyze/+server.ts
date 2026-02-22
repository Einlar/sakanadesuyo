import { analyzeSentence } from '$lib/server/openrouter';
import { limiter } from '$lib/server/limiter';
import { analyzeLogger as log } from '$lib/server/logger';
import { validateModel } from '$lib/server/validation';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
    // Rate limiting logic
    if (await limiter.isLimited(event)) {
        throw error(
            429,
            "Whoa there fast fingers! The AI needs a coffee break. You've hit your limit. Please come back later!"
        );
    }

    const { request } = event;
    const body = await request.json();
    const { sentence, context, model } = body;

    validateModel(model);

    if (!sentence) {
        throw error(400, 'Sentence is required');
    }

    if (sentence.length > 500) {
        throw error(400, 'Sentence is too long');
    }

    try {
        // Extend Bun's idle timeout for streaming requests (default is 10 seconds)
        // This prevents the connection from being closed while waiting for OpenRouter
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const platform = event.platform as any;
        if (platform?.server && platform?.request) {
            try {
                // Set timeout to 5 minutes (300 seconds) for streaming requests
                platform.server.timeout(platform.request, 300);
                log.debug('Extended Bun idle timeout to 300 seconds');
            } catch (timeoutError) {
                log.warn({ error: timeoutError }, 'Could not set Bun timeout');
            }
        }

        log.info(
            { sentenceLength: sentence.length, model },
            'Starting analysis'
        );
        const stream = await analyzeSentence(sentence, context, true, model);

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        });
    } catch (e) {
        log.error(
            {
                error: e,
                message: e instanceof Error ? e.message : 'Unknown error',
                stack: e instanceof Error ? e.stack : undefined,
                cause: e instanceof Error ? e.cause : undefined
            },
            'Analysis error'
        );

        const message = e instanceof Error ? e.message : 'Unknown error';
        // If it's already a SvelteKit error, rethrow it
        if (e && typeof e === 'object' && 'status' in e && 'body' in e) {
            throw e;
        }
        throw error(500, `Internal Server Error: ${message}`);
    }
};
