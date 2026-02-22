<script lang="ts">
    import {
        karaokeStore,
        type KaraokeSentence
    } from '$lib/stores/karaokeStore.svelte';

    interface Props {
        /** Song ID to edit */
        songId: string;
        /** Current song title */
        currentTitle: string;
        /** Current artist name */
        currentArtist: string;
        /** Current cover URL (if any) */
        currentCoverUrl?: string;
        /** Current lyrics */
        currentLyrics: string;
        /** Current sentences (to check for analysis) */
        sentences: KaraokeSentence[];
        /** Callback when dialog is closed */
        onClose: () => void;
    }

    let props: Props = $props();

    let dialog: HTMLDialogElement;
    let fileInput: HTMLInputElement;

    // Editable state
    let title = $state(props.currentTitle);
    let artist = $state(props.currentArtist);
    let lyrics = $state(props.currentLyrics);
    let coverUrl = $state(props.currentCoverUrl);
    let selectedFile = $state<File | null>(null);
    let previewUrl = $state<string | null>(null);
    let isLoading = $state(false);
    let showResetConfirmation = $state(false);

    // check if any sentence has analysis
    let hasAnalysis = $derived(props.sentences.some((s) => s.analysis));

    // Track if any changes were made
    let hasChanges = $derived(
        title.trim() !== props.currentTitle ||
            artist.trim() !== props.currentArtist ||
            lyrics.trim() !== props.currentLyrics ||
            selectedFile !== null ||
            (coverUrl === undefined && props.currentCoverUrl !== undefined)
    );

    $effect(() => {
        if (dialog && !dialog.open) {
            dialog.showModal();
        }
    });

    // Cleanup preview URL when component is destroyed
    $effect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    });

    /**
     * Handles cover image file selection and creates a preview
     */
    function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) {
            selectedFile = null;
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                previewUrl = null;
            }
            return;
        }

        const file = input.files[0];
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            input.value = '';
            selectedFile = null;
            return;
        }

        // Cleanup previous preview
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        selectedFile = file;
        previewUrl = URL.createObjectURL(file);
    }

    /**
     * Converts a file to a data URL for storage
     */
    async function fileToDataUrl(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Saves the song changes
     */
    async function handleConfirm() {
        if (!hasChanges) {
            closeDialog();
            return;
        }

        // Check for analysis reset warning
        const lyricsChanged = lyrics.trim() !== props.currentLyrics;
        if (lyricsChanged && hasAnalysis && !showResetConfirmation) {
            showResetConfirmation = true;
            return;
        }

        isLoading = true;
        try {
            const updates: {
                title?: string;
                artist?: string;
                coverUrl?: string;
                lyrics?: string;
                sentences?: KaraokeSentence[];
            } = {};

            if (title.trim() !== props.currentTitle) {
                updates.title = title.trim();
            }
            if (artist.trim() !== props.currentArtist) {
                updates.artist = artist.trim();
            }
            if (selectedFile) {
                // Convert image to data URL for persistent storage
                updates.coverUrl = await fileToDataUrl(selectedFile);
            } else if (coverUrl === undefined && props.currentCoverUrl) {
                // Remove existing cover
                updates.coverUrl = undefined;
            }

            if (lyricsChanged) {
                updates.lyrics = lyrics;
                // Re-create sentences from new lyrics.
                // This effectively resets timing and analysis, matching the requirement.
                updates.sentences = lyrics
                    .split('\n')
                    .filter((line) => line.trim())
                    .map((text) => ({ text }));
            }

            await karaokeStore.updateSong(props.songId, updates);
            closeDialog();
        } finally {
            isLoading = false;
        }
    }

    function closeDialog() {
        dialog.close();
    }

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === dialog) {
            closeDialog();
        }
    }

    /**
     * Removes the current cover image
     */
    function handleRemoveCover() {
        selectedFile = null;
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }
        coverUrl = undefined;
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
    bind:this={dialog}
    class="m-auto w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-0 text-left shadow-2xl transition-all duration-300 backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex"
    onclose={props.onClose}
    onclick={handleBackdropClick}
