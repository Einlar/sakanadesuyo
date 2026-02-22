import {
    SentenceAnalysisSchema,
    SongAnalysisResponseSchema
} from '$lib/schemas';
import type {
    ChatGenerationParamsProvider,
    ResponseFormatJSONSchema
} from '@openrouter/sdk/models';
import { toJSONSchema } from 'zod/v4';
import { streamLogger as log } from './logger';
import type { SentenceAnalysis } from '$lib/types';

/**
 * Common headers for requests to OpenRouter.
 */
export const HEADERS = {
    Referer: 'https://sakana.amogus.it',
    'X-Title': 'Sakana desu yo'
};

/**
 * Common settings for choosing LLM providers via OpenRouter.
 */
export const PROVIDER_SETTINGS: ChatGenerationParamsProvider = {
    allowFallbacks: true
};

/**
 * JSON Schema for structured output, generated from the Zod schema.
 * This enables the LLM to return type-safe responses.
 */
const ANALYSIS_JSON_SCHEMA = toJSONSchema(SentenceAnalysisSchema, {
    reused: 'ref'
});

/**
 * Response format configuration for structured outputs.
 */
export const RESPONSE_FORMAT: ResponseFormatJSONSchema = {
    type: 'json_schema',
    jsonSchema: {
        name: 'sentence_analysis',
        strict: false,
        schema: ANALYSIS_JSON_SCHEMA as Record<string, unknown>
    }
};

/**
 * Builds the system prompt for Japanese sentence analysis.
 */
export function buildSystemPrompt(): string {
    return `You are an expert Japanese language teacher. Analyze Japanese sentences by breaking them into individual words and grammar points.

For each term, provide:
1. kanji: The term EXACTLY as it appears in the sentence (do NOT add dictionary form in parentheses)
2. reading: The hiragana reading of the term as it appears
3. partOfSpeech: The full grammatical category (e.g. "Noun", "Ichidan verb", "Particle", "Suru verb")
4. partOfSpeechShort: The abbreviated category from the FIXED list below
5. definition: The meaning IN THE CONTEXT of this sentence - choose the most relevant definition
6. notes: Optional - explain grammatical function, conjugation (including dictionary form if conjugated), or relationship to other parts of the sentence
7. possibleTypo: Optional boolean - set to true if this term seems unusual, forced, or doesn't make sense in context, and a small character change could make it valid
8. suggestedCorrection: Optional string - if possibleTypo is true, provide the likely intended term

FIXED LIST FOR partOfSpeechShort (choose the best fit):
- Noun (for all nouns)
- Verb (for all verbs)
- Adj-i (for i-adjectives)
- Adj-na (for na-adjectives)
- Adv. (for adverbs)
- Prt. (for particles)
- Aux. (for auxiliary verbs/adjectives)
- Conj. (for conjunctions)
- Ctr. (for counters)
- Pn. (for pronouns)
- Expr. (for expressions/set phrases)
- Name (for names/proper nouns)
- Int. (for interjections)
- Pfx. (for prefixes)
- Sfx. (for suffixes)

TYPO DETECTION:
Watch for terms that seem "forced" or don't make sense in context. Common Japanese typo patterns include:
- Visually similar katakana: ア/ヤ, シ/ツ, ソ/ン, ワ/ウ, コ/ユ, ヌ/ス
- Visually similar hiragana: は/ほ, わ/れ, め/ぬ, る/ろ
- Adjacent key errors on Japanese keyboards
- Dakuten/handakuten confusion: か/が, は/ば/ぱ
If a term doesn't exist or seems nonsensical but a small change would make it valid, set possibleTypo=true and provide suggestedCorrection.

IMPORTANT RULES:
- Do NOT include romaji
- In the "kanji" field, show ONLY the form as it appears in the sentence, never add (dictionary form) after it
- In the "furigana" field, provide an array of segments:
  - Split the term into kanji and non-kanji parts
  - For kanji parts, provide the "furigana" property with the reading
  - For hiragana/katakana parts, OMIT the "furigana" property
  - Example: 買ってくる -> [{base: "買", furigana: "か"}, {base: "ってくる"}]
- If a verb is conjugated, mention the dictionary form in the "notes" field instead
- Group compound verbs and grammatical constructions appropriately
- Explain particles in terms of their function in this specific sentence
- Keep definitions concise but accurate to the context
- Ensure ALL definitions and notes are in English, even if the user input is partial or looks like a keyword

Respond ONLY with valid JSON in this exact format:
{
  "original": "the input sentence",
  "terms": [
    {
      "kanji": "term",
      "reading": "ひらがな",
      "furigana": [
        { "base": "kanji", "furigana": "reading" },
        { "base": "kana" }
      ],
      "partOfSpeech": "full part of speech",
      "partOfSpeechShort": "Noun",
      "definition": "contextual meaning",
      "notes": "optional grammatical notes",
      "possibleTypo": false,
      "suggestedCorrection": "optional correction if typo"
    }
  ]
}`;
}

