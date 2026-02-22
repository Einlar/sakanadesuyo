<script lang="ts">
    import type { AnalyzedTerm } from '$lib/types';

    import FuriganaText from './FuriganaText.svelte';
    import ExternalLinkIcon from './icons/ExternalLinkIcon.svelte';

    interface Props {
        term: AnalyzedTerm;
        isHighlighted?: boolean;
        /** Additional actions to show in the header */
        actions?: import('svelte').Snippet;
    }

    let { term, isHighlighted = false, actions }: Props = $props();

    // Generate Jisho search URL
    function getJishoUrl(term: string): string {
        return `https://jisho.org/search/${encodeURIComponent(term)}`;
    }

    let containerWidth = $state(0);
    let fullTagWidth = $state(0);
</script>

<article
    class="group data-[highlighted=true]:bg-opacity-10 dark:data-[highlighted=true]:bg-opacity-20 data-[typo=true]:bg-opacity-10 dark:data-[typo=true]:bg-opacity-20 flex h-full flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all duration-200 hover:border-[var(--color-primary)] data-[highlighted=true]:translate-y-[-2px] data-[highlighted=true]:border-teal-500 data-[highlighted=true]:bg-teal-50 data-[highlighted=true]:shadow-lg data-[highlighted=true]:ring-1 data-[highlighted=true]:ring-teal-500 data-[typo=true]:border-amber-500 data-[typo=true]:bg-amber-50 dark:data-[highlighted=true]:border-teal-400 dark:data-[highlighted=true]:bg-teal-900 dark:data-[highlighted=true]:ring-teal-400 dark:data-[typo=true]:border-amber-400 dark:data-[typo=true]:bg-amber-900"
    data-highlighted={isHighlighted}
    data-typo={term.possibleTypo ?? false}
>
    <!-- Header: Kanji + Reading + Jisho Link -->
    <header class="mb-3 flex min-h-[3.5rem] items-start justify-between gap-2">
        <div class="flex flex-wrap items-baseline gap-2">
            <h3
                class="text-xl font-medium text-[var(--color-text)] transition-colors duration-200 group-data-[highlighted=true]:text-teal-950 dark:group-data-[highlighted=true]:text-teal-50"
            >
                {#if term.furigana}
                    <FuriganaText
                        segments={term.furigana}
                        rubyStyle="text-xs transition-colors duration-200 text-[var(--color-text-muted)] group-data-[highlighted=true]:text-teal-700 dark:group-data-[highlighted=true]:text-teal-200"
                    />
                {:else}
                    {term.kanji}
                    {#if term.reading && term.reading !== term.kanji}
                        <span
                            class="text-base text-[var(--color-text-muted)] transition-colors duration-200 group-data-[highlighted=true]:text-teal-700 dark:group-data-[highlighted=true]:text-teal-200"
                            >【{term.reading}】</span
                        >
                    {/if}
                {/if}
            </h3>
        </div>
        <div class="flex shrink-0 items-center gap-2">
            {@render actions?.()}
            <a
                href={getJishoUrl(term.kanji)}
                target="_blank"
                rel="noopener noreferrer"
                class="text-[var(--color-text-muted)] transition-colors duration-200 group-data-[highlighted=true]:text-teal-700 hover:text-[var(--color-primary)] dark:group-data-[highlighted=true]:text-teal-300"
                title="Look up on Jisho"
                aria-label={`Look up ${term.kanji} on Jisho`}
            >
                <ExternalLinkIcon size={18} />
            </a>
        </div>
    </header>

    <!-- Part of Speech -->

    <div
        class="relative mb-2 w-full overflow-hidden"
        bind:clientWidth={containerWidth}
    >
        <span
            class="inline-block max-w-full cursor-help truncate rounded bg-[var(--color-primary)]/20 box-decoration-clone px-2 py-0.5 text-xs leading-loose text-[var(--color-primary)]"
            title={term.partOfSpeech}
        >
            {#if term.partOfSpeechShort}
                {fullTagWidth > containerWidth
                    ? term.partOfSpeechShort
                    : term.partOfSpeech}
            {:else}
                {term.partOfSpeech}
            {/if}
        </span>

        <!-- Hidden measurement span with exact same styling -->
        <span
            bind:clientWidth={fullTagWidth}
            class="pointer-events-none invisible absolute px-2 py-0.5 text-xs leading-loose whitespace-nowrap opacity-0"
            aria-hidden="true"
        >
            {term.partOfSpeech}
        </span>
    </div>

    <!-- Definition -->
    <p
        class="text-sm text-[var(--color-text)] transition-colors duration-200 group-data-[highlighted=true]:text-teal-950 dark:group-data-[highlighted=true]:text-teal-50"
    >
        {term.definition}
    </p>

    <!-- Notes -->
    {#if term.notes}
        <p
            class="mt-2 text-xs text-[var(--color-text-muted)] italic transition-colors duration-200 group-data-[highlighted=true]:text-teal-700 dark:group-data-[highlighted=true]:text-teal-200"
        >
            {term.notes}
        </p>
    {/if}

    <!-- Typo suggestion -->
    {#if term.possibleTypo && term.suggestedCorrection}
        <div
            class="mt-2 flex items-center gap-1.5 rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-700 dark:text-amber-300"
        >
            <span class="font-medium">Possible typo:</span>
            <span
                >Did you mean <strong>{term.suggestedCorrection}</strong>?</span
            >
        </div>
    {/if}
</article>
