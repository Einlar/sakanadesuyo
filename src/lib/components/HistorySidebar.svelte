<script lang="ts">
    import { history } from '$lib/stores/history.svelte';
    import type { SentenceAnalysis } from '$lib/types';
    import { fade, fly } from 'svelte/transition';
    import HistoryIcon from './icons/HistoryIcon.svelte';
    import XIcon from './icons/XIcon.svelte';
    import TrashIcon from './icons/TrashIcon.svelte';

    interface Props {
        onLoad: (item: {
            sentence: string;
            context: string;
            data: SentenceAnalysis;
        }) => void;
    }

    let { onLoad }: Props = $props();

    let isOpen = $state(false);
    let toggleButton: HTMLButtonElement | undefined = $state();
    let closeButton: HTMLButtonElement | undefined = $state();

    function toggle() {
        isOpen = !isOpen;
    }

    $effect(() => {
        if (isOpen && closeButton) {
            closeButton.focus();
        }
    });

    function formatDate(timestamp: number) {
        return new Date(timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function handleLoad(item: any) {
        onLoad(item);
        isOpen = false;
        // After loading, focus might be lost or should go to main content.
        // For now, let's just close.
        toggleButton?.focus(); // Return focus to sidebar toggle for continuity
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            toggle();
            toggleButton?.focus();
        }
    }

    // Touch handling for swipe
    let touchStartX = 0;
    let touchStartY = 0;

    function handleTouchStart(e: TouchEvent) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }

    function handleTouchEnd(e: TouchEvent) {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;

        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        // Check if movement is mostly horizontal
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Swipe Right (Open) - Only if starting near left edge (e.g. 30px)
            if (diffX > 50 && touchStartX < 30 && !isOpen) {
                isOpen = true;
            }
            // Swipe Left (Close)
            else if (diffX < -50 && isOpen) {
                toggle();
            }
        }
    }

    $effect(() => {
        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchend', handleTouchEnd);
        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    });
</script>

<div
    class="pointer-events-none fixed top-0 left-0 z-50 flex h-full w-full items-start"
>
    <!-- Sidebar Content (Sliding Panel) -->
    {#if isOpen}
        <!-- Backdrop -->
        <div
            role="button"
            tabindex="-1"
            class="pointer-events-auto fixed inset-0 bg-black/20 backdrop-blur-[1px] transition-opacity"
            onclick={() => {
                toggle();
                toggleButton?.focus();
            }}
            onkeydown={handleKeyDown}
            transition:fade={{ duration: 200 }}
            aria-label="Close sidebar"
        ></div>

        <aside
            class="pointer-events-auto relative z-10 flex h-full w-80 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-2xl backdrop-blur-md transition-colors"
            transition:fly={{ x: -320, duration: 300 }}
            aria-labelledby="history-title"
        >
            <!-- Header -->
            <div
                class="flex items-center justify-between border-b border-[var(--color-border)] p-4"
            >
                <h2
                    id="history-title"
                    class="text-lg font-medium text-[var(--color-primary)]"
                >
                    History
                </h2>
                <button
                    bind:this={closeButton}
                    onclick={() => {
                        toggle();
                        toggleButton?.focus();
                    }}
                    class="rounded-full p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-text)]/5 hover:text-[var(--color-text)]"
                    aria-label="Close history"
                >
                    <XIcon size={20} />
                </button>
            </div>

            <!-- List -->
            <div
                class="flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--color-border)] [&::-webkit-scrollbar-thumb:hover]:bg-[var(--color-text-muted)] [&::-webkit-scrollbar-track]:bg-transparent"
            >
                {#if history.items.length === 0}
                    <div
                        class="flex h-40 items-center justify-center text-sm text-[var(--color-text-muted)] opacity-60"
                    >
                        No history yet
                    </div>
                {:else}
                    <div class="space-y-2">
                        {#each history.items as item (item.id)}
                            <div
                                class="group relative flex cursor-pointer flex-col gap-1 rounded-lg border border-transparent bg-black/5 p-3 transition-all hover:border-[var(--color-primary)]/30 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                                onclick={() => handleLoad(item)}
                                role="button"
                                tabindex="0"
                                onkeydown={(e) =>
                                    e.key === 'Enter' && handleLoad(item)}
                                data-testid="history-item"
                            >
                                <p
                                    class="line-clamp-2 text-sm text-[var(--color-text)]/90"
                                >
                                    {item.sentence}
                                </p>
                                <div
                                    class="mt-1 flex items-center justify-between"
                                >
                                    <span
                                        class="text-xs text-[var(--color-text-muted)] opacity-70"
                                    >
                                        {formatDate(item.timestamp)}
                                    </span>
                                    <button
                                        class="z-10 rounded p-1 text-[var(--color-text-muted)] opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 focus:opacity-100"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            history.remove(item.id);
                                        }}
                                        title="Delete"
                                        aria-label="Delete history item"
                                    >
                                        <TrashIcon size={14} />
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Footer -->
            {#if history.items.length > 0}
                <div class="border-t border-[var(--color-border)] p-4">
                    <button
                        class="w-full text-xs font-medium text-red-600 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300"
                        onclick={() => {
                            if (
                                confirm(
                                    'Are you sure you want to clear all history?'
                                )
                            ) {
                                history.clear();
                            }
                        }}
                    >
                        Clear All History
                    </button>
                </div>
            {/if}
        </aside>
    {/if}

    <!-- Toggle Button (Visible when closed) -->
    {#if !isOpen}
        <button
            bind:this={toggleButton}
            transition:fade={{ duration: 200 }}
            onclick={toggle}
            class="pointer-events-auto absolute top-4 left-4 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[var(--color-text-muted)] shadow-sm backdrop-blur-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary)] active:scale-95"
            aria-label="Open history"
            title="History"
        >
            <HistoryIcon size={20} />
        </button>
    {/if}
</div>
