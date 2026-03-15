<script lang="ts">
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import AddAudioDialog from '$lib/components/karaoke/AddAudioDialog.svelte';
    import AnalyzableLyrics from '$lib/components/karaoke/AnalyzableLyrics.svelte';
    import AudioPlayer from '$lib/components/karaoke/AudioPlayer.svelte';
    import EditSongDialog from '$lib/components/karaoke/EditSongDialog.svelte';
    import NotesBackground from '$lib/components/karaoke/NotesBackground.svelte';
    import SongAnalysisPanel from '$lib/components/karaoke/SongAnalysisPanel.svelte';
    import SongOptionsMenu from '$lib/components/karaoke/SongOptionsMenu.svelte';
    import SyncLyricsMode from '$lib/components/karaoke/SyncLyricsMode.svelte';
    import TopNav from '$lib/components/karaoke/TopNav.svelte';
    import { karaokeStore } from '$lib/stores/karaokeStore.svelte';
    import { settings } from '$lib/stores/settings.svelte';
    import type { LineAnalysis } from '$lib/types';
    import { analyzeSong } from '$lib/utils/analyzeSong';
    import { FuriganaProcessor } from '$lib/utils/furigana.svelte';
    import { addToast } from '$lib/stores/toast';
    import { tick } from 'svelte';

    const slug = $derived(page.params.slug ?? '');
    let song = $derived(karaokeStore.getSongBySlug(slug));

    // Processing states
    let isAnalyzing = $state(false);
    let analysisAbortController = $state<AbortController | null>(null);

    // Analysis state
    let isPanelExpanded = $state(true);
    let highlightedTerm = $state<string | null>(null);

    // Reference to the panel for scrolling
    let panelComponent = $state<SongAnalysisPanel>();

    $effect(() => {
        // Redirect if song not found (and store is initialized)
        if (karaokeStore.initialized && !song) {
            console.warn('Song not found for slug:', slug);
        }
    });

    const furiganaProcessor = new FuriganaProcessor();
    $effect(() => {
        if (browser && song && furiganaProcessor.shouldProcessFurigana) {
            furiganaProcessor.processSongFurigana(song);
        }
    });

    // Load existing analysis from song if available
    const analysisResults = $derived.by(() => {
        const existingAnalysis = new Map<number, LineAnalysis>();
        song?.sentences.forEach((s, i) => {
            if (s.analysis) {
                existingAnalysis.set(i, s.analysis);
            }
        });
        return existingAnalysis;
    });

    async function startAnalysis(forceRestart = false) {
        if (!song || isAnalyzing) return;

        isAnalyzing = true;
        isPanelExpanded = true;
        analysisAbortController = new AbortController();

        if (forceRestart) {
            // Delete current analysis
            await karaokeStore.updateSong(song.id, {
                sentences: song.sentences.map((sentence) => ({
                    ...sentence,
                    analysis: undefined
                }))
            });
        }

        try {
            for await (const result of analyzeSong({
                song,
                batchSize: 4,
                signal: analysisAbortController.signal,
                model: settings.model,
                skipAnalyzed: !forceRestart
            })) {
                // Save analysis to store immediately
                if (song) {
                    const newSentences = [...song.sentences];
                    newSentences[result.lineIndex] = {
                        ...newSentences[result.lineIndex],
                        analysis: {
                            original: result.analysis.original,
                            terms: result.analysis.terms
                        }
                    };

                    await karaokeStore.updateSong(song.id, {
                        sentences: newSentences
                    });
                }
            }
        } catch (e) {
            if (analysisAbortController?.signal.aborted) {
                console.log('Analysis cancelled');
            } else {
                console.error('Analysis failed:', e);
                addToast(
                    e instanceof Error ? e.message : 'Analysis failed',
                    'error',
                    5000
                );
            }
        } finally {
            isAnalyzing = false;
            analysisAbortController = null;
        }
    }

    function cancelAnalysis() {
        analysisAbortController?.abort();
    }

    function handleTermHover(termId: string | null) {
        highlightedTerm = termId;
    }

    async function handleTermClick(termId: string) {
        const wasExpanded = isPanelExpanded;
        highlightedTerm = termId;
        isPanelExpanded = true;
        // Wait for panel to expand/render
        await tick();

        if (!wasExpanded) {
            // Wait for the panel transition to complete (300ms duration + buffer)
            await new Promise((resolve) => setTimeout(resolve, 350));
        }

        // Scroll to the term card
        panelComponent?.scrollToTerm(termId);
    }

    function handlePanelTermClick(termId: string) {
        highlightedTerm = termId;

        // Parse line index from termId "lineIndex-termIndex"
        const [lineIndexStr] = termId.split('-');
        const lineIndex = parseInt(lineIndexStr, 10);

        if (!isNaN(lineIndex)) {
            const el = document.querySelector(
                `[data-line-index="${lineIndex}"]`
            );
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    function togglePanel() {
        isPanelExpanded = !isPanelExpanded;
    }

    async function confirmDelete() {
        if (!song) return;
        if (
            confirm(
                `Are you sure you want to delete "${song.title}"? This action cannot be undone.`
            )
        ) {
            await karaokeStore.deleteSong(song.id);
            goto('/karaoke');
        }
    }

    let hasAnalysis = $derived(analysisResults.size > 0);
    let isAnalysisComplete = $derived.by(() => {
        if (!song) return false;
        const nonEmpty = song.sentences.filter((s) => s.text.trim().length > 0);
        return nonEmpty.length > 0 && nonEmpty.every((s) => !!s.analysis);
    });

    let analysisPercentage = $derived.by(() => {
        if (!song) return 0;
        const nonEmpty = song.sentences.filter((s) => s.text.trim().length > 0);
        if (nonEmpty.length === 0) return 0;
        const analyzed = nonEmpty.filter((s) => !!s.analysis).length;
        return Math.round((analyzed / nonEmpty.length) * 100);
    });

    let audioUrl = $state<string | null>(null);
    let currentTime = $state(0);
    let isPaused = $state(true);
    let showAddAudioDialog = $state(false);
    let showEditSongDialog = $state(false);
    let isSyncMode = $state(false);

    /**
     * Toggles sync lyrics mode on/off.
     */
    const toggleSyncMode = (): void => {
        isSyncMode = !isSyncMode;
    };

    /**
     * Saves sync data with all timings and exits sync mode.
     */
    const handleSaveSync = async (
        timings: (number | null)[]
    ): Promise<void> => {
        if (!song) return;
        const newSentences = song.sentences.map((s, i) => ({
            ...s,
            startTime: timings[i] ?? undefined
        }));
        await karaokeStore.updateSong(song.id, { sentences: newSentences });
        isSyncMode = false;
    };

    /**
     * Cancels sync mode without saving.
     */
    const handleCancelSync = (): void => {
        isSyncMode = false;
    };

    /**
     * Seeks to a specific time and starts playing.
     */
    const handleVerseSeek = (time: number) => {
        currentTime = time;
        if (isPaused) {
            isPaused = false;
        }
    };

    // Extract audioBlob separately so the effect only re-runs when the blob changes
    let audioBlob = $derived(song?.audioBlob);

    $effect(() => {
        if (audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            audioUrl = url;
            return () => URL.revokeObjectURL(url);
        } else {
            audioUrl = null;
        }
    });
</script>

{#snippet headerContent()}
    <div class="flex max-w-full items-center gap-4 sm:w-auto">
        <button
            class="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            onclick={() => goto('/karaoke')}
            aria-label="Back to songs"
        >
            <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="3"
                    d="M15 19l-7-7 7-7"
                />
            </svg>
        </button>
        {#if song}
            <div class="flex flex-1 flex-col overflow-hidden">
                <div class="flex items-center gap-2">
                    <h1
                        class="truncate text-lg font-bold text-[var(--color-text)]"
                    >
                        {song.title}
                    </h1>
                    {#if isAnalyzing}
                        <span class="text-xs text-[var(--color-text-muted)]">
                            {analysisPercentage}%
                        </span>
                    {/if}
                </div>
                <div class="flex items-center gap-2">
                    <p class="truncate text-sm text-[var(--color-text-muted)]">
                        {song.artist}
                    </p>
                    {#if isAnalyzing}
                        <!-- Progress bar -->
                        <div
                            class="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-surface-hover)]"
                        >
                            <div
                                class="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                                style="width: {analysisPercentage}%"
                            ></div>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
{/snippet}

{#snippet headerRightContent()}
    {#if song}
        {#if hasAnalysis || isAnalyzing}
            <button
                onclick={togglePanel}
                class={[
                    'flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
                    isPanelExpanded
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary)]'
                ].join(' ')}
                aria-label={isPanelExpanded
                    ? 'Close analysis panel'
                    : 'Open analysis panel'}
            >
                <svg
                    class="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
            </button>
        {/if}

        <!-- Analysis button -->
        {#if isAnalyzing}
            <div class="flex items-center gap-3">
                <button
                    onclick={cancelAnalysis}
                    class="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500 bg-red-500/10 p-0 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/20 sm:w-auto sm:px-4 sm:py-2 dark:text-red-400"
                >
                    <svg
                        class="h-5 w-5 sm:hidden"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                    <span class="hidden sm:inline">Cancel</span>
                </button>
            </div>
        {:else}
            <div class="flex items-center gap-3">
                {#if !isAnalysisComplete}
                    <button
                        onclick={() => startAnalysis(false)}
                        disabled={furiganaProcessor.isProcessing}
                        class="flex h-10 w-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:justify-start sm:px-4 sm:py-2"
                    >
                        <svg
                            class="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                            />
                        </svg>
                        <span class="hidden sm:inline">Analyze</span>
                    </button>
                {/if}
                <SongOptionsMenu
                    onDelete={confirmDelete}
                    onAddAudio={() => (showAddAudioDialog = true)}
                    hasAudio={!!song.audioBlob}
                    onAnalyze={() => startAnalysis(true)}
                    showReanalyze={isAnalysisComplete}
                    onToggleSync={toggleSyncMode}
                    isSyncActive={isSyncMode}
                    onEdit={() => (showEditSongDialog = true)}
                />
            </div>
        {/if}

        {#if furiganaProcessor.isProcessing}
            <div
                class="flex items-center gap-2 text-xs text-[var(--color-primary)]"
            >
                <div
                    class="h-2 w-2 animate-bounce rounded-full bg-current"
                ></div>
                <div
                    class="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:0.2s]"
                ></div>
                <div
                    class="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:0.4s]"
                ></div>
            </div>
        {/if}
    {/if}
{/snippet}

<div
    class="relative flex h-screen flex-col overflow-hidden bg-[var(--color-bg)]"
>
    <NotesBackground />
    <div class="relative z-10 flex h-full flex-col">
        <!-- Header/Nav -->
        <TopNav leftContent={headerContent} rightContent={headerRightContent} />

        {#if song}
            <div class="flex min-h-0 w-full flex-1 overflow-hidden">
                <!-- Main content column: Player + Lyrics -->
                <div class="flex min-w-0 flex-1 flex-col">
                    {#if audioUrl}
                        <AudioPlayer
                            src={audioUrl}
                            bind:currentTime
                            bind:paused={isPaused}
                        />
                    {/if}

                    {#if isSyncMode}
                        <SyncLyricsMode
                            sentences={song.sentences}
                            {currentTime}
                            hasAudio={!!audioUrl}
                            coverUrl={song.coverUrl}
                            onSave={handleSaveSync}
                            onCancel={handleCancelSync}
                            onVerseDbClick={handleVerseSeek}
                        />
                    {:else}
                        <div
                            class="flex-1 overflow-y-auto py-6 pr-6 pl-20 [direction:rtl]"
                        >
                            <div
                                class="mx-auto flex max-w-3xl flex-col gap-6 pb-20 text-center [direction:ltr]"
                            >
                                {#if song.coverUrl}
                                    <div
                                        class="mx-auto mb-4 h-48 w-48 overflow-hidden rounded-2xl shadow-xl"
                                    >
                                        <img
                                            src={song.coverUrl}
                                            alt={song.title}
                                            class="h-full w-full object-cover"
                                        />
                                    </div>
                                {/if}

                                <AnalyzableLyrics
                                    sentences={song.sentences}
                                    {analysisResults}
                                    {highlightedTerm}
                                    {currentTime}
                                    onTermHover={handleTermHover}
                                    onTermClick={handleTermClick}
                                    onVerseDbClick={handleVerseSeek}
                                />
                                <p
                                    class="mx-auto mt-6 max-w-lg text-xs leading-relaxed text-[var(--color-text-muted)] opacity-80"
                                >
                                    Just a friendly heads-up: the autogenerated
                                    furigana aren't always 100% accurate. <br />
                                    Click on the <strong>Analyze</strong> button to
                                    improve them, but still keep an eye out for errors.
                                </p>
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Analysis Panel (shows when analyzing or has results, hidden in sync mode) -->
                {#if (hasAnalysis || isAnalyzing) && !isSyncMode}
                    <SongAnalysisPanel
                        bind:this={panelComponent}
                        {analysisResults}
                        isExpanded={isPanelExpanded}
                        {isAnalyzing}
                        {highlightedTerm}
                        onTermHover={handleTermHover}
                        onTermClick={handlePanelTermClick}
                        songId={song.id}
                        sentences={song.sentences}
                    />
                {/if}
            </div>
        {:else if !karaokeStore.initialized}
            <div
                class="flex h-[50vh] items-center justify-center text-[var(--color-text-muted)]"
            >
                <div class="flex flex-col items-center gap-4">
                    <div
                        class="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"
                    ></div>
                    <p>Loading library...</p>
                </div>
            </div>
        {:else}
            <div
                class="flex h-[50vh] items-center justify-center text-[var(--color-text-muted)]"
            >
                Song not found
            </div>
        {/if}
    </div>
</div>

{#if showAddAudioDialog && song}
    <AddAudioDialog
        songId={song.id}
        songTitle={song.title}
        artistName={song.artist}
        expectedDuration={song.expectedDuration}
        onClose={() => (showAddAudioDialog = false)}
    />
{/if}

{#if showEditSongDialog && song}
    <EditSongDialog
        songId={song.id}
        currentTitle={song.title}
        currentArtist={song.artist}
        currentCoverUrl={song.coverUrl}
        currentLyrics={song.lyrics}
        sentences={song.sentences}
        onClose={() => (showEditSongDialog = false)}
    />
{/if}
