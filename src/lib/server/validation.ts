import models from '../data/models.json' with { type: 'json' };
import { OCR_MODEL } from '../constants';
import { error } from '@sveltejs/kit';

const ALLOWED_MODEL_IDS = new Set([...models.map((m) => m.id), OCR_MODEL]);

/**
 * Validates that the provided model ID is allowed.
 * Throws a 400 error if the model is invalid.
 * If model is undefined or null, it is considered valid (will use default).
 */
export function validateModel(model: unknown): void {
    if (!model) return;

    if (typeof model !== 'string' || !ALLOWED_MODEL_IDS.has(model)) {
        throw error(400, 'Invalid model selected');
    }
}
