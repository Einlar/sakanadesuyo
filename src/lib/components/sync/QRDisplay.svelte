<script lang="ts">
    interface Props {
        qrSvg: string;
        pairUrl: string;
    }

    let { qrSvg, pairUrl }: Props = $props();

    let copied = $state(false);

    async function copyLink() {
        await navigator.clipboard.writeText(pairUrl);
        copied = true;
        setTimeout(() => (copied = false), 2000);
    }
</script>

<div class="flex flex-col items-center gap-4">
    <div
        class="rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-sm"
        style="width: 200px; height: 200px;"
    >
        {@html qrSvg}
    </div>

    <div class="flex w-full items-center gap-2">
        <input
            type="text"
            readonly
            value={pairUrl}
            class="flex-1 truncate rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-muted)]"
        />
        <button
            onclick={copyLink}
            class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
        >
            {copied ? 'Copied!' : 'Copy'}
        </button>
    </div>
</div>
