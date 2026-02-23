import { analyzeSongLines } from '$lib/server/openrouter';
import { limiter } from '$lib/server/limiter';
import { analyzeLogger as log } from '$lib/server/logger';
import { validateModel } from '$lib/server/validation';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST endpoint for batched song analysis.
 * Accepts full song context and specific lines to analyze.
 */
export const POST: RequestHandler = async (event) => {
    // Rate limiting
    if (await limiter.isLimited(event)) {
        error(
            429,
            "You're analyzing too fast! Please wait a moment before continuing."
        );
    }

    const { request } = event;
    const body = await request.json();
    const { fullSong, lines, batchIndex, model } = body;

    validateModel(model);

    // Validation
    if (!fullSong || typeof fullSong !== 'string') {
        error(400, 'fullSong is required and must be a string');
    }

    if (!Array.isArray(lines) || lines.length === 0) {
        error(400, 'lines must be a non-empty array');
    }

    if (lines.length > 10) {
        error(400, 'Maximum 10 lines per batch');
    }

    // Check total input size (full song + lines)
    const totalChars = fullSong.length + lines.join('').length;
    if (totalChars > 10000) {
        error(400, 'Total input too large');
    }

    try {
        // Extend Bun's idle timeout for streaming requests
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const platform = event.platform as any;
        if (platform?.server && platform?.request) {
            try {
                platform.server.timeout(platform.request, 300);
                log.debug('Extended Bun idle timeout to 300 seconds');
            } catch (timeoutError) {
                log.warn({ error: timeoutError }, 'Could not set Bun timeout');
            }
        }

        log.info(
            { lineCount: lines.length, batchIndex, model },
            'Starting song analysis batch'
        );

        const stream = await analyzeSongLines(fullSong, lines, true, model);

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
                stack: e instanceof Error ? e.stack : undefined
            },
            'Song analysis error'
        );

        const message = e instanceof Error ? e.message : 'Unknown error';
        if (e && typeof e === 'object' && 'status' in e && 'body' in e) {
            throw e;
        }
        error(500, `Internal Server Error: ${message}`);
    }
};
