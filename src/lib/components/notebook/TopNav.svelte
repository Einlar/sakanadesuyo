<script lang="ts">
    import SettingsDialog from '$lib/components/SettingsDialog.svelte';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';
    import SyncIcon from '$lib/components/icons/SyncIcon.svelte';
</script>

<div class="fixed top-4 right-4 z-50 flex items-center gap-3">
    <a
        href="/"
        class="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm font-medium text-[var(--color-text-muted)] shadow-sm backdrop-blur-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary)] active:scale-95"
    >
        Analyzer
    </a>
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
