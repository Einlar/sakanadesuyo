<script lang="ts">
    interface Props {
        position: { top: number; left: number };
        onclick: () => void;
    }

    let { position, onclick }: Props = $props();
</script>

<button
    class="fixed z-[100] rounded-lg border-none bg-[var(--color-primary)] px-3 py-2 text-sm font-medium whitespace-nowrap text-black shadow-[0_4px_12px_oklch(0_0_0/0.3)] transition-transform duration-100 hover:-translate-y-px"
    style="top: {position.top}px; left: {position.left}px;"
    {onclick}
>
    🔍 Analyze
</button>
