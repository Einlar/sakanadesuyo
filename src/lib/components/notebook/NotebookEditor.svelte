<script lang="ts">
    import type { NotebookDocument } from '$lib/stores/notebookStore.svelte';
    import type { AnalysisBarState, SentenceAnalysis } from '$lib/types';
    import { debounce } from '$lib/utils/debounce';
    import type { TipexEditor } from '@friendofsvelte/tipex';
    import { Tipex, defaultExtensions } from '@friendofsvelte/tipex';
    import { untrack } from 'svelte';
    import { AnalyzedSentenceNode } from './AnalyzedSentenceNode';
    import Controls from './Controls.svelte';
    import EditorHeader from './EditorHeader.svelte';
    import FloatingAnalyzeButton from './FloatingAnalyzeButton.svelte';
    import { ImageExtension } from './ImageExtension';
    import { JapaneseStylingExtension } from './JapaneseStylingExtension';
    import {
        generateAnalysisId,
        handleSelectionChange,
        identifyJapaneseCandidates,
        type FloatingButtonPosition
    } from './editorHelpers';
    import { settings as editorSettings } from './state.svelte';
    import { settings as appSettings } from '$lib/stores/settings.svelte';
    import { api } from '$lib/api';

    interface Props {
        document: NotebookDocument;
        tipex?: TipexEditor;
        onContentUpdate: (content: string) => void;
        onTitleUpdate: (title: string) => void;
        onAnalysisClick: (data: AnalysisBarState) => void;
        selectedAnalysisId?: string | null;
        onAnalysisUpdate?: (data: AnalysisBarState) => void;
        onToggleSidebar?: () => void;
        showSidebarToggle?: boolean;
    }

    let {
        document,
        onContentUpdate,
        onTitleUpdate,
        onAnalysisClick,
        tipex = $bindable(),
        selectedAnalysisId = null,
        onAnalysisUpdate,
        onToggleSidebar,
        showSidebarToggle
    }: Props = $props();

    /** Active analysis controllers to support cancellation */
    const analysisControllers = new Map<string, AbortController>();

    /** Abort an ongoing analysis */
    export function abortAnalysis(id: string) {
        const controller = analysisControllers.get(id);
        if (controller) {
            controller.abort();
            analysisControllers.delete(id);
        }
    }

    /** Currently selected text for analysis */
    let selectedText = $state('');

    /** Position for the floating analyze button */
    let floatingBtnPos = $state<FloatingButtonPosition | null>(null);

    /** Save status */
    let saveStatus = $state<'saved' | 'saving' | 'idle'>('idle');

    /** Custom extensions including our AnalyzedSentenceMark, JapaneseStylingExtension, and resizable Image */
    // Filter out default Image extension if present to avoid conflicts (Tipex defaultExtensions usually includes it)
    const baseExtensions = defaultExtensions.filter(
        (ext) => ext.name !== 'image'
    );

    const extensions = [
        ...baseExtensions,
        ImageExtension,
        JapaneseStylingExtension,
        AnalyzedSentenceNode
    ];

    /** Handle editor creation - set up selection listener */
    function handleCreate({ editor }: { editor?: TipexEditor }) {
        if (!editor) return;

        // Selection change listener
        editor.on('selectionUpdate', () => {
            const result = handleSelectionChange(editor);
            selectedText = result.selectedText;
            floatingBtnPos = result.floatingBtnPos;
        });

        // Click listener for analyzed sentences
        const handleClick = (e: MouseEvent) => handleEditorClick(e);
        editor.view.dom.addEventListener('click', handleClick);

        // Cleanup
        editor.on('destroy', () => {
            editor.view.dom.removeEventListener('click', handleClick);
            editor.view.dom.removeEventListener(
                'analyze-all-japanese',
                handleAnalyzeAllJapanese
            );
        });

        // Listen for analyze-all event from Controls
        editor.view.dom.addEventListener(
            'analyze-all-japanese',
            handleAnalyzeAllJapanese
        );
    }

    const debouncedSave = debounce((html: string) => {
        onContentUpdate(html);
        saveStatus = 'saved';
        setTimeout(() => {
            if (saveStatus === 'saved') {
                saveStatus = 'idle';
            }
        }, 2000);
    }, 1000);

    import type { Transaction } from 'prosemirror-state';

    /** Handle editor content updates */
    function handleUpdate({
        editor,
        transaction
    }: {
        editor?: TipexEditor;
        transaction?: Transaction;
    }) {
        if (!editor) return;
        saveStatus = 'saving';
        const html = editor.getHTML();
        debouncedSave(html);

        // Check if the currently selected analysis node was deleted
        if (selectedAnalysisId && transaction && transaction.docChanged) {
            let found = false;
            editor.state.doc.descendants((node) => {
                if (
                    node.type.name === 'analyzedSentence' &&
                    node.attrs['data-analysis-id'] === selectedAnalysisId
                ) {
                    found = true;
                    return false; // Stop searching
                }
                return true;
            });

            if (!found) {
                // Node was deleted, unselect it
                onAnalysisClick({
                    id: selectedAnalysisId,
                    analysis: null,
                    isLoading: false
                });
            }
        }
    }

    /** Handle clicks on analyzed sentences */
    function handleEditorClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        // Check if we clicked on an analyzed sentence (or inside it)
        const node = target.closest('.analyzed-sentence-node') as HTMLElement;

        if (node) {
            const id = node.getAttribute('data-analysis-id');
            const jsonStr = node.getAttribute('data-analysis-json');
            const isLoading = node.hasAttribute('data-loading');

            if (id) {
                let analysis: SentenceAnalysis | null = null;
                if (isLoading) {
                    // Create provisional analysis for loading state
                    analysis = {
                        original: node.textContent || '',
                        terms: []
                    };
                } else if (jsonStr) {
                    try {
                        analysis = JSON.parse(jsonStr);
                    } catch (err) {
                        console.error(
                            'Failed to parse analysis data from node',
                            err
                        );
                    }
                }

                onAnalysisClick({ id, analysis, isLoading });
            }
        }
    }

    /** Trigger the analysis form submission */
    function triggerAnalysis() {
        if (!selectedText) return;

        const id = generateAnalysisId();
        handleAnalysisStart(id);
    }

    /** Handle analysis start - create the analyzed node immediately in loading state and stream results */
    async function handleAnalysisStart(
        id: string,
        targetRange?: { from: number; to: number },
        targetText?: string
    ) {
        // If range/text provided, use them. Otherwise use selection.
        let sentenceToAnalyze = targetText;
        if (!sentenceToAnalyze) {
            if (!selectedText) return;
            sentenceToAnalyze = selectedText;
        }

        if (tipex) {
            if (targetRange) {
                tipex
                    .chain()
                    .setAnalyzedSentenceAt(targetRange, id, true)
                    .run();
            } else {
                tipex.chain().focus().setAnalyzedSentence(id, true).run();
            }
        }

        // Reset global analyzing state immediately to allow other analyses (parallel)
        floatingBtnPos = null;

        // Auto-select the newly created analysis to open the side bar immediately
        onAnalysisClick({
            id,
            analysis: { original: sentenceToAnalyze, terms: [] },
            isLoading: true
        });

        let finalAnalysis: SentenceAnalysis = {
            original: sentenceToAnalyze,
            terms: []
        };

        try {
            // Create abort controller
            const controller = new AbortController();
            analysisControllers.set(id, controller);

            // Start streaming analysis
            // Use local API client to stream
            const generator = api.analyze(
                sentenceToAnalyze,
                undefined,
                controller.signal,
                appSettings.model
            );

            for await (const terms of generator) {
                if (tipex) {
                    finalAnalysis.terms = terms;
                    // Update the highlighted terms for visual progress
                    const termStrings = terms.map((t) => t.kanji);
                    tipex.commands.updateAnalyzedSentenceTerms(id, termStrings);

                    // If this is the currently selected analysis, update the parent
                    onAnalysisUpdate?.({
                        id,
                        analysis: { ...finalAnalysis },
                        isLoading: true
                    });
                }
            }

            // Analysis complete
            // Assuming the last yield gave us the full terms list
            if (tipex) {
                tipex.commands.completeAnalyzedSentence(id, finalAnalysis);
                onAnalysisUpdate?.({
                    id,
                    analysis: { ...finalAnalysis },
                    isLoading: false
                });
            }
        } catch (error) {
            // If aborted, we don't need to show an error state essentially,
            // as this likely happened due to user deletion
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }

            console.error('Analysis failed:', error);
            if (tipex) {
                tipex.commands.removeLoadingAnalyzedSentence(id);
            }
            onAnalysisUpdate?.({
                id,
                analysis: null,
                isLoading: false
            });
        } finally {
            analysisControllers.delete(id);
        }
    }

    /**
     * Find and analyze all unanalyzed Japanese sentences
     */
    function handleAnalyzeAllJapanese() {
        if (!tipex) return;

        const candidates = identifyJapaneseCandidates(tipex);

        for (const candidate of candidates) {
            const id = generateAnalysisId();
            // We can fire these off parallel-ish
            handleAnalysisStart(
                id,
                { from: candidate.from, to: candidate.to },
                candidate.text
            );
        }
    }

    /** Update selection styles when selectedAnalysisId changes */
    $effect(() => {
        // Capture selectedAnalysisId reactively
        const id = selectedAnalysisId;

        // Use untrack to avoid re-running when tipex changes
        untrack(() => {
            if (tipex) {
                tipex.commands.setSelectedAnalysis(id);
            }
        });
    });
