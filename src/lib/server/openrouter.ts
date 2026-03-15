import { env } from '$env/dynamic/private';
import { DEFAULT_ANALYSIS_MODEL, OCR_MODEL } from '$lib/constants';
import { analyzeItemsCount, analyzeSentenceLength } from '$lib/metrics';
import { SongAnalysisResponseSchema } from '$lib/schemas';
import type { AnalyzeSongResponse, SentenceAnalysis } from '$lib/types';
import { OpenRouter } from '@openrouter/sdk';
import type { ResponseFormatJSONSchema } from '@openrouter/sdk/models';
import { streamLogger as log } from './logger';
import {
    HEADERS,
    PROVIDER_SETTINGS,
    RESPONSE_FORMAT,
    SONG_ANALYSIS_RESPONSE_FORMAT,
    buildSongAnalysisSystemPrompt,
    buildSongAnalysisUserPrompt,
    buildSystemPrompt,
    buildUserPrompt,
    parseResponse
} from './prompts';

type OpenRouterRequestOptions = {
    model: string;
    messages: { role: 'system' | 'user'; content: string | any[] }[];
    responseFormat?: ResponseFormatJSONSchema;
    stream: boolean;
    onStreamComplete?: (fullContent: string) => void;
};

/**
 * Generic helper to handle OpenRouter API requests (streaming and non-streaming).
 */
async function makeOpenRouterRequest<T>(
    options: OpenRouterRequestOptions,
    parser?: (content: string) => T
): Promise<T | ReadableStream<Uint8Array>> {
    const { model, messages, responseFormat, stream, onStreamComplete } =
        options;

    if (!env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const openRouter = new OpenRouter({
        apiKey: env.OPENROUTER_API_KEY
    });

    // Determine max tokens and temp based on use case hints (presence of responseFormat usually implies analysis)
    const maxTokens = responseFormat ? 8192 : model === OCR_MODEL ? 1024 : 4096;
    const temperature = model === OCR_MODEL ? 0.1 : 0.3;

    try {
        if (stream) {
            const streamResponse = await openRouter.chat.send(
                {
                    chatGenerationParams: {
                        model,
                        messages,
                        temperature,
                        maxTokens,
                        stream: true,
                        provider: PROVIDER_SETTINGS,
                        responseFormat
                    }
                },
                { headers: HEADERS }
            );

            let cancelled = false;

            return new ReadableStream({
                async start(controller) {
                    let fullContent = '';
                    let chunkCount = 0;
                    const startTime = Date.now();

                    log.debug('Starting stream');

                    try {
                        for await (const chunk of streamResponse) {
                            if (cancelled) {
                                log.debug('Detected cancellation');
                                return;
                            }
                            chunkCount++;
                            // @ts-ignore - SDK types might be missing ChatCompletionChunk export or structure mismatch
                            const content = (chunk as any).choices?.[0]?.delta
                                ?.content;

                            if (content && typeof content === 'string') {
                                fullContent += content;
                                try {
                                    controller.enqueue(
                                        new TextEncoder().encode(content)
                                    );
                                } catch (err) {
                                    // Controller closed
                                    return;
                                }
                            }
                        }

                        log.debug(
                            { elapsedMs: Date.now() - startTime },
                            'Stream completed'
                        );

                        if (onStreamComplete) {
                            try {
                                onStreamComplete(fullContent);
                            } catch (e) {
                                log.warn(
                                    { error: e },
                                    'Failed to execute onStreamComplete'
                                );
                            }
                        }

                        try {
                            controller.close();
                        } catch (e) {}
                    } catch (e) {
                        log.error({ error: e }, 'Error during stream');
                        controller.error(e);
                    }
                },
                cancel() {
                    cancelled = true;
                }
            });
        } else {
            const response = await openRouter.chat.send(
                {
                    chatGenerationParams: {
                        model,
                        messages,
                        temperature,
                        maxTokens,
                        stream: false,
                        provider: PROVIDER_SETTINGS,
                        responseFormat,
                        plugins: [{ id: 'response-healing' }]
                    }
                },
                { headers: HEADERS }
            );

            const content = response.choices?.[0]?.message?.content;
            if (!content) throw new Error('No content from OpenRouter');

            const resultString = content as string;
            if (parser) {
                return parser(resultString);
            }
            return resultString as unknown as T;
        }
    } catch (e) {
        log.error({ error: e }, 'OpenRouter Request Failed');
        throw e;
    }
}

/**
 * Analyzes a Japanese sentence using the OpenRouter API.
 */
export async function analyzeSentence(
    sentence: string,
    context: string | undefined,
    stream: true,
    model?: string
): Promise<ReadableStream<Uint8Array>>;
export async function analyzeSentence(
    sentence: string,
    context?: string,
    stream?: false,
    model?: string
): Promise<SentenceAnalysis>;
export async function analyzeSentence(
    sentence: string,
    context?: string,
    stream: boolean = false,
    model: string = DEFAULT_ANALYSIS_MODEL
): Promise<SentenceAnalysis | ReadableStream<Uint8Array>> {
    analyzeSentenceLength.observe(sentence.length);

    return makeOpenRouterRequest<SentenceAnalysis>(
        {
            model,
            messages: [
                { role: 'system', content: buildSystemPrompt() },
                { role: 'user', content: buildUserPrompt(sentence, context) }
            ],
            stream,
            responseFormat: RESPONSE_FORMAT,
            onStreamComplete: (fullContent) => {
                const analysis = parseResponse(fullContent);
                analyzeItemsCount.observe(analysis.terms.length);
            }
        },
        (content) => {
            const result = parseResponse(content);
            analyzeItemsCount.observe(result.terms.length);
            return result;
        }
    );
}

/**
 * Extracts Japanese text from an image using the OpenRouter API.
 */
export async function extractTextFromImage(dataUrl: string): Promise<string> {
    const result = await makeOpenRouterRequest<string>(
        {
            model: OCR_MODEL,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Extract all Japanese text from this image. Return ONLY the Japanese text, nothing else. If there are multiple lines, join them with spaces.'
                        },
                        {
                            type: 'image_url',
                            imageUrl: { url: dataUrl }
                        }
                    ]
                }
            ],
            stream: false
        },
        (content) =>
            typeof content === 'string'
                ? content.trim()
                : JSON.stringify(content).trim()
    );

    return result as string;
}

