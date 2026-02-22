import { getFurigana } from '$lib/server/kuromoji';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const RequestSchema = z.object({
    lines: z.array(z.string()).min(1).max(500) // 500 lines max per batch
});

export const POST: RequestHandler = async (event) => {
    const { request } = event;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw error(400, 'Invalid JSON body');
    }

    const parseResult = RequestSchema.safeParse(body);
    if (!parseResult.success) {
        throw error(400, 'Invalid request: lines array is required');
    }

    const { lines } = parseResult.data;

    try {
        const batch = await Promise.all(lines.map((line) => getFurigana(line)));
        return json({ batch });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        throw error(500, `Furigana generation failed: ${message}`);
    }
};
