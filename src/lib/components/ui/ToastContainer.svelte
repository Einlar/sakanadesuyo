<script lang="ts">
    import { toasts } from '$lib/stores/toast';
    import Toast from './Toast.svelte';
</script>

<div
    class="pointer-events-none fixed right-6 bottom-6 z-[9999] flex flex-col gap-3"
>
    {#each $toasts as toast (toast.id)}
        <Toast {toast} />
    {/each}
</div>