</script>

<div
    class="flex h-full flex-col overflow-hidden"
    role="application"
    aria-label="Notebook editor application"
    style="--jp-font-size: {editorSettings.current.jpFontSize}em"
>
    <EditorHeader
        title={document.title}
        updatedAt={document.updatedAt}
        {saveStatus}
        {onTitleUpdate}
        {onToggleSidebar}
        {showSidebarToggle}
    />

    <div
        class="relative flex-1 overflow-auto bg-[var(--color-surface)]"
        role="region"
        tabindex="-1"
        aria-label="Document editor"
    >
        <Tipex
            bind:tipex
            body={document.content}
            {extensions}
            oncreate={handleCreate}
            onupdate={handleUpdate}
            class="tipex-editor"
            controlComponent={null}
        />

        {#if floatingBtnPos && selectedText}
            <FloatingAnalyzeButton
                position={floatingBtnPos}
                onclick={triggerAnalysis}
            />
        {/if}
    </div>

    <div
        class="relative z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]"
    >
        <Controls {tipex} bind:jpFontSize={editorSettings.current.jpFontSize} />
    </div>
</div>

<style>
    /* These global styles must be in a Svelte style block, not external CSS */
    :global(.tipex-editor) {
        min-height: 100%;
        background: var(--color-surface) !important;
    }

    /* Analyzed sentence styling */
    :global(.analyzed-sentence) {
        background: oklch(0.6 0.1 250 / 0.15);
        border-radius: 2px;
        cursor: pointer;
        transition: background 0.2s;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
    }

    :global(.analyzed-sentence:hover) {
        background: oklch(0.6 0.15 250 / 0.25);
    }

    /* Selected state - covers both decoration wrapper and direct class */
    :global(.selected),
    :global(.selected .analyzed-sentence),
    :global(.analyzed-sentence.selected) {
        background: oklch(0.6 0.15 250 / 0.4) !important;
        box-shadow: 0 0 0 2px var(--color-primary);
        padding: 0.25rem 0.375rem;
        margin: -0.125rem 0;
        border-radius: 4px;
    }

    /* Automatically styled Japanese text */
    :global(.jp-styled-text) {
        font-size: var(--jp-font-size, 1.2em);
        margin-inline: 1px;
    }

    /* Highlighted chunk during analysis stream */
    :global(.received-analysis-chunk) {
        color: var(--color-primary);
        font-weight: 500;
        background: oklch(
            0.65 0.16 175 / 0.15
        ); /* Light tint matching primary */
        border-radius: 2px;
        transition:
            color 0.2s,
            background 0.2s;
    }

    /* Loading analysis animation */
    :global(.loading-analysis) {
        background: linear-gradient(
            90deg,
            oklch(0.6 0.1 250 / 0.15) 0%,
            oklch(0.7 0.15 200 / 0.3) 25%,
            oklch(0.6 0.1 250 / 0.15) 50%,
            oklch(0.7 0.15 200 / 0.3) 75%,
            oklch(0.6 0.1 250 / 0.15) 100%
        );
        background-size: 200% 100%;
        animation: loading-wave 1.5s ease-in-out infinite;
        border-radius: 2px;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
    }

    @keyframes loading-wave {
        0% {
            background-position: 100% 0;
        }
        100% {
            background-position: -100% 0;
        }
    }
</style>
