<script lang="ts">
    import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte';
    import XIcon from '$lib/components/icons/XIcon.svelte';
    import ModelSelector from './ModelSelector.svelte';

    let dialog: HTMLDialogElement;

    export function open() {
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    function handleBackdropClick(e: MouseEvent) {
        // Close if clicking on the backdrop (the dialog element itself, not its content)
        if (e.target === dialog) {
            close();
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            close();
        }
    }
</script>

<button
    onclick={() => open()}
    class="flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[var(--color-text-muted)] shadow-sm backdrop-blur-sm transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary)] active:scale-95"
    aria-label="Open settings"
>
    <SettingsIcon class="h-5 w-5" />
</button>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
    bind:this={dialog}
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    class="fixed inset-0 m-auto max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
>
    <div class="flex flex-col">
        <!-- Header -->
        <div
            class="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4"
        >
            <h2 class="text-lg font-semibold text-[var(--color-text)]">
                Settings
            </h2>
            <button
                onclick={() => close()}
                class="flex items-center justify-center rounded-lg p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                aria-label="Close settings"
            >
                <XIcon class="h-5 w-5" />
            </button>
        </div>

        <!-- Content -->
        <div class="px-6 py-6">
            <ModelSelector />
        </div>
    </div>
</dialog>

<style>
    dialog::backdrop {
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
    }

    dialog[open] {
        animation: dialog-in 0.2s ease-out;
    }

    @keyframes dialog-in {
        from {
            opacity: 0;
            transform: scale(0.95);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
</style>
