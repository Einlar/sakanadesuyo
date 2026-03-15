<script lang="ts">
    interface Props {
        sent: number;
        received: number;
    }

    let { sent, received }: Props = $props();
</script>

<div class="flex flex-col gap-3 text-sm text-[var(--color-text-muted)]">
    <div class="flex justify-between">
        <span>Sending</span>
        <span class="font-medium text-[var(--color-text)]">{sent} items</span>
    </div>
    <div class="flex justify-between">
        <span>Receiving</span>
        <span class="font-medium text-[var(--color-text)]">{received} items</span>
    </div>
</div>
