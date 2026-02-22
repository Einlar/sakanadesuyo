<script lang="ts">
    import type { KaraokeSong } from '$lib/stores/karaokeStore.svelte';

    interface Props {
        song: KaraokeSong;
        onClick: () => void;
    }

    let { song, onClick }: Props = $props();
</script>

<button
    class="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
    onclick={onClick}
>
    {#if song.coverUrl}
        <img
            src={song.coverUrl}
            alt="{song.title} cover"
            class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div
            class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
        ></div>
    {:else}
        <div
            class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] opacity-30"
        >
            <span class="text-6xl">🎵</span>
        </div>
    {/if}

    <div class="absolute right-0 bottom-0 left-0 p-4 text-left">
        <h3 class="truncate text-lg font-bold text-white drop-shadow-lg">
            {song.title}
        </h3>
        <p class="truncate text-sm text-white/80 drop-shadow">
            {song.artist}
        </p>
    </div>
</button>
