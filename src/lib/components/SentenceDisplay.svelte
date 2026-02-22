<script lang="ts">
    import type { AnalyzedTerm } from '$lib/types';

    interface Props {
        sentence: string;
        terms?: AnalyzedTerm[];
        hoveredIndex: number | null;
        loading?: boolean;
        onTermClick?: (term: AnalyzedTerm) => void;
    }

    let {
        sentence,
        terms = [],
        hoveredIndex = $bindable(),
        loading = false,
        onTermClick = () => {}
    }: Props = $props();

    function getSegments(
        text: string,
        terms: AnalyzedTerm[]
    ): Array<{ text: string; index?: number }> {
        if (!terms || terms.length === 0) return [{ text }];

        let segments: Array<{ text: string; index?: number }> = [];
        let cursor = 0;

        for (let i = 0; i < terms.length; i++) {
            const term = terms[i];
            const matchIndex = text.indexOf(term.kanji, cursor);

            if (matchIndex !== -1) {
                // Add text before match
                if (matchIndex > cursor) {
                    segments.push({ text: text.slice(cursor, matchIndex) });
                }

                // Add matched term
                segments.push({ text: term.kanji, index: i });
                cursor = matchIndex + term.kanji.length;
            }
        }

        // Add remaining text
        if (cursor < text.length) {
            segments.push({ text: text.slice(cursor) });
        }

        return segments;
    }

    let segments = $derived(getSegments(sentence, terms));
</script>

<section
    class="flex flex-wrap items-baseline justify-center gap-x-1 text-2xl font-medium text-[var(--color-accent)]"
>
    {#each segments as segment, i}
        {#if segment.index !== undefined}
            {@const isHovered = hoveredIndex === segment.index}
            <span
                class="-mx-1 cursor-pointer rounded border-b-2 px-1 transition-all duration-200"
                class:border-transparent={!isHovered}
                class:border-teal-500={isHovered}
                class:dark:border-teal-400={isHovered}
                class:text-teal-600={isHovered}
                class:dark:text-teal-300={isHovered}
                onmouseover={() => (hoveredIndex = segment.index!)}
                onmouseout={() => (hoveredIndex = null)}
                onfocus={() => (hoveredIndex = segment.index!)}
                onblur={() => (hoveredIndex = null)}
                onclick={() => onTermClick(terms[segment.index!])}
                onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onTermClick(terms[segment.index!]);
                    }
                }}
                role="button"
                tabindex="0"
            >
                {segment.text}
            </span>
        {:else}
            {@const isLast = i === segments.length - 1 && loading}
            <span
                class:text-gray-500={isLast}
                class:dark:text-gray-400={isLast}
                class:opacity-50={isLast}>{segment.text}</span
            >
        {/if}
    {/each}
</section>
