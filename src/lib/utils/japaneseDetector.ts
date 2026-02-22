/**
 * Checks if a string contains Japanese characters.
 * Detects Hiragana, Katakana, and Kanji (CJK Unified Ideographs).
 *
 * @param text - The string to check
 * @returns true if the string contains at least one Japanese character
 */
export function containsJapanese(text: string): boolean {
    if (!text) return false;

    // Unicode ranges for Japanese characters:
    // - Hiragana: U+3040 - U+309F
    // - Katakana: U+30A0 - U+30FF
    // - Katakana Phonetic Extensions: U+31F0 - U+31FF
    // - CJK Unified Ideographs (Kanji): U+4E00 - U+9FFF
    // - CJK Unified Ideographs Extension A: U+3400 - U+4DBF
    // - Half-width Katakana: U+FF65 - U+FF9F
    const japaneseRegex =
        /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u4E00-\u9FFF\u3400-\u4DBF\uFF65-\uFF9F]/;

    return japaneseRegex.test(text);
}