>
    <!-- Header -->
    <div
        class="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4"
    >
        <h2 class="text-xl font-bold text-[var(--color-text)]">Edit Song</h2>
        <button
            class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-2xl text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            onclick={closeDialog}
        >
            ×
        </button>
    </div>

    <!-- Body -->
    <div class="flex flex-col gap-6 p-6">
        <!-- Cover Image Section -->
        <div class="flex flex-col items-center gap-4">
            <div class="relative">
                {#if previewUrl || coverUrl}
                    <img
                        src={previewUrl || coverUrl}
                        alt="Cover art"
                        class="h-32 w-32 rounded-xl object-cover shadow-lg"
                    />
                    <button
                        type="button"
                        onclick={handleRemoveCover}
                        class="absolute -top-2 -right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-none bg-red-500 text-sm font-bold text-white shadow-md transition-transform hover:scale-110"
                        title="Remove cover"
                    >
                        ×
                    </button>
                {:else}
                    <div
                        class="flex h-32 w-32 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                    >
                        <svg
                            class="h-12 w-12"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                {/if}
            </div>

            <!-- Upload Button -->
            <input
                bind:this={fileInput}
                type="file"
                accept="image/*"
                class="hidden"
                onchange={handleFileSelect}
            />
            <button
                type="button"
                onclick={() => fileInput?.click()}
                class="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                </svg>
                {previewUrl || coverUrl ? 'Change cover' : 'Upload cover'}
            </button>
        </div>

        <div class="grid grid-cols-2 gap-4">
            <!-- Title Input -->
            <div>
                <label
                    for="edit-song-title"
                    class="mb-2 block text-sm font-medium text-[var(--color-text)]"
                >
                    Title
                </label>
                <input
                    id="edit-song-title"
                    type="text"
                    bind:value={title}
                    placeholder="Song title"
                    class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
                />
            </div>

            <!-- Artist Input -->
            <div>
                <label
                    for="edit-song-artist"
                    class="mb-2 block text-sm font-medium text-[var(--color-text)]"
                >
                    Artist
                </label>
                <input
                    id="edit-song-artist"
                    type="text"
                    bind:value={artist}
                    placeholder="Artist name"
                    class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
                />
            </div>
        </div>

        <!-- Lyrics Input -->
        <div>
            <label
                for="edit-song-lyrics"
                class="mb-2 block text-sm font-medium text-[var(--color-text)]"
            >
                Lyrics
            </label>
            <textarea
                id="edit-song-lyrics"
                bind:value={lyrics}
                placeholder="Song lyrics..."
                rows="8"
                class="w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
            ></textarea>
        </div>
    </div>

    <!-- Footer -->
    <div
        class="flex flex-col gap-3 border-t border-[var(--color-border)] px-6 py-4"
    >
        {#if showResetConfirmation}
            <div
                class="rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
            >
                <strong>Warning:</strong> Changing lyrics will reset the analysis
                for this song.
            </div>
        {/if}
        <div class="flex justify-end gap-3">
            <button
                class="cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent px-6 py-2 font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
                onclick={closeDialog}
            >
                Cancel
            </button>
            <button
                class={[
                    'cursor-pointer rounded-lg border-none px-6 py-2 font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
                    showResetConfirmation
                        ? 'bg-red-500 text-white'
                        : 'bg-[var(--color-primary)] text-black'
                ].join(' ')}
                onclick={handleConfirm}
                disabled={!title.trim() ||
                    !artist.trim() ||
                    !lyrics.trim() ||
                    isLoading}
            >
                {#if isLoading}
                    Saving...
                {:else if showResetConfirmation}
                    Confirm & Reset Analysis
                {:else}
                    Save Changes
                {/if}
            </button>
        </div>
    </div>
</dialog>
