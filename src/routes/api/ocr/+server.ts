import { extractTextFromImage } from '$lib/server/openrouter';
import { json } from '@sveltejs/kit';
import { Buffer } from 'node:buffer';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const formData = await request.formData();
        const imageFile = formData.get('image') as File | null;

        if (!imageFile) {
            return json({ error: 'Image is required' }, { status: 400 });
        }

        // Convert image to base64
        const buffer = await imageFile.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = imageFile.type || 'image/png';
        const dataUrl = `data:${mimeType};base64,${base64}`;

        const text = await extractTextFromImage(dataUrl);

        return json({ text });
    } catch (error) {
        console.error('OCR error:', error);
        const message =
            error instanceof Error ? error.message : 'Unknown error';
        return json({ error: message }, { status: 500 });
    }
};
