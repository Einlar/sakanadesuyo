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
    analyzeSentence: mockOpenRouter.analyzeSentence
}));
mock.module('$lib/server/limiter', () => mockLimiter);
mock.module('$lib/server/logger', () => mockLogger);
mock.module('@sveltejs/kit', () => mockKit);
mock.module('$env/dynamic/private', () => mockEnv);
mock.module('$app/environment', () => mockAppEnv);

// Import SUT after mocking
import { POST } from '../../src/routes/api/analyze/+server';
import { DEFAULT_ANALYSIS_MODEL } from '../../src/lib/constants';

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
        mockOpenRouter.analyzeSentence.mockClear();
        const body = {
            sentence: 'test sentence',
            model: DEFAULT_ANALYSIS_MODEL
        };
        const response = await POST(createEvent(body));
        expect(response).toBeInstanceOf(Response);
        expect(mockOpenRouter.analyzeSentence).toHaveBeenCalledWith(
            'test sentence',
            undefined,
            true,
            DEFAULT_ANALYSIS_MODEL
        );
    });

    it('should accept valid model from json (e.g. gpt-5-mini)', async () => {
        mockOpenRouter.analyzeSentence.mockClear();
        const body = {
            sentence: 'test sentence',
            model: 'openai/gpt-5-mini'
        };
        const response = await POST(createEvent(body));
        expect(response).toBeInstanceOf(Response);
        expect(mockOpenRouter.analyzeSentence).toHaveBeenCalledWith(
            'test sentence',
            undefined,
            true,
            'openai/gpt-5-mini'
        );
    });

    it('should accept request without model (use default)', async () => {
        mockOpenRouter.analyzeSentence.mockClear();
        const body = {
            sentence: 'test sentence'
        };
        const response = await POST(createEvent(body));
        expect(response).toBeInstanceOf(Response);
        expect(mockOpenRouter.analyzeSentence).toHaveBeenCalledWith(
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