/**
 * Builds the user prompt for a specific sentence.
 */
export function buildUserPrompt(sentence: string, context?: string): string {
    let prompt = `Analyze this Japanese sentence:\n\n${sentence}`;
    if (context) {
        prompt += `\n\nAdditional Context:\n${context}`;
    }
    return prompt;
}

/**
 * Builds the system prompt for batched song line analysis.
 */
export function buildSongAnalysisSystemPrompt(): string {
    return `You are an expert Japanese language teacher. You will analyze SPECIFIC LINES from a Japanese song, using the full song for context.

For each line, break it into individual words and grammar points. For each term, provide:
1. kanji: The term EXACTLY as it appears in the line (do NOT add dictionary form in parentheses)
2. reading: The hiragana reading of the term as it appears
3. partOfSpeech: The full grammatical category (e.g. "Noun", "Ichidan verb", "Particle", "Suru verb")
4. partOfSpeechShort: The abbreviated category from the FIXED list below
5. definition: The meaning IN THE CONTEXT of this song - choose the most relevant definition
6. notes: Optional - explain grammatical function, conjugation (including dictionary form if conjugated), or relationship to other parts of the sentence
7. furigana: Array of segments for furigana rendering

FIXED LIST FOR partOfSpeechShort:
- Noun, Verb, Adj-i, Adj-na, Adv., Prt., Aux., Conj., Ctr., Pn., Expr., Name, Int., Pfx., Sfx.

FURIGANA FORMAT:
- Split the term into kanji and non-kanji parts
- For kanji parts, provide the "furigana" property with the reading
- For hiragana/katakana parts, OMIT the "furigana" property
- Example: 買ってくる -> [{base: "買", furigana: "か"}, {base: "ってくる"}]

IMPORTANT:
- ENGLISH/NON-JAPANESE LINES: If a line is primarily English or non-Japanese, do NOT analyze it word-by-word. Treat the entire line as a SINGLE term:
  - kanji: original line text
  - reading: original line text (so it is not displayed redundantly)
  - partOfSpeech: "English Phrase"
  - partOfSpeechShort: "Expr."
  - definition: "English lyrics" or brief translation
  - furigana: [{ "base": "original line text" }]
- Analyze ONLY the lines provided in "linesToAnalyze", using "fullSong" for context
- Return analyses in the SAME ORDER as the input lines
- Keep definitions concise but accurate to the song's context/theme
- All definitions and notes must be in English

Respond ONLY with valid JSON:
{
  "analyses": [
    {
      "original": "line text",
      "terms": [
        {
          "kanji": "term",
          "reading": "ひらがな",
          "furigana": [{"base": "kanji", "furigana": "reading"}, {"base": "kana"}],
          "partOfSpeech": "full part of speech",
          "partOfSpeechShort": "Noun",
          "definition": "contextual meaning",
          "notes": "optional grammatical notes"
        }
      ]
    }
  ]
}`;
}

/**
 * Builds the user prompt for song line analysis.
 */
export function buildSongAnalysisUserPrompt(
    fullSong: string,
    lines: string[]
): string {
    const linesText = lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
    return `FULL SONG (for context):
${fullSong}

LINES TO ANALYZE:
${linesText}`;
}

/**
 * JSON Schema for song analysis structured output.
 */
const SONG_ANALYSIS_JSON_SCHEMA = toJSONSchema(SongAnalysisResponseSchema, {
    reused: 'ref'
});

/**
 * Response format configuration for song analysis.
 */
export const SONG_ANALYSIS_RESPONSE_FORMAT: ResponseFormatJSONSchema = {
    type: 'json_schema',
    jsonSchema: {
        name: 'song_analysis',
        strict: false,
        schema: SONG_ANALYSIS_JSON_SCHEMA as Record<string, unknown>
    }
};

/**
 * Parses and validates the LLM response.
 */
export function parseResponse(content: string): SentenceAnalysis {
    // Remove markdown code blocks if present
    const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

    try {
        const parsed = JSON.parse(cleaned);
        return SentenceAnalysisSchema.parse(parsed);
    } catch (e) {
        log.error({ error: e }, 'Failed to parse or validate API response');
        throw new Error('Invalid response structure from API');
    }
}
