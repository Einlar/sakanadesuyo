<script lang="ts">
    import AnalysisBar from '$lib/components/notebook/AnalysisBar.svelte';
    import NotebookEditor from '$lib/components/notebook/NotebookEditor.svelte';
    import NotebookSidebar from '$lib/components/notebook/NotebookSidebar.svelte';
    import TopNav from '$lib/components/notebook/TopNav.svelte';
    import SidebarIcon from '$lib/components/icons/SidebarIcon.svelte';
    import {
        notebookStore,
        type NotebookDocument
    } from '$lib/stores/notebookStore.svelte';
    import type { AnalysisBarState, SentenceAnalysis } from '$lib/types';
    import type { TipexEditor } from '@friendofsvelte/tipex';

    /** Tipex editor instance */
    let tipex: TipexEditor | undefined = $state();

    /** Notebook editor component instance */
    let editorComponent: NotebookEditor | undefined = $state();

    /** Currently selected document */
    let selectedDoc = $state<NotebookDocument | null>(null);

    /** Currently displayed analysis (state) */
    let activeAnalysis = $state<AnalysisBarState | null>(null);

    /** Initialize store on mount */
    $effect(() => {
        notebookStore.init();
    });

    /** Create a new document and select it */
    function handleNewDocument() {
        selectedDoc = notebookStore.createDocument();
        tipex?.commands.setContent('');
        activeAnalysis = null;
    }

    /** Sidebar visibility state */
    let isSidebarOpen = $state(true);
    let isSmallScreen = $state(false);

    /** Handle screen size changes */
    $effect(() => {
        const mql = window.matchMedia('(max-width: 768px)');
        isSmallScreen = mql.matches;

        // Auto-close sidebar on initial load if screen is small
        if (isSmallScreen) {
            isSidebarOpen = false;
        }

        const handler = (e: MediaQueryListEvent) => {
            isSmallScreen = e.matches;
            if (e.matches) {
                isSidebarOpen = false;
            } else {
                isSidebarOpen = true;
            }
        };
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    });

    function toggleSidebar() {
        isSidebarOpen = !isSidebarOpen;
    }

    /** Handle document selection from sidebar */
    function handleSelectDocument(id: string) {
        selectedDoc = notebookStore.getDocument(id) ?? null;
        tipex?.commands.setContent(selectedDoc?.content ?? '');
        activeAnalysis = null;

        if (isSmallScreen) {
            isSidebarOpen = false;
        }
    }

    /** Handle document deletion */
    function handleDeleteDocument(id: string) {
        notebookStore.deleteDocument(id);
        if (selectedDoc?.id === id) {
            selectedDoc = null;
            activeAnalysis = null;
        }
    }

    /** Handle content update from editor */
    function handleContentUpdate(content: string) {
        if (selectedDoc?.id) {
            notebookStore.updateDocument(selectedDoc.id, { content });
        }
    }

    /** Handle title update */
    function handleTitleUpdate(title: string) {
        if (selectedDoc?.id) {
            notebookStore.updateDocument(selectedDoc.id, { title });
        }
    }

    /** Handle clicking an analyzed sentence in editor */
    function handleAnalysisClick(data: AnalysisBarState) {
        // Deselect if already selected
        if (activeAnalysis?.id === data.id) {
            activeAnalysis = null;
            return;
        }

        activeAnalysis = data;
    }

    /** Delete the currently selected analysis */
    function handleDeleteAnalysis() {
        if (selectedDoc && activeAnalysis) {
            // Abort if loading
            if (activeAnalysis.isLoading) {
                editorComponent?.abortAnalysis(activeAnalysis.id);
            }

            // Remove from editor first
            tipex?.commands.removeAnalyzedSentence(activeAnalysis.id);
            // Store update removed (implicit in content update)
            activeAnalysis = null;
        }
    }

    /** Handle refined analysis */
    function handleRefine(analysis: SentenceAnalysis) {
        if (selectedDoc && activeAnalysis) {
            // Update the editor content if the sentence changed
            tipex?.commands.updateAnalyzedSentenceText(
                activeAnalysis.id,
                analysis.original
            );

            // Also update our local view
            activeAnalysis.analysis = analysis;
        }
    }

    /** Handle real-time analysis updates from editor */
    function handleAnalysisUpdate(data: AnalysisBarState) {
        if (activeAnalysis?.id === data.id) {
            activeAnalysis = data;
        }
    }
</script>

<div
    class="grid h-[100dvh] grid-rows-[1fr_auto] bg-[var(--color-background)] transition-all duration-300 ease-in-out"
    style="grid-template-columns: {isSidebarOpen
        ? 'var(--notebook-sidebar-width,280px)'
        : '0px'} 1fr;"
>
    <TopNav />
    {#if isSidebarOpen}
        <NotebookSidebar
            documents={notebookStore.documents}
            selectedDocId={selectedDoc?.id ?? null}
            onSelect={handleSelectDocument}
            onNew={handleNewDocument}
            onDelete={handleDeleteDocument}
            onToggle={toggleSidebar}
        />
    {/if}

    <main class="col-start-2 row-start-1 flex flex-col overflow-hidden">
        {#if selectedDoc}
            <NotebookEditor
                bind:tipex
                bind:this={editorComponent}
                document={selectedDoc}
                onContentUpdate={handleContentUpdate}
                onTitleUpdate={handleTitleUpdate}
                onAnalysisClick={handleAnalysisClick}
                onAnalysisUpdate={handleAnalysisUpdate}
                selectedAnalysisId={activeAnalysis?.id}
                onToggleSidebar={toggleSidebar}
                showSidebarToggle={!isSidebarOpen}
            />
        {:else}
            <div
                class="relative flex h-full flex-col items-center justify-center gap-4 text-[var(--color-text-muted)]"
            >
                {#if !isSidebarOpen}
                    <button
                        class="absolute top-6 left-8 flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                        onclick={toggleSidebar}
                        aria-label="Open sidebar"
                    >
                        <SidebarIcon class="h-6 w-6" />
                    </button>
                {/if}
                <p>Select a document or create a new one</p>
                <button
                    class="cursor-pointer rounded-lg border-none bg-[var(--color-primary)] px-6 py-3 font-medium text-black transition-opacity duration-200 hover:opacity-90"
                    onclick={handleNewDocument}
                >
                    + New Document
                </button>
            </div>
        {/if}
    </main>

    <AnalysisBar
        data={activeAnalysis}
        onClose={() => (activeAnalysis = null)}
        onDelete={handleDeleteAnalysis}
        onRefine={handleRefine}
    />
</div>
