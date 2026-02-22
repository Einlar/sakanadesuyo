<script lang="ts">
    import type { AnalyzedTerm, LineAnalysis } from '$lib/types';
    import type { KaraokeSentence } from '$lib/stores/karaokeStore.svelte';
    import TermCardController from './TermCardController.svelte';
    import { quintOut } from 'svelte/easing';
    import { MediaQuery } from 'svelte/reactivity';

    interface Props {
        /** Map of line index to analysis */
        analysisResults: Map<number, LineAnalysis>;
        /** Whether the panel is expanded */
        isExpanded: boolean;
        /** Whether analysis is in progress */
        isAnalyzing: boolean;
        /** Currently highlighted term identifier: "lineIndex-termIndex" */
        highlightedTerm: string | null;
        /** Callback when a term is hovered */
        onTermHover: (termId: string | null) => void;
        /** Callback when a term is clicked */
        onTermClick?: (termId: string) => void;
        /** Song ID for store updates */
        songId: string;
        /** Current sentences array */
        sentences: KaraokeSentence[];
    }

    let {
        analysisResults,
        isExpanded,
        isAnalyzing,
        highlightedTerm,
        onTermHover,
        onTermClick,
        songId,
        sentences
    }: Props = $props();

    // Resizing logic
    let sidebarWidth = $state(450);
    let sidebarHeight = $state(400);
    let isResizing = $state(false);
    const isMobile = new MediaQuery('max-width: 639px');

    function startResize(e: MouseEvent | TouchEvent) {
        isResizing = true;

        if (window.TouchEvent && e instanceof TouchEvent) {
            document.addEventListener('touchmove', handleResize, {
                passive: false
            });
            document.addEventListener('touchend', stopResize);
        } else {
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
        }

        // Prevent text selection during resize
        document.body.style.userSelect = 'none';
        document.body.style.cursor = isMobile.current
            ? 'row-resize'
            : 'col-resize';
    }

    function handleResize(e: MouseEvent | TouchEvent) {
        if (!isResizing) return;

        let clientX, clientY;

        if (window.TouchEvent && e instanceof TouchEvent) {
            e.preventDefault(); // Prevent scrolling on mobile
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e instanceof MouseEvent) {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            return;
        }

        if (isMobile.current) {
            const newHeight = window.innerHeight - clientY;
            if (newHeight > 200 && newHeight < window.innerHeight * 0.9) {
                sidebarHeight = newHeight;
            }
        } else {
            // Calculate new width based on window width - mouse X
            // Since it's a right sidebar, larger X means smaller width
            const newWidth = window.innerWidth - clientX;

            // Constraints
            if (newWidth > 250 && newWidth < window.innerWidth * 0.6) {
                sidebarWidth = newWidth;
            }
        }
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchmove', handleResize);
        document.removeEventListener('touchend', stopResize);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    }

    /** Group terms by line (verse) or gap */
    let termsByLine = $derived.by(() => {
        type Item =
            | {
                  type: 'verse';
                  lineIndex: number;
                  terms: Array<{
                      term: AnalyzedTerm;
                      termIndex: number;
                      id: string;
                  }>;
              }
            | {
                  type: 'gap';
                  count: number;
                  id: string;
              };

        const result: Item[] = [];

        // Sort by line index for consistent ordering
        const sortedEntries = Array.from(analysisResults.entries()).sort(
            ([a], [b]) => a - b
        );

        const countNonEmpty = (start: number, end: number) => {
            let count = 0;
            if (end > start) {
                for (let j = start; j < end; j++) {
                    if (sentences[j] && sentences[j].text.trim().length > 0) {
                        count++;
                    }
                }
            }
            return count;
        };

        for (let i = 0; i < sortedEntries.length; i++) {
            const [lineIndex, analysis] = sortedEntries[i];

            // Check for gap before this item
            if (i > 0) {
                const [prevLineIndex] = sortedEntries[i - 1];
                const count = countNonEmpty(prevLineIndex + 1, lineIndex);

                if (count > 0) {
                    result.push({
                        type: 'gap',
                        count,
                        id: `gap-${prevLineIndex}-${lineIndex}`
                    });
                }
            }

            const lineTerms = [];
            for (
                let termIndex = 0;
                termIndex < analysis.terms.length;
                termIndex++
            ) {
                const term = analysis.terms[termIndex];
                lineTerms.push({
                    term,
                    termIndex,
                    id: `${lineIndex}-${termIndex}`
                });
            }
            if (lineTerms.length > 0) {
                result.push({ type: 'verse', lineIndex, terms: lineTerms });
            }
        }

        // Check for gap after the last item
        if (sortedEntries.length > 0) {
            const [lastLineIndex] = sortedEntries[sortedEntries.length - 1];
            const count = countNonEmpty(lastLineIndex + 1, sentences.length);

            if (count > 0) {
                result.push({
                    type: 'gap',
                    count,
                    id: `gap-${lastLineIndex}-end`
                });
            }
        }

        return result;
    });

    /**
     * Scrolls to a term card by its ID.
     */
    export const scrollToTerm = (termId: string): void => {
        const element = document.getElementById(`term-card-${termId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    /** Custom transition for responsive panel slide */
    function panelTransition(node: HTMLElement, { duration = 300 } = {}) {
        return {
            duration,
            easing: quintOut,
            css: (t: number) => {
                if (isMobile.current) {
                    return `
                        height: ${t * sidebarHeight}px;
                        opacity: ${t};
                        overflow: hidden;
                        border-top-width: ${t > 0 ? 1 : 0}px;
                    `;
                }
                return `
                    width: ${t * sidebarWidth}px;
                    opacity: ${t};
                    overflow: hidden;
                    border-left-width: ${t > 0 ? 1 : 0}px;
                `;
            }
        };
    }
</script>

{#if isExpanded}
    <aside
        transition:panelTransition
        class="fixed bottom-0 left-0 z-40 flex h-[var(--mobile-height)] w-full
               flex-col border-t border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl
               sm:relative sm:top-auto sm:z-0 sm:h-[calc(100vh-5rem)] sm:w-[var(--desktop-width)] sm:border-t-0 sm:border-l sm:shadow-none"
        style="--mobile-height: {sidebarHeight}px; --desktop-width: {sidebarWidth}px;"
    >
        <!-- Resize Handle -->
        <div
            class="absolute top-0 left-0 z-50 h-6 w-full -translate-y-3
                   cursor-row-resize touch-none
                   opacity-0 transition-opacity hover:bg-[var(--color-primary)] hover:opacity-100 active:bg-[var(--color-primary)]
                   sm:h-full sm:w-1 sm:translate-y-0 sm:cursor-col-resize"
            onmousedown={startResize}
            ontouchstart={startResize}
            aria-hidden="true"
        ></div>

        <div class="flex h-full flex-col overflow-hidden">
            <!-- Content -->
            <div class="flex-1 overflow-x-hidden overflow-y-auto">
                {#if termsByLine.length === 0 && !isAnalyzing}
                    <div
                        class="flex h-full flex-col items-center justify-center p-8 text-[var(--color-text-muted)]"
                    >
                        <p>No analysis available</p>
                        <p class="mt-2 text-xs">Click "Analyze" to start</p>
                    </div>
                {:else if termsByLine.length === 0 && isAnalyzing}
                    <div class="flex flex-col items-center gap-4 py-16">
                        <div
                            class="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"
                        ></div>
                        <p class="text-sm text-[var(--color-text-muted)]">
                            Analyzing...
                        </p>
                    </div>
                {:else}
                    <div class="flex flex-col">
                        {#each termsByLine as group (group.type === 'gap' ? group.id : `verse-${group.lineIndex}`)}
                            {#if group.type === 'gap'}
                                <div
                                    class="flex items-center justify-center border-b border-[var(--color-border)] p-4 text-xs text-[var(--color-text-muted)] italic last:border-b-0"
                                >
                                    {group.count} non-analyzed verse{group.count >
                                    1
                                        ? 's'
                                        : ''}
                                </div>
                            {:else}
                                <div
                                    class="flex flex-col gap-4 border-b border-[var(--color-border)] p-4 last:border-b-0"
                                >
                                    <h3
                                        class="text-[10px] font-bold tracking-[0.2em] text-[var(--color-text-muted)] uppercase"
                                    >
                                        Verse {group.lineIndex + 1}
                                    </h3>
                                    <div class="flex flex-wrap gap-3">
                                        {#each group.terms as { term, id, termIndex } (id)}
                                            <div
                                                id="term-card-{id}"
                                                class="group max-w-sm min-w-[240px] flex-1 cursor-pointer transition-transform active:scale-[0.98]"
                                                onmouseenter={() =>
                                                    onTermHover(id)}
                                                onmouseleave={() =>
                                                    onTermHover(null)}
                                                onclick={() =>
                                                    onTermClick?.(id)}
                                                onkeydown={(e) => {
                                                    if (
                                                        e.key === 'Enter' ||
                                                        e.key === ' '
                                                    ) {
                                                        e.preventDefault();
                                                        onTermClick?.(id);
                                                    }
                                                }}
                                                role="button"
                                                tabindex="0"
                                            >
                                                <TermCardController
                                                    {term}
                                                    isHighlighted={highlightedTerm ===
                                                        id}
                                                    {songId}
                                                    lineIndex={group.lineIndex}
                                                    {termIndex}
                                                    {sentences}
                                                />
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        {/each}

                        {#if isAnalyzing}
                            <div
                                class="flex items-center justify-center gap-2 py-8 opacity-50"
                            >
                                <div
                                    class="h-2 w-2 animate-bounce rounded-full bg-[var(--color-primary)]"
                                ></div>
                                <div
                                    class="h-2 w-2 animate-bounce rounded-full bg-[var(--color-primary)] [animation-delay:0.2s]"
                                ></div>
                                <div
                                    class="h-2 w-2 animate-bounce rounded-full bg-[var(--color-primary)] [animation-delay:0.4s]"
                                ></div>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </aside>
{/if}
