<script lang="ts">
    import AnalysisGrid from '$lib/components/AnalysisGrid.svelte';
    import SentenceDisplay from '$lib/components/SentenceDisplay.svelte';
    import type { AnalysisBarState, SentenceAnalysis, AnalyzedTerm } from '$lib/types';
    import { slide } from 'svelte/transition';
    import TrashIcon from '../icons/TrashIcon.svelte';
    import EditIcon from '../icons/EditIcon.svelte';
    import RefinementControl from './RefinementControl.svelte';

    interface Props {
        data: AnalysisBarState | null;
        onClose: () => void;
        onDelete?: () => void;
        /** Callback for when the user redoes the analysis via the refinement feature (edit icon) */
        onRefine?: (analysis: SentenceAnalysis) => void;
        hoveredIndex?: number | null;
    }

    let {
        data,
        onClose,
        onDelete,
        onRefine,
        hoveredIndex = $bindable(null)
    }: Props = $props();

    let height = $state(320);
    let isResizing = $state(false);

    // Refine state
    let isRefining = $state(false);

    function toggleRefine() {
        if (!data?.analysis) return;
        isRefining = !isRefining;
    }

    function handleRefined(result: SentenceAnalysis) {
        if (onRefine) {
            onRefine(result);
        }
        isRefining = false;
    }

    function startResize(e: MouseEvent) {
        e.preventDefault(); // Prevent text selection
        isResizing = true;

        const startY = e.clientY;
        const startH = height;

        function onMouseMove(e: MouseEvent) {
            const dy = startY - e.clientY;
            height = Math.max(200, Math.min(800, startH + dy));
        }

        function onMouseUp() {
            isResizing = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    function scrollToTerm(term: AnalyzedTerm) {
        if (!data?.analysis?.terms) return;
        
        const index = data.analysis.terms.indexOf(term);
        if (index !== -1) {
            const el = document.getElementById(`term-${index}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
</script>

{#if data?.analysis}
    <div
        class="relative col-span-full row-start-2 flex flex-col border-t border-[var(--color-border)] bg-[var(--color-surface)]"
        class:select-none={isResizing}
        class:!transition-none={isResizing}
        style:height="{height}px"
        transition:slide={{ duration: 200 }}
    >
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="absolute -top-1 right-0 left-0 z-10 h-2 cursor-ns-resize after:absolute after:top-1 after:right-0 after:left-0 after:h-px after:bg-transparent after:transition-colors after:duration-200 hover:after:h-0.5 hover:after:bg-[var(--color-primary)]"
            class:after:h-0.5={isResizing}
            class:after:bg-[var(--color-primary)]={isResizing}
            onmousedown={startResize}
        ></div>
        <header
            class="relative flex shrink-0 items-center justify-center border-b border-[var(--color-border)] px-4 py-3"
        >
            <div class="flex min-w-0 flex-1 justify-center overflow-x-auto">
                <SentenceDisplay
                    sentence={data.analysis.original}
                    terms={data.analysis.terms}
                    loading={data.isLoading}
                    onTermClick={scrollToTerm}
                    bind:hoveredIndex
                />
            </div>
            <div
                class="absolute top-1/2 right-4 flex -translate-y-1/2 items-center gap-2"
            >
                {#if onRefine && !data.isLoading}
                    <button
                        class="flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1.5 text-[var(--color-text-muted)] transition-colors duration-200 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                        class:text-[var(--color-primary)]={isRefining}
                        class:bg-[var(--color-surface-hover)]={isRefining}
                        onclick={toggleRefine}
                        aria-label="Refine evaluation"
                        title="Refine analysis with context"
                    >
                        <EditIcon />
                    </button>
                {/if}
                {#if onDelete}
                    <button
                        class="flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1.5 text-[var(--color-text-muted)] transition-colors duration-200 hover:bg-[var(--color-surface-hover)] hover:text-[oklch(0.7_0.15_25)]"
                        onclick={onDelete}
                        aria-label="Delete analysis"
                        title="Remove analysis and restore plain text"
                    >
                        <TrashIcon />
                    </button>
                {/if}
                <button
                    class="flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1.5 text-2xl leading-none text-[var(--color-text-muted)] transition-colors duration-200 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                    onclick={onClose}
                    aria-label="Close analysis"
                >
                    ×
                </button>
            </div>
        </header>
        <div class="flex-1 overflow-y-auto p-4">
            {#if isRefining}
                <RefinementControl
                    initialSentence={data.analysis.original}
                    onClose={() => (isRefining = false)}
                    onRefined={handleRefined}
                />
            {:else if data.isLoading && (!data.analysis?.terms || data.analysis.terms.length === 0)}
                <div
                    class="flex h-full animate-pulse items-center justify-center text-[0.95rem] text-[var(--color-text-muted)]"
                >
                    Analyzing sentence...
                </div>
            {:else}
                <AnalysisGrid terms={data.analysis?.terms} bind:hoveredIndex />
            {/if}
        </div>
    </div>
{/if}
