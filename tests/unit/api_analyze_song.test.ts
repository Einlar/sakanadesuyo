import { describe, it, expect, mock, beforeAll } from 'bun:test';

// Mocks
const mockOpenRouter = await import('../mocks/openrouter');
const mockLimiter = await import('../mocks/limiter');
const mockLogger = await import('../mocks/logger');
const mockKit = await import('../mocks/sveltejs-kit');
const mockEnv = await import('../mocks/env');
const mockAppEnv = await import('../mocks/app-env');

// Mock modules
mock.module('$lib/server/openrouter', () => ({
    analyzeSongLines: mockOpenRouter.analyzeSongLines
}));
mock.module('$lib/server/limiter', () => mockLimiter);
mock.module('$lib/server/logger', () => mockLogger);
mock.module('@sveltejs/kit', () => mockKit);
mock.module('$env/dynamic/private', () => mockEnv);
mock.module('$app/environment', () => mockAppEnv);

// Import SUT after mocking
import { POST } from '../../src/routes/api/analyze-song/+server';
import { DEFAULT_ANALYSIS_MODEL } from '../../src/lib/constants';

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
        mockOpenRouter.analyzeSongLines.mockClear();
        const body = {
            fullSong: 'test full song',
            lines: ['line 1', 'line 2'],
            model: 'openai/gpt-5-mini'
        };
        const response = await POST(createEvent(body));
        expect(response).toBeInstanceOf(Response);
        expect(mockOpenRouter.analyzeSongLines).toHaveBeenCalledWith(
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
