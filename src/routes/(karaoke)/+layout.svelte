<script lang="ts">
    import NotesBackground from '$lib/components/karaoke/NotesBackground.svelte';
    import { karaokeStore } from '$lib/stores/karaokeStore.svelte';

    let { children } = $props();

    $effect(() => {
        karaokeStore.init();
    });
</script>

<div class="relative min-h-screen bg-[var(--color-bg)]">
    <NotesBackground />
    <main class="relative z-10">
        {@render children()}
    </main>
</div>
