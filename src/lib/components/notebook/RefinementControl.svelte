<script lang="ts">
    import { api } from '$lib/api';
    import SentenceDisplay from '$lib/components/SentenceDisplay.svelte';
    import { settings } from '$lib/stores/settings.svelte';
    import type { AnalyzedTerm, SentenceAnalysis } from '$lib/types';
    import { slide } from 'svelte/transition';

    interface Props {
        initialSentence: string;
        onClose: () => void;
        onRefined: (analysis: SentenceAnalysis) => void;
    }

    let { initialSentence, onClose, onRefined }: Props = $props();

    let refineSentence = $derived(initialSentence);
    let refineContext = $state('');
    let isAnalyzing = $state(false);
    let currentTerms = $state<AnalyzedTerm[]>([]);
    let currentHoverIndex = $state<number | null>(null);

    async function executeRefinement() {
        if (!refineSentence) return;

        isAnalyzing = true;
        currentTerms = [];

        const result: SentenceAnalysis = {
            original: refineSentence,
            terms: []
        };

        try {
            const generator = api.analyze(refineSentence, refineContext, undefined, settings.model);

            for await (const terms of generator) {
                currentTerms = terms;
                result.terms = terms;
            }

            onRefined(result);
        } catch (e) {
            console.error('Refinement failed:', e);
        } finally {
            isAnalyzing = false;
        }
    }
</script>

<div class="mx-auto flex max-w-[800px] flex-col gap-4">
    <p class="m-0 text-sm text-[var(--color-text-muted)]">
        Edit the sentence or add context to improve the analysis.
    </p>

    <div class="flex flex-col gap-2">
        <label
            for="refine-sentence"
            class="text-[0.85rem] font-medium text-[var(--color-text-muted)]"
            >Sentence</label
        >
        <textarea
            id="refine-sentence"
            bind:value={refineSentence}
            rows="2"
            class="w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-base text-[var(--color-text)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_var(--color-primary-transparent,rgba(0,0,0,0.1))] focus:outline-none"
        ></textarea>
    </div>

    <div class="flex flex-col gap-2">
        <label
            for="refine-context"
            class="text-[0.85rem] font-medium text-[var(--color-text-muted)]"
            >Context (Optional)</label
        >
        <textarea
            id="refine-context"
            bind:value={refineContext}
            placeholder="Add context to help the AI understand better..."
            rows="2"
            class="w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-base text-[var(--color-text)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_var(--color-primary-transparent,rgba(0,0,0,0.1))] focus:outline-none"
        ></textarea>
    </div>

    <div class="mt-2 flex justify-end gap-3">
        {#if isAnalyzing}
            <div
                class="mr-auto flex items-center text-sm"
                transition:slide={{ axis: 'x' }}
            >
                <SentenceDisplay
                    sentence={refineSentence}
                    terms={currentTerms}
                    loading={true}
                    bind:hoveredIndex={currentHoverIndex}
                />
            </div>
        {/if}
        <button
            class="cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent px-4 py-2 text-[var(--color-text)] transition-colors duration-200 hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50 hover:disabled:bg-transparent"
            onclick={onClose}
            disabled={isAnalyzing}>Cancel</button
        >
        <button
            class="cursor-pointer rounded-lg border-none bg-[var(--color-primary)] px-4 py-2 font-medium text-black transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            onclick={executeRefinement}
            disabled={isAnalyzing}
        >
            {isAnalyzing ? 'Analyzing...' : 'Refine Analysis'}
        </button>
    </div>
</div>
