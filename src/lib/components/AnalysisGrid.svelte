<script lang="ts">
    import type { AnalyzedTerm } from '$lib/types';
    import TermCard from './TermCard.svelte';

    import { fly } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';

    interface Props {
        terms: AnalyzedTerm[];
        hoveredIndex: number | null;
    }

    let { terms, hoveredIndex = $bindable() }: Props = $props();
</script>

{#if terms.length === 0}
    <p class="text-center text-[var(--color-text-muted)]">
        Enter a sentence above and click Analyze.
    </p>
{:else}
    <div
        role="list"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
        {#each terms as term, i (term.kanji + term.reading + i)}
            <div
                id="term-{i}"
                in:fly={{
                    y: 12,
                    duration: 450,
                    delay: i * 70,
                    easing: quintOut
                }}
                onmouseover={() => (hoveredIndex = i)}
                onfocus={() => (hoveredIndex = i)}
                onmouseout={() => (hoveredIndex = null)}
                onblur={() => (hoveredIndex = null)}
                role="listitem"
                class="h-full"
            >
                <TermCard {term} isHighlighted={hoveredIndex === i} />
            </div>
        {/each}
    </div>
{/if}
