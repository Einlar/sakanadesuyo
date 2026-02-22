<script lang="ts">
    import { enhance } from '$app/forms';
    import { api } from '$lib/api';
    import AnalysisGrid from '$lib/components/AnalysisGrid.svelte';
    import ContextInput from '$lib/components/ContextInput.svelte';
    import HistorySidebar from '$lib/components/HistorySidebar.svelte';
    import ShareIcon from '$lib/components/icons/ShareIcon.svelte';
    import Loading from '$lib/components/Loading.svelte';
    import SentenceDisplay from '$lib/components/SentenceDisplay.svelte';
    import SentenceInput from '$lib/components/SentenceInput.svelte';
    import ShareModal from '$lib/components/ShareModal.svelte';
    import { history } from '$lib/stores/history.svelte';
    import { settings } from '$lib/stores/settings.svelte';
    import type {
        AnalysisState,
        AnalyzedTerm,
        SentenceAnalysis
    } from '$lib/types';
    import type { SubmitFunction } from '@sveltejs/kit';
    import { untrack } from 'svelte';
    import { fade } from 'svelte/transition';
    import { toKana } from 'wanakana';
    import type { PageProps } from './$types';

    let { form }: PageProps = $props();

    /** Track the analysis state (idle, loading, success, error) */
    let processingState: AnalysisState = $derived.by(() => {
        if (form?.success && form.data) {
            return { status: 'success', data: form.data };
        }

        if (form?.success === false) {
            return {
                status: 'error',
                message:
                    form.message ??
                    "Oops, something went wrong. That's embarassing"
            };
        }

        return { status: 'idle' };
    });

    /** The sentence from the input form. Can be in romaji */
    let inputSentence = $derived(form?.inputSentence ?? '');

    /** The sentence to display over the analysis grid. Will always be in kana */
    let displayedSentence = $derived(form?.displayedSentence ?? '');

    /** Optional additional context */
    let context = $derived(form?.context ?? '');

    /** The index of the hovered term */
    let hoveredIndex = $state<number | null>(null);

    /** Whether the share modal is open */
    let isShareModalOpen = $state(false);

    /** Whether the page has JS enabled (progressive enhancement) */
    let hasJS = $state(false);

    /** Derived helper to safely access data in template without TS narrowing issues */
    let analysisResult = $derived.by(() => {
        // (This if is needed to avoid type errors)
        if (processingState.status === 'success') return processingState.data;

        // Return partial data if available
        if (processingState.status === 'loading' && processingState.data)
            return processingState.data;
        return null;
    });

    let formElement: HTMLFormElement;

    // Initialize history on mount, and run progressive enhancement
    $effect(() => {
        history.init();
        hasJS = true;
    });

    function loadHistoryItem(item: {
        sentence: string;
        context: string;
        data: SentenceAnalysis;
    }) {
        inputSentence = item.sentence;
        displayedSentence = item.sentence;
        context = item.context;
        processingState = { status: 'success', data: item.data };
    }

    const handleAnalyze: SubmitFunction = ({ cancel }) => {
        const trimmed = inputSentence.trim();
        if (!trimmed) {
            cancel();
            return;
        }

        // Cancel default submission to use streaming API
        cancel();

        // Update the UI immediately
        processingState = { status: 'loading' };
        displayedSentence = toKana(trimmed);

        // Start streaming analysis
        (async () => {
            try {
                const stream = api.analyze(displayedSentence, context, undefined, settings.model);
                let currentTerms: AnalyzedTerm[] = [];

                for await (const terms of stream) {
                    currentTerms = terms;
                    processingState = {
                        status: 'loading',
                        data: {
                            original: trimmed,
                            terms: currentTerms
                        }
                    };
                }

                const finalData = {
                    original: trimmed,
                    terms: currentTerms
                };

                processingState = {
                    status: 'success',
                    data: finalData
                };

                // Add to history when complete
                untrack(() => {
                    history.add(displayedSentence, context, finalData);
                });
            } catch (e) {
                const message =
                    e instanceof Error ? e.message : 'Error analyzing sentence';
                processingState = { status: 'error', message };
            }
        })();
    };

    async function handleImage(file: File) {
        processingState = { status: 'loading' };
        displayedSentence = 'Extracting text from image...';

        try {
            const ocrData = await api.extractTextFromImage(file);
            const extractedText = ocrData.text;
            inputSentence = extractedText;

            // Start analysis immediately
            await handleAnalyze({
                cancel: () => {} // No-op cancel
            } as any);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Unknown error';
            processingState = { status: 'error', message };
        }
    }
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossorigin="anonymous"
    />
    <link
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Yuji+Syuku&display=swap"
        rel="stylesheet"
        crossorigin="anonymous"
    />
