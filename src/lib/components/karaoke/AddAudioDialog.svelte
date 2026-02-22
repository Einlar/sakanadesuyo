<script lang="ts">
    import { karaokeStore } from '$lib/stores/karaokeStore.svelte';

    interface Props {
        /** Song title for display */
        songTitle: string;
        /** Artist name for display */
        artistName: string;
        /** Expected duration in seconds from synced lyrics */
        expectedDuration?: number;
        /** Song ID to update with the audio blob */
        songId: string;
        /** Callback when dialog is closed */
        onClose: () => void;
    }

    let { songTitle, artistName, expectedDuration, songId, onClose }: Props =
        $props();

    let dialog: HTMLDialogElement;
    let fileInput: HTMLInputElement;
    let selectedFile = $state<File | null>(null);
    let fileDuration = $state<number | null>(null);
    let isLoading = $state(false);

    $effect(() => {
        if (dialog && !dialog.open) {
            dialog.showModal();
        }
    });

    /**
     * Formats seconds as mm:ss
     */
    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    let durationDiff = $derived(
        fileDuration !== null && expectedDuration !== undefined
            ? Math.abs(fileDuration - expectedDuration)
            : null
    );

    let hasDurationWarning = $derived(
        durationDiff !== null && durationDiff > 5
    );

    /**
     * Handles file selection and extracts audio duration
     */
    async function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) {
            selectedFile = null;
            fileDuration = null;
            return;
        }

        const file = input.files[0];
        if (!file.type.startsWith('audio/')) {
            alert('Please select a valid audio file.');
            input.value = '';
            selectedFile = null;
            fileDuration = null;
            return;
        }

        selectedFile = file;

        // Extract duration using Audio element
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);

        audio.addEventListener('loadedmetadata', () => {
            fileDuration = audio.duration;
            URL.revokeObjectURL(url);
        });

        audio.addEventListener('error', () => {
            fileDuration = null;
            URL.revokeObjectURL(url);
        });
    }

    async function handleConfirm() {
        if (!selectedFile) return;

        isLoading = true;
        try {
            await karaokeStore.updateSong(songId, { audioBlob: selectedFile });
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
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
    bind:this={dialog}
    class="m-auto min-h-[400px] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-0 text-left shadow-2xl transition-all duration-300 backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex"
    onclose={onClose}
    onclick={handleBackdropClick}
>
    <!-- Header -->
    <div
        class="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4"
    >
        <h2 class="text-xl font-bold text-[var(--color-text)]">
            Add Audio File
        </h2>
        <button
            class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-2xl text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            onclick={closeDialog}
        >
            ×
        </button>
    </div>

    <!-- Body -->
    <div class="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <!-- Upload Icon (Heroicons musical-note) -->
        <svg
            class="h-16 w-16 text-[var(--color-primary)]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>

        <!-- Song Info -->
        <div class="text-center">
            <h3 class="text-lg font-semibold text-[var(--color-text)]">
                {songTitle}
            </h3>
            <p class="text-sm text-[var(--color-text-muted)]">{artistName}</p>
            {#if fileDuration !== null && expectedDuration}
                <p class="mt-2 text-sm text-[var(--color-text-muted)]">
                    Duration: <span class="font-medium text-[var(--color-text)]"
                        >{formatDuration(fileDuration)}</span
                    >
                    <span class="opacity-70">
                        / {formatDuration(expectedDuration)}</span
                    >
                </p>
            {:else if expectedDuration}
                <p class="mt-2 text-sm text-[var(--color-text-muted)]">
                    Expected duration: <span
                        class="font-medium text-[var(--color-primary)]"
                        >{formatDuration(expectedDuration)}</span
                    >
                </p>
            {/if}
        </div>

        <!-- Custom File Input -->
        <div class="flex w-full flex-col items-center gap-3">
            <input
                bind:this={fileInput}
                id="audio-file"
                type="file"
                accept="audio/*"
                class="hidden"
                onchange={handleFileSelect}
            />
            <button
                type="button"
                data-testid="file-select-button"
                onclick={() => fileInput?.click()}
                class="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-hover)]"
            >
                {selectedFile ? selectedFile.name : 'Choose audio file'}
            </button>
        </div>

        <!-- Duration Warning -->
        {#if hasDurationWarning}
            <div
                class="flex w-full items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400"
            >
                <svg
                    class="mt-0.5 h-5 w-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
                <div class="text-sm">
                    <strong>Duration mismatch</strong>
                    <p class="mt-1 opacity-80">
                        Differs by {durationDiff?.toFixed(1)}s from expected.
                        This may cause syncing issues.
                    </p>
                </div>
            </div>
        {/if}
    </div>

    <!-- Footer -->
    <div
        class="flex justify-end border-t border-[var(--color-border)] px-6 py-4"
    >
        <button
            class="cursor-pointer rounded-lg border-none bg-[var(--color-primary)] px-6 py-2 font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            onclick={handleConfirm}
            disabled={!selectedFile || isLoading}
        >
            {#if isLoading}
                Adding...
            {:else}
                Add Audio
            {/if}
        </button>
    </div>
</dialog>
