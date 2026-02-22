<script lang="ts">
    import { fly, fade } from 'svelte/transition';
    import { removeToast, type Toast } from '$lib/stores/toast';

    let { toast } = $props<{ toast: Toast }>();

    function handleClick() {
        removeToast(toast.id);
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    class="pointer-events-auto flex w-80 cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg ring-1 ring-black/5 transition-all hover:bg-[var(--color-surface-hover)] dark:ring-white/10"
    in:fly={{ y: 20, duration: 300 }}
    out:fade={{ duration: 200 }}
    onclick={handleClick}
    role="alert"
>
    <div class="flex-shrink-0 pt-0.5">
        {#if toast.type === 'success'}
            <svg
                class="h-5 w-5 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
        {:else if toast.type === 'error'}
            <svg
                class="h-5 w-5 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
        {:else}
            <svg
                class="h-5 w-5 text-[var(--color-primary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
        {/if}
    </div>
    <div class="flex-1">
        <p class="text-sm leading-5 font-medium text-[var(--color-text)]">
            {toast.message}
        </p>
    </div>
</div>
