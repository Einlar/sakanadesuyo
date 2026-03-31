<script lang="ts">
    import Footer from '$lib/components/Footer.svelte';
    import SettingsDialog from '$lib/components/SettingsDialog.svelte';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';

    let { children } = $props();
</script>

<div
    class="flex min-h-screen flex-col bg-[var(--color-bg)] transition-colors duration-300"
>
    <div class="fixed top-4 right-4 z-50 flex items-center gap-3">
        <a
            href="/notebook"
            class="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm font-medium text-[var(--color-text-muted)] shadow-sm backdrop-blur-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary)] active:scale-95"
        >
            Notebook
        </a>
        <SettingsDialog />
        <ThemeToggle />
    </div>
    <div class="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {@render children()}
    </div>
    <Footer />
</div>
