import * as wanakana from 'wanakana';

/**
 * Convert a string to kana if it's fully in romaji
 */
export const toKana = (sentence: string) => {
    // Convert to Kana if fully Romaji
    if (wanakana.isRomaji(sentence) && !wanakana.isJapanese(sentence)) {
        return wanakana.toKana(sentence);
    }
    return sentence;
};