</svelte:head>

<a
    href="#main-content"
    class="sr-only z-50 rounded bg-[var(--color-primary)] px-4 py-2 font-bold text-white focus:not-sr-only focus:absolute focus:top-4 focus:left-4 dark:text-black"
>
    Skip to main content
</a>

{#if hasJS}
    <HistorySidebar onLoad={loadHistoryItem} />
{/if}

<main id="main-content" class="space-y-8">
    <!-- Header -->
    <header class="py-10 text-center">
        <h1
            class="mb-3 font-['Yuji_Syuku'] text-5xl font-bold tracking-wide text-[var(--color-primary)] md:text-6xl"
        >
            魚ですよ
        </h1>
        <p
            class="text-sm font-light tracking-[0.25em] text-[var(--color-text-muted)] uppercase"
        >
            Japanese Sentence Analyzer
        </p>
    </header>

    <!-- Input -->
    <div>
        <div class="mb-2 min-h-[1.5em] pl-1">
            {#if hasJS}
                <p
                    class="animate-fade-in inline-flex items-baseline gap-1.5 text-xs text-[var(--color-text-muted)] opacity-80"
                >
                    <span class="font-medium text-[var(--color-primary)]"
                        >Tip:</span
                    >
                    <span>Paste an image to extract Japanese text</span>
                </p>
            {/if}
        </div>
        <form
            method="POST"
            action="?/analyze"
            bind:this={formElement}
            use:enhance={handleAnalyze}
            class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2"
        >
            <div class="col-start-1 row-start-1">
                <SentenceInput
                    bind:value={inputSentence}
                    onimage={handleImage}
                    onempty={() => (context = '')}
                    disabled={processingState.status === 'loading'}
                />
            </div>

            <div class="col-span-2 row-start-2">
                <ContextInput
                    value={context}
                    onchange={(val) => (context = val)}
                    onsubmit={() => formElement.requestSubmit()}
                    disabled={processingState.status === 'loading'}
                />
            </div>

            <button
                type="submit"
                disabled={processingState.status === 'loading' ||
                    !inputSentence.trim()}
                class="col-start-2 row-start-1 h-full rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:text-black"
            >
                {processingState.status === 'loading'
                    ? 'Analyzing...'
                    : 'Analyze'}
            </button>
        </form>
    </div>

    <!-- Displayed Sentence -->
    {#if displayedSentence}
        <SentenceDisplay
            sentence={displayedSentence}
            terms={analysisResult?.terms ?? []}
            loading={processingState.status === 'loading'}
            bind:hoveredIndex
        />
    {/if}

    <!-- Status / Results -->
    <section>
        {#if processingState.status === 'loading' && !processingState.data}
            <div out:fade={{ duration: 150 }}>
                <Loading />
            </div>
        {:else if processingState.status === 'error'}
            <p class="text-center text-red-400">
                Error: {processingState.message}
            </p>
        {:else if analysisResult}
            <div in:fade={{ duration: 300, delay: 100 }}>
                <div class="mb-6 flex h-10 justify-end">
                    {#if hasJS && processingState.status === 'success'}
                        <button
                            onclick={() => (isShareModalOpen = true)}
                            class="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                        >
                            <ShareIcon class="h-4 w-4" />
                            Share as Image
                        </button>
                    {/if}
                </div>
                <h2 class="sr-only">Analysis Results</h2>
                <AnalysisGrid terms={analysisResult.terms} bind:hoveredIndex />
                <ShareModal
                    isOpen={isShareModalOpen}
                    analysis={analysisResult}
                    onClose={() => (isShareModalOpen = false)}
                />
            </div>
        {:else}
            <AnalysisGrid terms={[]} bind:hoveredIndex />
        {/if}
    </section>
</main>
