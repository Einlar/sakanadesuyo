<script lang="ts">
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';
    import SettingsDialog from '$lib/components/SettingsDialog.svelte';
    import SyncIcon from '$lib/components/icons/SyncIcon.svelte';
    import type { Snippet } from 'svelte';

    let {
        leftContent,
        rightContent
    }: {
        leftContent?: Snippet;
        rightContent?: Snippet;
    } = $props();
</script>

<header class="relative z-20">
    <div
        class="absolute inset-0 -z-10 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-sm"
    ></div>
    <div class="flex flex-wrap items-center gap-y-2 px-6 py-4">
        {#if leftContent}
            {@render leftContent()}
        {:else}
            <a
                href="/karaoke"
                class="text-xl font-bold text-[var(--color-text)] transition-colors hover:text-[var(--color-primary)]"
            >
                Karaoke
            </a>
        {/if}
        <div class="ml-auto flex items-center gap-3">
            {#if rightContent}
                {@render rightContent()}
            {/if}
            <a
                href="/sync"
                class="flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[var(--color-text-muted)] shadow-sm backdrop-blur-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary)] active:scale-95"
                aria-label="Sync data"
            >
                <SyncIcon class="h-5 w-5" />
            </a>
            <SettingsDialog />
            <ThemeToggle />
        </div>
    </div>
</header>
