import { describe, it, expect, mock } from 'bun:test';
import { POST } from '../../src/routes/api/analyze/+server';
import {
    ALLOWED_MODELS,
    DEFAULT_ANALYSIS_MODEL
} from '../../src/lib/constants';

const mockAnalyzeSentence = mock(() => Promise.resolve(new ReadableStream()));
mock.module('$lib/server/openrouter', () => ({
    analyzeSentence: mockAnalyzeSentence
}));

const mockIsLimited = mock(() => Promise.resolve(false));
mock.module('$lib/server/limiter', () => ({
    limiter: {
        isLimited: mockIsLimited
    }
}));

const mockLogger = {
    info: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
    warn: mock(() => {})
};
mock.module('$lib/server/logger', () => ({
    analyzeLogger: mockLogger
}));

mock.module('@sveltejs/kit', () => ({
    error: (status: number, message: string) => {
        const err = new Error(message);
        (err as any).status = status;
        (err as any).body = { message };
        throw err;
    }
}));

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

    it('should accept valid model', async () => {
        mockAnalyzeSentence.mockClear();
        const body = {
            sentence: 'test sentence',
            model: DEFAULT_ANALYSIS_MODEL
        };
        const response = await POST(createEvent(body));
        expect(response).toBeInstanceOf(Response);
        expect(mockAnalyzeSentence).toHaveBeenCalledWith(
            'test sentence',
            undefined,
            true,
            DEFAULT_ANALYSIS_MODEL
        );
    });

    it('should accept request without model (use default)', async () => {
        mockAnalyzeSentence.mockClear();
        const body = {
            sentence: 'test sentence'
        };
        const response = await POST(createEvent(body));
        expect(response).toBeInstanceOf(Response);
        expect(mockAnalyzeSentence).toHaveBeenCalledWith(
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
