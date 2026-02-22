<script lang="ts">
    import CameraIcon from './icons/CameraIcon.svelte';
    import XIcon from './icons/XIcon.svelte';

    interface Props {
        value?: string;
        onimage?: (file: File) => void;
        onempty?: () => void;
        disabled?: boolean;
    }

    let {
        value = $bindable(''),
        onimage,
        onempty,
        disabled = false
    }: Props = $props();

    let fileInput: HTMLInputElement;

    function handleClear() {
        value = '';
        onempty?.();
    }

    function handleInput(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.value === '') {
            onempty?.();
        }
    }

    function handlePaste(e: ClipboardEvent) {
        const items = e.clipboardData?.items;
        if (!items || !onimage) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    e.preventDefault();
                    onimage(file);
                    return;
                }
            }
        }
    }

    function handleCameraClick() {
        fileInput?.click();
    }

    function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file && onimage) {
            onimage(file);
            target.value = '';
        }
    }
</script>

<div class="relative w-full">
    <input
        type="file"
        accept="image/*"
        class="hidden"
        bind:this={fileInput}
        onchange={handleFileChange}
    />
    <input
        name="sentence"
        type="text"
        bind:value
        oninput={handleInput}
        onpaste={handlePaste}
        placeholder="日本語の文を入力してください..."
        aria-label="Japanese sentence input"
        {disabled}
        class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pr-10 text-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] transition-colors outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
    />
    {#if value}
        <button
            type="button"
            onclick={handleClear}
            class="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            title="Clear"
            aria-label="Clear input"
        >
            <XIcon size={18} />
        </button>
    {:else if onimage}
        <button
            type="button"
            onclick={handleCameraClick}
            class="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            title="Upload image"
            aria-label="Upload image"
        >
            <CameraIcon size={20} />
        </button>
    {/if}
</div>
