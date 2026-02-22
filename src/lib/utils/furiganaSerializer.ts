import type { FuriganaSegment } from '$lib/types';

/**
 * Serializes a FuriganaSegment array into an editable string format.
 * Format: "kanji(furigana) kana" where spaces separate groups.
 *
 * Example: [{base: "小", furigana: "ちい"}, {base: "さい"}] → "小(ちい) さい"
 *
 * @param segments - Array of furigana segments to serialize
 * @returns Editable string representation
 */
export const serializeFurigana = (segments: FuriganaSegment[]): string => {
    return segments
        .map((seg) => {
            if (seg.furigana) {
                return `${seg.base}(${seg.furigana})`;
            }
            return seg.base;
        })
        .join(' ');
};

/**
 * Deserializes an editable string format back into FuriganaSegment array.
 * Parses "kanji(furigana) kana" format where spaces separate groups.
 *
 * Example: "小(ちい) さい" → [{base: "小", furigana: "ちい"}, {base: "さい"}]
 *
 * @param text - Editable string to parse
 * @returns Array of FuriganaSegment objects
 */
export const deserializeFurigana = (text: string): FuriganaSegment[] => {
    const segments: FuriganaSegment[] = [];

    // Split by spaces to get groups
    const groups = text.trim().split(/\s+/);

    for (const group of groups) {
        if (!group) continue;

        // Match pattern: base(furigana) or just base
        const match = group.match(/^(.+?)\((.+)\)$/);
        if (match) {
            segments.push({
                base: match[1],
                furigana: match[2]
            });
        } else {
            segments.push({
                base: group
            });
        }
    }

    return segments;
};

/**
 * Extracts the plain kanji form from a FuriganaSegment array.
 *
 * @param segments - Array of furigana segments
 * @returns Concatenated base characters
 */
export const getFuriganaKanji = (segments: FuriganaSegment[]): string => {
    return segments.map((seg) => seg.base).join('');
};

/**
 * Extracts the full reading from a FuriganaSegment array.
 * Uses furigana for kanji, base for kana.
 *
 * @param segments - Array of furigana segments
 * @returns Full reading in hiragana
 */
export const getFuriganaReading = (segments: FuriganaSegment[]): string => {
    return segments.map((seg) => seg.furigana ?? seg.base).join('');
};
