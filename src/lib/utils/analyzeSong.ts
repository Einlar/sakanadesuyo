import { api, ApiError } from '$lib/api';
import type {
    KaraokeSong,
    KaraokeSentence
} from '$lib/stores/karaokeStore.svelte';
import type { LineAnalysis } from '$lib/types';

/**
 * Options for analyzing a song.
 */
export interface AnalyzeSongOptions {
    /** The song to analyze */
    song: KaraokeSong;
    /** Number of lines per batch (default: 4) */
    batchSize?: number;
    /** Progress callback */
    onProgress?: (
        analyzedCount: number,
        totalCount: number,
        lineResults: Map<number, LineAnalysis>
    ) => void;
    /** Abort signal for cancellation */
    signal?: AbortSignal;
    /** Model to use for analysis */
    model?: string;
    /** Skip lines that already have analysis */
    skipAnalyzed?: boolean;
}

/**
 * Result from the song analysis generator.
 */
export interface AnalyzeSongResult {
    /** Index of the line in the song */
    lineIndex: number;
    /** The analysis for this line */
    analysis: LineAnalysis;
}

/**
 * Analyzes a song's lyrics with deduplication and batching.
 * Lines that repeat exactly will be analyzed only once.
 *
 * @example
 * const results = new Map<number, LineAnalysis>();
 * for await (const result of analyzeSong({ song })) {
 *     results.set(result.lineIndex, result.analysis);
 * }
 */
export async function* analyzeSong(
    options: AnalyzeSongOptions
): AsyncGenerator<AnalyzeSongResult, void, unknown> {
    const {
        song,
        batchSize = 4,
        onProgress,
        signal,
        model,
        skipAnalyzed = false
    } = options;

    // Filter out empty lines and get unique lines for deduplication
    const nonEmptyLines = song.sentences
        .map((s, i) => ({
            text: s.text.trim(),
            index: i,
            hasAnalysis: !!s.analysis
        }))
        .filter((l) => l.text.length > 0);

    if (nonEmptyLines.length === 0) {
        return;
    }

    // Create deduplication map: unique text -> array of original indices
    const uniqueLineMap = new Map<string, number[]>();
    // Set of texts that already have analysis (if skipAnalyzed is true)
    const existingAnalysisTexts = new Set<string>();

    for (const { text, index, hasAnalysis } of nonEmptyLines) {
        if (skipAnalyzed && hasAnalysis) {
            existingAnalysisTexts.add(text);
        }

        const existing = uniqueLineMap.get(text);
        if (existing) {
            existing.push(index);
        } else {
            uniqueLineMap.set(text, [index]);
        }
    }

    // Get unique lines to analyze (excluding those fully analyzed if skipAnalyzed is true)
    // Note: We analyze a text if it's NOT in existingAnalysisTexts.
    // This assumes if *any* occurrence has analysis, *all* do (or at least one does, so we can skip).
    // In a resume scenario, this is generally safe.
    const uniqueLines = Array.from(uniqueLineMap.keys()).filter((text) =>
        skipAnalyzed ? !existingAnalysisTexts.has(text) : true
    );
    const fullSong = song.lyrics;

    // Results storage
    const lineResults = new Map<number, LineAnalysis>();

    // Process in batches
    for (let i = 0; i < uniqueLines.length; i += batchSize) {
        if (signal?.aborted) {
            return;
        }

        const batch = uniqueLines.slice(i, i + batchSize);
        // Track which texts in this batch have been successfully analyzed
        const analyzedInBatch = new Set<string>();

        let attempt = 0;
        const maxRetries = 3;

        while (true) {
            if (signal?.aborted) return;

            // Determine which lines still need analysis
            const linesToAnalyze = batch.filter(
                (text) => !analyzedInBatch.has(text)
            );

            if (linesToAnalyze.length === 0) {
                break; // Batch complete
            }

            try {
                attempt++;

                // Analyze remaining lines
                for await (const result of api.analyzeSongLines(
                    fullSong,
                    linesToAnalyze,
                    signal,
                    model
                )) {
                    if (signal?.aborted) return;

                    // result.lineIndex is the index in linesToAnalyze
                    const lineText = linesToAnalyze[result.lineIndex];

                    // Mark as analyzed
                    analyzedInBatch.add(lineText);

                    const originalIndices = uniqueLineMap.get(lineText) ?? [];

                    // Yield result for each original index that had this line
                    for (const originalIndex of originalIndices) {
                        lineResults.set(originalIndex, result.analysis);
                        yield {
                            lineIndex: originalIndex,
                            analysis: result.analysis
                        };
                    }

                    onProgress?.(
                        lineResults.size,
                        nonEmptyLines.length,
                        lineResults
                    );
                }

                // If we get here without error, check if we actually finished everything.
                // If stream closed early without error but didn't yield all lines, we retry.
                if (analyzedInBatch.size === batch.length) {
                    break;
                }

                if (attempt > maxRetries) {
                    throw new Error(
                        `Failed to complete batch analysis after ${maxRetries} attempts`
                    );
                }

                // If partial completion without error, immediate retry (or backoff?)
                // Usually stream close = done. If partial, it might be a weird helper/model issue.
                // Let's treat it as a failure to be safe and backoff.
                throw new Error('Incomplete batch response');
            } catch (error) {
                if (signal?.aborted) return;

                // Stop if rate limited
                if (error instanceof ApiError && error.status === 429) {
                    throw error;
                }

                // Stop if max retries reached
                if (attempt > maxRetries) {
                    throw error;
                }

                // Exponential backoff: 1s, 2s, 4s...
                const delay = 1000 * Math.pow(2, attempt - 1);
                console.warn(
                    `Analysis batch failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
                    error
                );

                // Wait for delay or abort signal
                await new Promise<void>((resolve, reject) => {
                    const timer = setTimeout(() => {
                        signal?.removeEventListener('abort', abortHandler);
                        resolve();
                    }, delay);

                    const abortHandler = () => {
                        clearTimeout(timer);
                        reject(new Error('Aborted'));
                    };

                    signal?.addEventListener('abort', abortHandler);
                }).catch((e) => {
                    // Normalize abort error
                    if (signal?.aborted) return; // Outer loop checks abort
                    throw e;
                });
            }
        }
    }
}
