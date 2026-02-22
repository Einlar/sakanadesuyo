<script lang="ts">
    import { fade, fly } from 'svelte/transition';
    import { portal } from '$lib/actions/portal';
    import { clickOutside } from '$lib/actions/clickOutside';
    import { settings } from '$lib/stores/settings.svelte';
    import { MediaQuery } from 'svelte/reactivity';
    import { untrack } from 'svelte';

    let {
        onDelete,
        onAddAudio,
        hasAudio,
        onAnalyze,
        showReanalyze,
        onToggleSync,
        isSyncActive = false,
        onEdit
    }: {
        onDelete: () => void;
        onAddAudio: () => void;
        hasAudio: boolean;
        onAnalyze?: () => void;
        showReanalyze?: boolean;
        onToggleSync?: () => void;
        isSyncActive?: boolean;
        onEdit?: () => void;
    } = $props();

    let isOpen = $state(false);
    const isMobile = new MediaQuery('(max-width: 639px)');
    let triggerButton = $state<HTMLButtonElement>();

    // Detect mobile/desktop using matchMedia (640px = Tailwind's sm breakpoint)
    $effect(() => {
        isMobile.current;
        untrack(() => {
            // Close menu when switching between mobile/desktop to avoid stale state
            if (isOpen) closeMenu();
        });
    });

    /**
     * Toggles the menu open/closed state.
     */
    function toggleMenu() {
        isOpen = !isOpen;
    }

    /** Closes the menu. */
    function closeMenu() {
        isOpen = false;
    }

    const menuItems = $derived([
        ...(showReanalyze
            ? [
                  {
                      label: 'Re-analyze',
                      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />`,
                      action: () => {
                          closeMenu();
                          onAnalyze?.();
                      },
                      variant: 'default'
                  }
              ]
            : []),
        ...(onToggleSync
            ? [
                  {
                      label: isSyncActive ? 'Exit Sync Mode' : 'Sync Lyrics',
                      icon: isSyncActive
                          ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />`
                          : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />`,
                      action: () => {
                          closeMenu();
                          onToggleSync?.();
                      },
                      variant: isSyncActive ? 'active' : 'default'
                  }
              ]
            : []),
        ...(onEdit
            ? [
                  {
                      label: 'Edit Song',
                      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />`,
                      action: () => {
                          closeMenu();
                          onEdit?.();
                      },
                      variant: 'default'
                  }
              ]
            : []),
        {
            label: settings.showFurigana ? 'Hide Furigana' : 'Show Furigana',
            icon: settings.showFurigana
                ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />`
                : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`,
            action: () => {
                settings.toggleFurigana();
            },
            variant: settings.showFurigana ? 'default' : 'active'
        },
        {
            label: hasAudio ? 'Manage MP3' : 'Add MP3',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />`,
            action: () => {
                closeMenu();
                onAddAudio();
            },
            variant: 'default'
        },
        {
            label: 'Delete Song',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />`,
            action: () => {
                closeMenu();
                onDelete();
            },
            variant: 'danger'
        }
    ]);
</script>

<div class="relative inline-block text-left">
    <button
        bind:this={triggerButton}
        onclick={toggleMenu}
        class="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] focus:outline-none sm:w-auto sm:px-3"
        aria-label="More options"
        aria-expanded={isOpen}
        aria-haspopup="true"
    >
        <svg
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
        </svg>
    </button>

    {#if isOpen && isMobile.current}
        <!-- Mobile Menu (Portaled to body to avoid stacking context/overflow issues) -->
        <div use:portal>
            <!-- Backdrop -->
            <div
                role="presentation"
                class="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity"
                transition:fade={{ duration: 200 }}
                onclick={closeMenu}
            ></div>

            <!-- Bottom Sheet Content -->
            <div
                class="fixed right-0 bottom-0 left-0 z-[101] flex flex-col gap-2 rounded-t-2xl border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl"
                transition:fly={{ y: 20, duration: 200 }}
            >
                <div
                    class="mx-auto mb-4 h-1 w-12 rounded-full bg-[var(--color-border)]"
                ></div>

                <div
                    class="mb-2 px-2 text-sm font-semibold text-[var(--color-text-muted)]"
                >
                    Song Options
                </div>

                {#each menuItems as item}
                    <button
                        onclick={item.action}
                        class={[
                            'flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors',
                            item.variant === 'danger'
                                ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400'
                                : item.variant === 'active'
                                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20'
                                  : 'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-bg)]'
                        ].join(' ')}
                    >
                        <svg
                            class="h-5 w-5 opacity-70"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {@html item.icon}
                        </svg>
                        {item.label}
                    </button>
                {/each}

                <button
                    onclick={closeMenu}
                    class="mt-2 flex w-full items-center justify-center rounded-xl bg-[var(--color-bg)] py-3 text-sm font-medium text-[var(--color-text)]"
                >
                    Cancel
                </button>
            </div>
        </div>
    {/if}

    {#if isOpen && !isMobile.current}
        <!-- Desktop Menu: uses clickOutside action instead of backdrop -->
        <div
            use:clickOutside={{ callback: closeMenu, ignore: triggerButton }}
            class="absolute top-full right-0 z-50 mt-2 flex w-56 flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl"
            transition:fly={{ y: 10, duration: 150 }}
        >
            {#each menuItems as item}
                <button
                    onclick={item.action}
                    class={[
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                        item.variant === 'danger'
                            ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400'
                            : item.variant === 'active'
                              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20'
                              : 'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-bg)]'
                    ].join(' ')}
                >
                    <svg
                        class="h-5 w-5 opacity-70"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        {@html item.icon}
                    </svg>
                    {item.label}
                </button>
            {/each}
        </div>
    {/if}
</div>