/**
 * Analyzes multiple lines from a song using the OpenRouter API.
 */
export async function analyzeSongLines(
    fullSong: string,
    lines: string[],
    stream: true,
    model?: string
): Promise<ReadableStream<Uint8Array>>;
export async function analyzeSongLines(
    fullSong: string,
    lines: string[],
    stream?: false,
    model?: string
): Promise<AnalyzeSongResponse>;
export async function analyzeSongLines(
    fullSong: string,
    lines: string[],
    stream: boolean = false,
    model: string = DEFAULT_ANALYSIS_MODEL
): Promise<AnalyzeSongResponse | ReadableStream<Uint8Array>> {
    const totalLength = lines.reduce((acc, line) => acc + line.length, 0);
    analyzeSentenceLength.observe(totalLength);

    const parser = (content: string) => {
        const cleaned = content
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        const result = SongAnalysisResponseSchema.parse(JSON.parse(cleaned));
        return result;
    };

    return makeOpenRouterRequest<AnalyzeSongResponse>(
        {
            model,
            messages: [
                { role: 'system', content: buildSongAnalysisSystemPrompt() },
                {
                    role: 'user',
                    content: buildSongAnalysisUserPrompt(fullSong, lines)
                }
            ],
            stream,
            responseFormat: SONG_ANALYSIS_RESPONSE_FORMAT,
            onStreamComplete: (fullContent) => {
                const result = parser(fullContent);
                const totalTerms = result.analyses.reduce(
                    (acc, analysis) => acc + analysis.terms.length,
                    0
                );
                analyzeItemsCount.observe(totalTerms);
            }
        },
        (content) => {
            const result = parser(content);
            const totalTerms = result.analyses.reduce(
                (acc, analysis) => acc + analysis.terms.length,
                0
            );
            analyzeItemsCount.observe(totalTerms);
            return result;
        }
    );
}
