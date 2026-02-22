import { z } from 'zod';

/**
 * Zod schema for a single analyzed word or grammar point from a Japanese sentence.
 */
export const FuriganaSegmentSchema = z.object({
    /** The character(s) in the surface form */
    base: z.string(),
    /** The reading, if it's kanji. Undefined for kana/punctuation. */
    furigana: z.string().optional(),
    /** Optional CSS class to apply to this segment */
    className: z.string().optional()
});

/**
 * Zod schema for a single analyzed word or grammar point from a Japanese sentence.
 */
export const AnalyzedTermSchema = z.object({
    /** The term as written in the sentence (may include kanji) */
    kanji: z.string(),
    /** Hiragana reading of the term */
    reading: z.string(),
    /** Detailed breakdown for furigana rendering */
    furigana: z.array(FuriganaSegmentSchema).optional(),
    /** Part of speech, e.g., "verb", "noun", "particle" */
    partOfSpeech: z.string(),
    /** Abbreviated part of speech from fixed list, e.g., "Noun", "Verb", "Prt." */
    partOfSpeechShort: z.string().optional(),
    /** Context-specific definition/meaning */
    definition: z.string(),
    /** Optional notes on grammatical relationships, conjugation info, etc. */
    notes: z.string().optional(),
    /** If true, this term may contain a typo */
    possibleTypo: z.boolean().optional(),
    /** Suggested correction if this term contains a possible typo */
    suggestedCorrection: z.string().optional()
});

/**
 * Zod schema for complete analysis result for a Japanese sentence.
 */
export const SentenceAnalysisSchema = z.object({
    /** The original input sentence */
    original: z.string(),
    /** Array of analyzed terms/components */
    terms: z.array(AnalyzedTermSchema)
});

/**
 * Zod schema for a single line analysis within a song.
 */
export const LineAnalysisSchema = z.object({
    /** The original line text */
    original: z.string(),
    /** Analyzed terms for this line */
    terms: z.array(AnalyzedTermSchema)
});

/**
 * Zod schema for batched song analysis response.
 */
export const SongAnalysisResponseSchema = z.object({
    /** Analyses for the requested lines, in order */
    analyses: z.array(LineAnalysisSchema)
});

export type FuriganaSegment = z.infer<typeof FuriganaSegmentSchema>;
export type AnalyzedTerm = z.infer<typeof AnalyzedTermSchema>;
export type SentenceAnalysis = z.infer<typeof SentenceAnalysisSchema>;
export type LineAnalysis = z.infer<typeof LineAnalysisSchema>;
export type SongAnalysisResponse = z.infer<typeof SongAnalysisResponseSchema>;
