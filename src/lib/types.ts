import type { z } from 'zod';
import type {
    FuriganaSegmentSchema,
    AnalyzedTermSchema,
    SentenceAnalysisSchema
} from './schemas';

/**
 * Represents a single analyzed word or grammar point from a Japanese sentence.
 */
export type FuriganaSegment = z.infer<typeof FuriganaSegmentSchema>;

/**
 * Represents a single analyzed word or grammar point from a Japanese sentence.
 */
export type AnalyzedTerm = z.infer<typeof AnalyzedTermSchema>;

/**
 * Complete analysis result for a Japanese sentence.
 */
export type SentenceAnalysis = z.infer<typeof SentenceAnalysisSchema>;

/**
 * State for the analysis request.
 */
export type AnalysisState =
    | { status: 'idle' }
    | { status: 'loading'; data?: SentenceAnalysis }
    | { status: 'success'; data: SentenceAnalysis }
    | { status: 'error'; message: string };

/**
 * State for the analysis bar
 */
export type AnalysisBarState = {
    id: string;
    analysis: SentenceAnalysis | null;
    isLoading: boolean;
};

/**
 * Request payload for analyzing a sentence.
 */
export interface AnalyzeRequest {
    sentence: string;
    context?: string;
}

/**
 * Response from the analysis API.
 * It returns the sentence analysis structure essentially.
 */
export type AnalyzeResponse = SentenceAnalysis;

/**
 * Response from the OCR API.
 */
export interface OCRResponse {
    text: string;
}

/**
 * Request payload for batched song analysis.
 */
export interface AnalyzeSongRequest {
    /** Full song lyrics for context */
    fullSong: string;
    /** Lines to analyze in this batch */
    lines: string[];
    /** Batch index for tracking progress */
    batchIndex: number;
    /** Optional model override */
    model?: string;
}

/**
 * Analysis result for a single line within a song.
 */
export interface LineAnalysis {
    /** The original line text */
    original: string;
    /** Analyzed terms for this line */
    terms: AnalyzedTerm[];
}

/**
 * Response from the song analysis API.
 */
export interface AnalyzeSongResponse {
    /** Analyses for the requested lines, in order */
    analyses: LineAnalysis[];
}
