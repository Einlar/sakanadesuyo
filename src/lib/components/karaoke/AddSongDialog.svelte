<script lang="ts">
    import { karaokeStore } from '$lib/stores/karaokeStore.svelte';
    import { parseLrc } from '$lib/utils/parseLrc';

    interface Props {
        onClose: () => void;
    }

    let { onClose }: Props = $props();

    let dialog: HTMLDialogElement;
    let title = $state('');
    let artist = $state('');
    let isSearching = $state(false);
    let searchError = $state<string | null>(null);
    let hasSearched = $state(false);

    // Editable lyrics state
    let editableLyrics = $state('');
    let coverUrl = $state<string | undefined>(undefined);
    let trackName = $state('');
    let artistName = $state('');
    let duration = $state<number | undefined>(undefined);

    // Track if we received synced lyrics from API (vs user-entered LRC)
    let apiSyncedLyrics = $state<string | null>(null);

    /**
     * Detects if the lyrics contain LRC timestamps.
     * Returns true if at least one line matches the LRC format.
     */
    const lrcTimestampRegex = /^\[\d{2}:\d{2}\.\d{2,3}\]/;
    let detectedLrcInLyrics = $derived.by(() => {
        const lines = editableLyrics.split('\n');
        return lines.some((line) => lrcTimestampRegex.test(line.trim()));
    });

    // Combined check: either API gave us synced lyrics, or user typed/pasted LRC format
    let hasSyncedLyrics = $derived(!!apiSyncedLyrics || detectedLrcInLyrics);
    let hasLyrics = $derived(!!editableLyrics.trim());

    $effect(() => {
        if (dialog && !dialog.open) {
            dialog.showModal();
        }
    });

    /**
     * Handles the lyrics search API call.
     */
    async function handleSearch(): Promise<void> {
        if (!title.trim() || !artist.trim()) {
            searchError = 'Please enter both title and artist';
            return;
        }

        isSearching = true;
        searchError = null;
        hasSearched = false;

        try {
            const params = new URLSearchParams({
                title: title.trim(),
                artist: artist.trim()
            });

            console.log(
                `[AddSong] Searching for: title="${title.trim()}", artist="${artist.trim()}"`
            );
            const response = await fetch(`/api/karaoke/lyrics?${params}`);
            console.log('[AddSong] Response status:', response.status);

            if (!response.ok) {
                throw new Error('Failed to fetch lyrics');
            }

            const result = await response.json();

            if (!result.data?.lyrics) {
                // No lyrics found - allow manual entry
                hasSearched = true;
                editableLyrics = '';
                apiSyncedLyrics = null;
                coverUrl = undefined;
                trackName = title.trim();
                artistName = artist.trim();
                duration = undefined;
                searchError =
                    'No lyrics found. You can enter them manually below.';
                return;
            }

            // Populate editable state from API response
            // If synced lyrics exist, show those in the editor; otherwise show plain lyrics
            apiSyncedLyrics = result.data.syncedLyrics || null;
            editableLyrics = apiSyncedLyrics || result.data.lyrics;
            coverUrl = result.data.artworkUrl;
            trackName = result.data.trackName || title;
            artistName = result.data.artistName || artist;
            duration = result.data.duration || undefined;
            hasSearched = true;
            searchError = null;
        } catch (e) {
            searchError =
                e instanceof Error ? e.message : 'Failed to search for lyrics';
            hasSearched = true;
            // Allow manual entry on error
            editableLyrics = '';
            apiSyncedLyrics = null;
            trackName = title.trim();
            artistName = artist.trim();
        } finally {
            isSearching = false;
        }
    }

    /**
     * Confirms and adds the song to the store.
     */
    async function handleConfirm(): Promise<void> {
        if (!hasLyrics) return;

        // Parse lyrics - detect LRC format and parse accordingly
        const hasLrcFormat = detectedLrcInLyrics;
        const sentences = hasLrcFormat
            ? parseLrc(editableLyrics)
            : editableLyrics
                  .split('\n')
                  .filter((line: string) => line.trim())
                  .map((text: string) => ({ text }));

        // For plain lyrics storage, strip timestamps if present
        const plainLyrics = hasLrcFormat
            ? sentences.map((s) => s.text).join('\n')
            : editableLyrics;

        const song = await karaokeStore.addSong({
            title: trackName || title.trim(),
            artist: artistName || artist.trim(),
            coverUrl: coverUrl,
            lyrics: plainLyrics
        });

        // Update with parsed sentences (including timestamps if synced) and expected duration
        if (hasLrcFormat || duration) {
            await karaokeStore.updateSong(song.id, {
                sentences: hasLrcFormat ? sentences : song.sentences,
                expectedDuration: duration
            });
        }

        closeDialog();
    }

    /**
     * Resets the dialog to allow a new search.
     */
    function handleSearchAgain(): void {
        hasSearched = false;
        editableLyrics = '';
        apiSyncedLyrics = null;
        coverUrl = undefined;
        trackName = '';
        artistName = '';
        duration = undefined;
        searchError = null;
    }

    function closeDialog(): void {
        dialog.close();
    }

    function handleBackdropClick(e: MouseEvent): void {
        if (e.target === dialog) {
            closeDialog();
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
    data-testid="add-song-dialog"
    bind:this={dialog}
    class="m-auto max-h-[90vh]
           w-full max-w-4xl
           flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-0 text-left shadow-2xl
           transition-all duration-300 backdrop:bg-black/50
           backdrop:backdrop-blur-sm open:flex"
    class:max-w-lg={!hasSearched}
    onclose={onClose}
    onclick={handleBackdropClick}
>
    <!-- Header -->
    <div
        class="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4"
    >
        <h2 class="text-xl font-bold text-[var(--color-text)]">Add New Song</h2>
        <button
            class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-2xl text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            onclick={closeDialog}
        >
            ×
        </button>
    </div>

    <!-- Body -->
    <div class="flex flex-1 flex-col overflow-hidden md:flex-row">
        <!-- Form Side -->
        <div
            class="flex flex-col gap-4 p-6 {hasSearched
                ? 'w-full md:w-1/2'
                : 'w-full'}"
        >
            <div>
                <label
                    for="song-title"
                    class="mb-2 block text-sm font-medium text-[var(--color-text)]"
                >
                    Song Title
                </label>
                <input
                    id="song-title"
                    type="text"
                    bind:value={title}
                    placeholder="e.g., Lemon"
                    class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
                />
            </div>

            <div>
                <label
                    for="song-artist"
                    class="mb-2 block text-sm font-medium text-[var(--color-text)]"
                >
                    Artist
                </label>
                <input
                    id="song-artist"
                    type="text"
                    bind:value={artist}
                    placeholder="e.g., Kenshi Yonezu"
                    class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
                    onkeydown={(e) => e.key === 'Enter' && handleSearch()}
                />
            </div>

            {#if searchError && !hasSearched}
                <p class="text-sm text-red-500">{searchError}</p>
            {/if}

            <button
                class="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-[var(--color-primary)] px-6 py-3 font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                onclick={handleSearch}
                disabled={isSearching || !title.trim() || !artist.trim()}
            >
                {#if isSearching}
                    <div
                        class="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black"
                    ></div>
                    Searching...
                {:else}
                    {hasSearched ? 'Re-search' : 'Search Lyrics'}
                {/if}
            </button>
        </div>

        <!-- Lyrics Editor Side -->
        {#if hasSearched}
            <div
                class="flex flex-col border-t border-[var(--color-border)] bg-[var(--color-surface)] md:w-1/2 md:border-t-0 md:border-l"
            >
                <!-- Cover and Info -->
                <div
                    class="flex items-center gap-4 border-b border-[var(--color-border)] p-4"
                >
                    {#if coverUrl}
                        <img
                            src={coverUrl}
                            alt="Album cover"
                            class="h-16 w-16 rounded-lg object-cover shadow"
                        />
                    {:else}
                        <div
                            class="flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--color-primary)]/20 text-2xl"
                        ></div>
                    {/if}
                    <div class="flex-1">
                        <h3 class="font-bold text-[var(--color-text)]">
                            {trackName || title || 'Untitled'}
                        </h3>
                        <p class="text-sm text-[var(--color-text-muted)]">
                            {artistName || artist || 'Unknown Artist'}
                        </p>
                        <!-- Sync Status Tag -->
                        <div
                            class="mt-1 w-fit rounded-full px-2 py-0.5 text-xs font-semibold
                            {hasSyncedLyrics
                                ? 'bg-lime-500/20 text-lime-700 dark:text-lime-400'
                                : 'bg-red-500/20 text-red-700 dark:text-red-400'}"
                        >
                            {hasSyncedLyrics
                                ? 'Sync data available'
                                : 'Sync data unavailable'}
                        </div>
                    </div>
                </div>

                <!-- Error/Info message -->
                {#if searchError && hasSearched}
                    <div
                        class="bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400"
                    >
                        {searchError}
                    </div>
                {/if}

                <!-- Lyrics Editor -->
                <div class="flex flex-1 flex-col overflow-hidden p-4">
                    <div class="mb-2">
                        <label
                            for="lyrics-editor"
                            class="text-sm font-medium text-[var(--color-text)]"
                        >
                            Lyrics
                            {#if !hasSyncedLyrics}
                                <span
                                    class="ml-2 text-xs font-normal text-[var(--color-text-muted)]"
                                >
                                    (paste LRC format for timing data)
                                </span>
                            {/if}
                        </label>
                    </div>

                    <!-- Main Lyrics Textarea -->
                    <textarea
                        id="lyrics-editor"
                        class="min-h-40 w-full flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none md:min-h-0
                        {hasSyncedLyrics ? 'font-mono text-xs' : 'font-sans'}"
                        placeholder="Enter or paste lyrics here...&#10;&#10;Tip: Paste LRC format (e.g., [00:15.50] Lyrics text) to include timing data."
                        bind:value={editableLyrics}
                    ></textarea>
                </div>
            </div>
        {/if}
    </div>

    <!-- Footer -->
    {#if hasSearched}
        <div
            class="flex justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4"
        >
            <button
                class="cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent px-6 py-2 font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
                onclick={handleSearchAgain}
            >
                Start Over
            </button>
            <button
                class="cursor-pointer rounded-lg border-none px-6 py-2 font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50
                {hasSyncedLyrics ? 'bg-lime-500' : 'bg-[var(--color-primary)]'}"
                onclick={handleConfirm}
                disabled={!hasLyrics}
            >
                ✓ Add Song
            </button>
        </div>
    {/if}
</dialog>
