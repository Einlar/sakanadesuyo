import Kuroshiro from '@sglkc/kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';
import type { FuriganaSegment } from '$lib/types';

/**
 * Singleton instance of Kuroshiro for Japanese text analysis.
 * Initialized lazily on first use.
 */
let kuroshiroInstance: Kuroshiro | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initializes the Kuroshiro instance with the Kuromoji analyzer.
 * This is a heavy operation that loads the dictionary (~20MB).
 * Subsequent calls return immediately if already initialized.
 */
const initKuroshiro = async (): Promise<Kuroshiro> => {
    if (kuroshiroInstance) {
        return kuroshiroInstance;
    }

    if (initPromise) {
        await initPromise;
        return kuroshiroInstance!;
    }

    kuroshiroInstance = new Kuroshiro();

    // Kuromoji is now externalized (not bundled), so it will automatically
    // use NodeDictionaryLoader and find dictionaries in node_modules/kuromoji/dict/
    initPromise = kuroshiroInstance.init(new KuromojiAnalyzer());
    await initPromise;

    return kuroshiroInstance;
};

/**
 * Converts Japanese text to furigana segments.
 * Each segment contains a base string and optional furigana reading for kanji.
 *
 * @example
 * const segments = await getFurigana("買ってくる");
 * // [{ base: "買", furigana: "か" }, { base: "ってくる" }]
 */
export const getFurigana = async (text: string): Promise<FuriganaSegment[]> => {
    const kuroshiro = await initKuroshiro();

    // Get the conversion with furigana mode
    // This returns HTML with <ruby> tags: <ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>
    const result = await kuroshiro.convert(text, {
        mode: 'furigana',
        to: 'hiragana'
    });

    // Parse the ruby HTML to extract segments
    return parseRubyHtml(result);
};

/**
 * Parses Kuroshiro's ruby HTML output into FuriganaSegment array.
 * Handles both <ruby>...<rt>...</rt></ruby> tags and plain text.
 */
const parseRubyHtml = (html: string): FuriganaSegment[] => {
    const segments: FuriganaSegment[] = [];

    // Match ruby tags or plain text between them
    // Pattern: <ruby>base<rp>(</rp><rt>reading</rt><rp>)</rp></ruby> or plain text
    const rubyPattern =
        /<ruby>([^<]+)<rp>\(<\/rp><rt>([^<]+)<\/rt><rp>\)<\/rp><\/ruby>/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rubyPattern.exec(html)) !== null) {
        // Add any plain text before this ruby tag
        if (match.index > lastIndex) {
            const plainText = html.slice(lastIndex, match.index);
            if (plainText.trim()) {
                segments.push({ base: plainText });
            }
        }

        // Add the ruby segment
        segments.push({
            base: match[1],
            furigana: match[2]
        });

        lastIndex = match.index + match[0].length;
    }

    // Add any remaining plain text
    if (lastIndex < html.length) {
        const remaining = html.slice(lastIndex);
        if (remaining.trim()) {
            segments.push({ base: remaining });
        }
    }

    return segments;
};

/**
 * Pre-warms the Kuroshiro instance by loading the dictionary.
 * Call this at server startup to avoid latency on first request.
 */
export const warmupKuroshiro = async (): Promise<void> => {
    await initKuroshiro();
};
