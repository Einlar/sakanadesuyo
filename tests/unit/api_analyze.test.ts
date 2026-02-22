import { describe, it, expect, mock, beforeAll } from 'bun:test';
import { POST } from '../../src/routes/api/analyze/+server';
import { DEFAULT_ANALYSIS_MODEL } from '../../src/lib/constants';

// Mocks
import { analyzeSentence } from '../mocks/openrouter';

// We need to mock validation to ensure it passes or fails as expected
// But since validation logic imports a JSON file, we might want to test it implicitly
// by letting it run. The JSON file exists in src/lib/data/models.json.
// However, our mocks might need adjustment if we want to isolate units.
// Let's try to let validation run for real, as it's a pure function dependent on static data.

// Ensure models.json is readable or mocked if needed.
// Since we run in Bun, JSON imports work.

describe('POST /api/analyze', () => {
    const createEvent = (body: any) =>
        ({
            request: {
                json: () => Promise.resolve(body)
            },
            platform: {
                server: {
                    timeout: mock(() => {})
                },
                request: {}
            }
        }) as any;

    it('should accept valid model (default)', async () => {
        analyzeSentence.mockClear();
        const body = {
            sentence: 'test sentence',
            model: DEFAULT_ANALYSIS_MODEL
        };
        const response = await POST(createEvent(body));
        expect(response).toBeInstanceOf(Response);
        expect(analyzeSentence).toHaveBeenCalledWith(
            'test sentence',
            undefined,
            true,
            DEFAULT_ANALYSIS_MODEL
        );
    });

    it('should accept valid model from json (e.g. gpt-5-mini)', async () => {
        analyzeSentence.mockClear();
        const body = {
            sentence: 'test sentence',
            model: 'openai/gpt-5-mini'
        };
        const response = await POST(createEvent(body));
        expect(response).toBeInstanceOf(Response);
        expect(analyzeSentence).toHaveBeenCalledWith(
            'test sentence',
            undefined,
            true,
            'openai/gpt-5-mini'
        );
    });

    it('should accept request without model (use default)', async () => {
        analyzeSentence.mockClear();
        const body = {
            sentence: 'test sentence'
        };
        const response = await POST(createEvent(body));
        expect(response).toBeInstanceOf(Response);
        expect(analyzeSentence).toHaveBeenCalledWith(
            'test sentence',
            undefined,
            true,
            undefined
        );
    });

    it('should reject invalid model with 400', async () => {
        const body = {
            sentence: 'test sentence',
            model: 'invalid-model'
        };

        try {
            await POST(createEvent(body));
            throw new Error('Should have thrown');
        } catch (e: any) {
            expect(e.status).toBe(400);
            expect(e.message).toBe('Invalid model selected');
        }
    });

    it('should reject missing sentence', async () => {
        const body = {
            model: DEFAULT_ANALYSIS_MODEL
        };
        try {
            await POST(createEvent(body));
            throw new Error('Should have thrown');
        } catch (e: any) {
            expect(e.status).toBe(400);
            expect(e.message).toBe('Sentence is required');
        }
    });
});
