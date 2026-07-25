<script lang="ts">
    import { page } from '$app/state';
    import { clickOutside } from '$lib/actions/clickOutside';
    import SectionsIcon from '$lib/components/icons/SectionsIcon.svelte';
    import { fly } from 'svelte/transition';

    let isOpen = $state(false);
    let triggerButton = $state<HTMLButtonElement>();

    /** The top-level sections of the app, in navigation order. */
    const sections = [
        {
            href: '/',
            label: 'Analyzer',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2c0 4.418-2.686 8-6 8m9-4a18.022 18.022 0 01-3.588 5.5M15 21l4-9 4 9m-7.5-2h7" />`
        },
        {
            href: '/karaoke',
            label: 'Karaoke',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />`
        },
        {
            href: '/notebook',
            label: 'Notebook',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />`
        }
    ];

    /** The section the current URL belongs to (nested routes count as their section). */
    const currentHref = $derived(
        sections.find(
            (s) => s.href !== '/' && page.url.pathname.startsWith(s.href)
        )?.href ?? '/'
    );

    /** Closes the menu. */
    function closeMenu() {
        isOpen = false;
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') closeMenu();
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="relative inline-block text-left">
    <button
        bind:this={triggerButton}
        onclick={() => (isOpen = !isOpen)}
        class="flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[var(--color-text-muted)] shadow-sm backdrop-blur-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary)] active:scale-95"
        aria-label="Switch section"
        aria-expanded={isOpen}
        aria-haspopup="true"
    >
        <SectionsIcon class="h-5 w-5" />
    </button>

    {#if isOpen}
        <div
            use:clickOutside={{ callback: closeMenu, ignore: triggerButton }}
            class="absolute top-full right-0 z-50 mt-2 flex w-40 flex-col gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl"
            transition:fly={{ y: 10, duration: 150 }}
        >
            {#each sections as section}
                <a
                    href={section.href}
                    onclick={closeMenu}
                    aria-current={section.href === currentHref
                        ? 'page'
                        : undefined}
                    class={[
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        section.href === currentHref
                            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            : 'text-[var(--color-text)] hover:bg-[var(--color-bg)]'
                    ].join(' ')}
                >
                    <svg
                        class="h-5 w-5 opacity-70"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        {@html section.icon}
                    </svg>
                    {section.label}
                </a>
            {/each}
        </div>
    {/if}
</div>
