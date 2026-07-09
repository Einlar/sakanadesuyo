import { parse } from 'jsonriver';
import type {
    AnalyzedTerm,
    AnalyzeSongResponse,
    FuriganaSegment,
    LineAnalysis,
    OCRResponse,
    SentenceAnalysis
} from './types';

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public data?: any
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

class ApiClient {
    private async request<T>(
        url: string,
        options: RequestInit = {}
    ): Promise<T> {
        const response = await fetch(url, options);
        if (!response.ok) {
            const error = await response.json();
            throw new ApiError(
                error.error || `Request failed with status ${response.status}`,
                response.status,
                error
            );
        }
        return response.json();
    }

    /**
     * POSTs JSON to an endpoint that streams back a single JSON document,
     * progressively parsed with jsonriver. Returns the stream of document
     * snapshots plus a WeakMap marking which nested objects have been
     * fully received.
     */
    private async streamJson(
        url: string,
        body: unknown,
        errorPrefix: string,
        signal?: AbortSignal
    ): Promise<{
        snapshots: AsyncIterable<unknown>;
        completed: WeakMap<object, boolean>;
    }> {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal
        });

        if (!response.ok || !response.body) {
            let errorMessage = `${errorPrefix} failed with status ${response.status}`;
            let errorData;
            try {
                errorData = await response.json();
                if (errorData.message) {
                    errorMessage += `: ${errorData.message}`;
                }
            } catch {
                // Could not parse error JSON
            }
            throw new ApiError(errorMessage, response.status, errorData);
        }

        const stream = response.body.pipeThrough(new TextDecoderStream());
        const completed = new WeakMap<object, boolean>();
        const snapshots = parse(stream as unknown as AsyncIterable<string>, {
            completeCallback: (val) => {
                if (val && typeof val === 'object') {
                    completed.set(val, true);
                }
            }
        });

        return { snapshots, completed };
    }

    async extractTextFromImage(image: File): Promise<OCRResponse> {
        const formData = new FormData();
        formData.append('image', image);

        return this.request<OCRResponse>('/api/ocr', {
            method: 'POST',
            body: formData
        });
    }

    async getFurigana(lines: string[]): Promise<FuriganaSegment[][]> {
        const response = await this.request<{ batch: FuriganaSegment[][] }>(
            '/api/furigana',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ lines })
            }
        );
        return response.batch;
    }

    async *analyze(
        sentence: string,
        context?: string,
        signal?: AbortSignal,
        model?: string
    ): AsyncGenerator<AnalyzedTerm[], void, unknown> {
        // Stream whole term objects
        const { snapshots, completed } = await this.streamJson(
            '/api/analyze',
            { sentence, context, model },
            'Analysis',
            signal
        );

        let lastTermCount = 0;
        let data: Partial<SentenceAnalysis> | undefined;

        for await (const partialAnalysis of snapshots) {
            data = partialAnalysis as Partial<SentenceAnalysis>;
            if (data?.terms && Array.isArray(data.terms)) {
                const completeTerms = data.terms.filter((term) =>
                    completed.has(term)
                );
                if (completeTerms.length > lastTermCount) {
                    yield completeTerms;
                    lastTermCount = completeTerms.length;
                }
            }
        }

        // Final yield for completed analysis
        yield data?.terms ?? [];
    }

    /**
     * Analyze multiple lines from a song with streaming support.
     * Uses full song for context but only analyzes the specified lines.
     *
     * @example
     * for await (const result of api.analyzeSongLines(fullSong, lines)) {
     *     console.log(result.lineIndex, result.analysis);
     * }
     */
    async *analyzeSongLines(
        fullSong: string,
        lines: string[],
        signal?: AbortSignal,
        model?: string
    ): AsyncGenerator<
        { lineIndex: number; analysis: LineAnalysis },
        void,
        unknown
    > {
        // Stream the response
        const { snapshots, completed } = await this.streamJson(
            '/api/analyze-song',
            { fullSong, lines, batchIndex: 0, model },
            'Song analysis',
            signal
        );

        let lastAnalysisCount = 0;
        let data: Partial<AnalyzeSongResponse> | undefined;

        for await (const partialResponse of snapshots) {
            data = partialResponse as Partial<AnalyzeSongResponse>;
            if (data?.analyses && Array.isArray(data.analyses)) {
                // Yield newly completed analyses
                const completeAnalyses = data.analyses.filter(
                    (a: LineAnalysis) => completed.has(a)
                );
                for (
                    let i = lastAnalysisCount;
                    i < completeAnalyses.length;
                    i++
                ) {
                    yield { lineIndex: i, analysis: completeAnalyses[i] };
                }
                lastAnalysisCount = completeAnalyses.length;
            }
        }

        // Final yield for any remaining analyses
        if (data?.analyses) {
            for (let i = lastAnalysisCount; i < data.analyses.length; i++) {
                yield { lineIndex: i, analysis: data.analyses[i] };
            }
        }
    }
}

export const api = new ApiClient();
