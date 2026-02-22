import type { KaraokeSentence } from '$lib/stores/karaokeStore.svelte.ts';

/**
 * Parses LRC formatted lyrics into KaraokeSentence array with timestamps.
 *
 * LRC format: [mm:ss.cc] Lyrics text
 * Example: [00:27.93] Listen to the wind blow
 *
 * @example
 * const sentences = parseLrc("[00:00.50] Hello\n[00:02.00] World");
 * // Returns: [{ text: "Hello", startTime: 0.5 }, ...]
 */
export const parseLrc = (lrcContent: string): KaraokeSentence[] => {
    const lines = lrcContent.split('\n');
    const result: KaraokeSentence[] = [];

    // Regex to match LRC timestamp: [mm:ss.cc] or [mm:ss]
    const timestampRegex = /^\[(\d{2}):(\d{2})\.?(\d{2,3})?\]\s*(.*)$/;

    for (const line of lines) {
        const match = line.match(timestampRegex);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const centiseconds = match[3]
                ? parseInt(match[3].padEnd(3, '0'), 10) / 1000
                : 0;
            const startTime = minutes * 60 + seconds + centiseconds;
            const text = match[4].trim();

            // Skip empty lines but keep timestamp for endTime calculation
            if (text) {
                result.push({
                    text,
                    startTime
                });
            }
        }
    }

    return result;
};
