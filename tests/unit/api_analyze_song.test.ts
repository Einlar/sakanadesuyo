import { describe, it, expect, mock, beforeAll } from 'bun:test';
import { POST } from '../../src/routes/api/analyze-song/+server';
import { DEFAULT_ANALYSIS_MODEL } from '../../src/lib/constants';

// Mocks
import { analyzeSongLines } from '../mocks/openrouter';

describe('POST /api/analyze-song', () => {
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

    it('should accept valid model from json', async () => {
        analyzeSongLines.mockClear();
        const body = {
            fullSong: 'test full song',
            lines: ['line 1', 'line 2'],
            model: 'openai/gpt-5-mini'
        };
        const response = await POST(createEvent(body));
        expect(response).toBeInstanceOf(Response);
        expect(analyzeSongLines).toHaveBeenCalledWith(
            'test full song',
            ['line 1', 'line 2'],
            true,
            'openai/gpt-5-mini'
        );
    });

    it('should reject invalid model with 400', async () => {
        const body = {
            fullSong: 'test full song',
            lines: ['line 1'],
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
});
