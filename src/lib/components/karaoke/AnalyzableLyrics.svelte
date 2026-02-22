<script lang="ts">
    import type { KaraokeSentence } from '$lib/stores/karaokeStore.svelte';
    import type { LineAnalysis, AnalyzedTerm } from '$lib/types';
    import FuriganaText from '$lib/components/FuriganaText.svelte';
    import { getSyncedIntervals, findActiveLineIndex } from '$lib/utils/lyrics';

    interface Props {
        /** Song sentences with furigana */
        sentences: KaraokeSentence[];
        /** Map of line index to analysis */
        analysisResults: Map<number, LineAnalysis>;
        /** Currently highlighted term identifier: "lineIndex-termIndex" */
        highlightedTerm: string | null;
        /** Callback when a term is hovered */
        onTermHover: (termId: string | null) => void;
        /** Callback when a term is clicked */
        /** Callback when a term is clicked */
        onTermClick: (termId: string) => void;
        /** Callback when a verse is double clicked to seek */
        onVerseDbClick?: (startTime: number) => void;
        /** Current playback time in seconds for synchronization */
        currentTime?: number;
    }

    let {
        sentences,
        analysisResults,
        highlightedTerm,
        onTermHover,
        onTermClick,
        onVerseDbClick,
        currentTime = 0
    }: Props = $props();

    // Check if song has meaningful sync data (at least one startTime > 0)
    let hasSyncData = $derived(
        sentences.some((s) => s.startTime !== undefined && s.startTime !== null)
    );

    // Pre-calculate synced lines active intervals
    let syncedLines = $derived.by(() => {
        const timings = sentences.map((s) => s.startTime);
        return getSyncedIntervals(timings);
    });

    // Find active line efficiently using binary search (O(log N))
    let activeLineIndex = $derived.by(() => {
        if (!currentTime && currentTime !== 0) return -1;
        if (!hasSyncData) return -1;

        return findActiveLineIndex(syncedLines, currentTime);
    });

    $effect(() => {
        if (activeLineIndex !== -1) {
            const el = document.querySelector(
                `[data-line-index="${activeLineIndex}"]`
            );
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });

    /**
     * Gets segments for a line by matching terms to the text.
     * Returns segments that are either plain text or associated with a term.
     */
    const getLineSegments = (
        sentence: KaraokeSentence,
        lineIndex: number
    ): Array<{
        text: string;
        furigana?: typeof sentence.furigana;
        termIndex?: number;
        termId?: string;
    }> => {
        const analysis = analysisResults.get(lineIndex);
        if (!analysis || analysis.terms.length === 0) {
            // No analysis yet - just return the whole line
            return [{ text: sentence.text, furigana: sentence.furigana }];
        }

        const text = sentence.text;
        const terms = analysis.terms;
        const segments: Array<{
            text: string;
            furigana?: typeof sentence.furigana;
            termIndex?: number;
            termId?: string;
        }> = [];

        let cursor = 0;

        for (let termIndex = 0; termIndex < terms.length; termIndex++) {
            const term = terms[termIndex];
            const matchIndex = text.indexOf(term.kanji, cursor);

            if (matchIndex !== -1) {
                // Add text before match
                if (matchIndex > cursor) {
                    segments.push({ text: text.slice(cursor, matchIndex) });
                }

                // Add matched term
                segments.push({
                    text: term.kanji,
                    termIndex,
                    termId: `${lineIndex}-${termIndex}`,
                    furigana: term.furigana
                });
                cursor = matchIndex + term.kanji.length;
            }
        }

        // Add remaining text
        if (cursor < text.length) {
            segments.push({ text: text.slice(cursor) });
        }

        return segments;
    };
</script>

<div class="space-y-6">
    {#each sentences as sentence, lineIndex}
        <div
            class={[
                'group relative -mx-4 rounded-lg px-4 py-2 text-xl leading-loose transition-all duration-300 md:text-2xl',
                activeLineIndex === lineIndex
                    ? 'bg-[var(--color-primary)]/10'
                    : ''
            ].join(' ')}
            data-line-index={lineIndex}
            role="presentation"
            onmousedown={(e) => {
                if (e.detail > 1) {
                    e.preventDefault();
                }
            }}
            ondblclick={() => {
                if (
                    sentence.startTime !== undefined &&
                    sentence.startTime !== null
                ) {
                    onVerseDbClick?.(sentence.startTime);
                }
            }}
        >
            <span
                class="absolute top-1/2 left-1 -translate-y-1/2 text-[10px] font-bold text-[var(--color-primary)] tabular-nums opacity-50 transition-opacity select-none group-hover:opacity-100 md:-left-12 md:text-xs"
            >
                {lineIndex + 1}
            </span>
            {#if analysisResults.has(lineIndex)}
                <!-- Line has analysis - show interactive segments -->
                {#each getLineSegments(sentence, lineIndex) as segment}
                    {#if segment.termId !== undefined}
                        <!-- Interactive term -->
                        {@const isHighlighted =
                            highlightedTerm === segment.termId}
                        <span
                            class="cursor-pointer decoration-clone decoration-2 underline-offset-4 transition-all duration-200"
                            class:rounded={isHighlighted}
                            class:underline={true}
                            class:decoration-dashed={!isHighlighted}
                            class:decoration-solid={isHighlighted}
                            class:decoration-tipex-primary-300={!isHighlighted}
                            class:dark:decoration-tipex-primary-700={!isHighlighted}
                            class:decoration-tipex-primary-500={isHighlighted}
                            class:dark:decoration-tipex-primary-400={isHighlighted}
                            class:hover:decoration-solid={!isHighlighted}
                            class:text-tipex-primary-600={isHighlighted}
                            class:dark:text-tipex-primary-300={isHighlighted}
                            class:bg-tipex-primary-50={isHighlighted}
                            class:dark:bg-tipex-primary-900={isHighlighted}
                            class:shadow-[2px_0_0_0_var(--color-tipex-primary-50),-2px_0_0_0_var(--color-tipex-primary-50)]={isHighlighted}
                            class:dark:shadow-[2px_0_0_0_var(--color-tipex-primary-900),-2px_0_0_0_var(--color-tipex-primary-900)]={isHighlighted}
                            onmouseenter={() => onTermHover(segment.termId!)}
                            onmouseleave={() => onTermHover(null)}
                            onclick={() => onTermClick(segment.termId!)}
                            onkeydown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onTermClick(segment.termId!);
                                }
                            }}
                            role="button"
                            tabindex="0"
                        >
                            {#if segment.furigana}
                                <FuriganaText segments={segment.furigana} />
                            {:else}
                                <span class="text-[var(--color-text)]"
                                    >{segment.text}</span
                                >
                            {/if}
                        </span>
                    {:else}
                        <!-- Non-term text -->
                        <span class="text-[var(--color-text)]"
                            >{segment.text}</span
                        >
                    {/if}
                {/each}
            {:else if sentence.furigana}
                <!-- No analysis yet - show furigana if available -->
                <FuriganaText
                    segments={sentence.furigana}
                    textStyle="text-[var(--color-text)]"
                />
            {:else}
                <!-- No furigana either - plain text -->
                <span class="text-[var(--color-text)]">{sentence.text}</span>
            {/if}
        </div>
    {/each}
</div>
