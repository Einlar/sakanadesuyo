<script lang="ts">
    import {
        karaokeStore,
        type KaraokeSong
    } from '$lib/stores/karaokeStore.svelte';
    import SongCard from './SongCard.svelte';
    import AddSongDialog from './AddSongDialog.svelte';

    interface Props {
        onSelectSong: (song: KaraokeSong) => void;
    }

    let { onSelectSong }: Props = $props();

    let searchQuery = $state('');
    let showAddDialog = $state(false);

    const filteredSongs = $derived(karaokeStore.searchSongs(searchQuery));
</script>

<div class="mx-auto max-w-6xl px-4 py-8">
    <!-- Search and Add Header -->
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div class="relative flex-1">
            <input
                type="text"
                placeholder="Search songs..."
                bind:value={searchQuery}
                class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pl-10 text-[var(--color-text)] placeholder-[var(--color-text-muted)] transition-colors focus:border-[var(--color-primary)] focus:outline-none"
            />
            <svg
                class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            </svg>
        </div>
        <button
            data-testid="add-song-btn-header"
            class="flex shrink-0 cursor-pointer items-center gap-2 self-end rounded-lg border-none bg-[var(--color-primary)] px-6 py-3 font-medium text-black transition-opacity hover:opacity-90 sm:self-auto"
            onclick={() => (showAddDialog = true)}
        >
            Add Song
        </button>
    </div>

    <!-- Song Grid -->
    {#if !karaokeStore.initialized}
        <div
            class="flex h-64 items-center justify-center text-[var(--color-text-muted)]"
        >
            <div class="flex flex-col items-center gap-4">
                <div
                    class="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"
                ></div>
                <p>Loading library...</p>
            </div>
        </div>
    {:else if filteredSongs.length === 0}
        <div
            class="flex flex-col items-center justify-center py-16 text-center"
        >
            {#if searchQuery}
                <p class="text-lg text-[var(--color-text-muted)]">
                    No songs match "{searchQuery}"
                </p>
            {:else}
                <p class="mb-4 text-lg text-[var(--color-text-muted)]">
                    No songs yet. Add your first song!
                </p>
                <button
                    class="cursor-pointer rounded-lg border-none bg-[var(--color-primary)] px-6 py-3 font-medium text-black transition-opacity hover:opacity-90"
                    onclick={() => (showAddDialog = true)}
                >
                    Add Song
                </button>
            {/if}
        </div>
    {:else}
        <div
            class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
            {#each filteredSongs as song (song.id)}
                <SongCard {song} onClick={() => onSelectSong(song)} />
            {/each}
        </div>
    {/if}
</div>

{#if showAddDialog}
    <AddSongDialog onClose={() => (showAddDialog = false)} />
{/if}
