<script lang="ts">
    import type { Writable } from 'svelte/store';
    import type { ImageNodeContext } from './ImageExtension';
    import { api } from '$lib/api';
    import { addToast } from '$lib/stores/toast';
    import ScanIcon from '$lib/components/icons/ScanIcon.svelte';
    import CopyIcon from '$lib/components/icons/CopyIcon.svelte';

    // Props: receive the store
    let { ctxStore } = $props<{ ctxStore: Writable<ImageNodeContext> }>();

    let isResizing = $state(false);
    let isAnalyzing = $state(false);
    let startX = 0;
    let startWidth = 0;

    // Derived width from the store
    let width = $derived($ctxStore.node.attrs.width || '100%');

    function handleMouseDown(e: MouseEvent, direction: 'left' | 'right') {
        e.preventDefault();
        e.stopPropagation();

        isResizing = true;
        startX = e.clientX;

        const currentWidth = parseInt(String(width).replace('px', ''), 10);
        const wrapper = (e.target as HTMLElement).parentElement;
        startWidth = wrapper
            ? wrapper.getBoundingClientRect().width
            : currentWidth || 300;

        const onMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            e.preventDefault();

            const diff = e.clientX - startX;
            const newWidth =
                direction === 'right' ? startWidth + diff : startWidth - diff;

            if (newWidth > 20) {
                $ctxStore.updateAttributes({ width: `${newWidth}px` });
            }
        };

        const onMouseUp = () => {
            isResizing = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }
    async function handleOCR() {
        if (isAnalyzing) return;

        try {
            isAnalyzing = true;
            const src = $ctxStore.node.attrs.src;

            // Fetch the image to get a blob
            const response = await fetch(src);
            if (!response.ok) throw new Error('Failed to fetch image');

            const blob = await response.blob();
            const file = new File([blob], 'image.png', { type: blob.type });

            const result = await api.extractTextFromImage(file);

            if (result.text) {
                $ctxStore.updateAttributes({ ocrText: result.text });
                await navigator.clipboard.writeText(result.text);
                addToast('Text copied to clipboard', 'success');
            } else {
                addToast('No text found in image', 'info');
            }
        } catch (error) {
            console.error('OCR Error:', error);
            addToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to analyze image',
                'error'
            );
        } finally {
            isAnalyzing = false;
        }
    }

    async function copyOCRText() {
        const text = $ctxStore.node.attrs.ocrText;
        if (text) {
            await navigator.clipboard.writeText(text);
            addToast('Text copied to clipboard', 'success');
        }
    }
</script>

<div
    class="relative my-2 box-border inline-flex max-w-full rounded"
    class:shadow-[0_0_0_3px_oklch(0.6_0.15_250)]={$ctxStore.selected}
    style="width: {width}"
>
    <!-- svelte-ignore a11y_img_redundant_alt -->
    <img
        src={$ctxStore.node.attrs.src}
        alt={$ctxStore.node.attrs.alt}
        title={$ctxStore.node.attrs.title}
        class="!mb-0 block h-auto w-full rounded object-cover select-none [-webkit-user-drag:none]"
        draggable="false"
    />

    {#if $ctxStore.selected || isResizing}
        <!-- Sides -->
        <div
            class="absolute top-0 -right-1.5 bottom-0 z-10 flex w-3 cursor-col-resize items-center justify-center transition-colors duration-200 after:h-6 after:w-1 after:rounded-sm after:bg-[oklch(0.6_0.15_250)] after:opacity-0 after:shadow-sm after:transition-opacity after:duration-200 after:content-[''] hover:bg-white/10 hover:after:opacity-100"
            class:after:opacity-100={$ctxStore.selected}
            onmousedown={(e) => handleMouseDown(e, 'right')}
            role="button"
            tabindex="-1"
            aria-hidden="true"
        ></div>
        <div
            class="absolute top-0 bottom-0 -left-1.5 z-10 flex w-3 cursor-col-resize items-center justify-center transition-colors duration-200 after:h-6 after:w-1 after:rounded-sm after:bg-[oklch(0.6_0.15_250)] after:opacity-0 after:shadow-sm after:transition-opacity after:duration-200 after:content-[''] hover:bg-white/10 hover:after:opacity-100"
            class:after:opacity-100={$ctxStore.selected}
            onmousedown={(e) => handleMouseDown(e, 'left')}
            role="button"
            tabindex="-1"
            aria-hidden="true"
        ></div>

        <!-- Corners -->
        <div
            class="absolute -top-1.5 -right-1.5 z-20 h-2.5 w-2.5 cursor-nesw-resize rounded-full border-2 border-[oklch(0.6_0.15_250)] bg-white transition-colors duration-200"
            onmousedown={(e) => handleMouseDown(e, 'right')}
            role="button"
            tabindex="-1"
            aria-hidden="true"
        ></div>
        <div
            class="absolute -top-1.5 -left-1.5 z-20 h-2.5 w-2.5 cursor-nwse-resize rounded-full border-2 border-[oklch(0.6_0.15_250)] bg-white transition-colors duration-200"
            onmousedown={(e) => handleMouseDown(e, 'left')}
            role="button"
            tabindex="-1"
            aria-hidden="true"
        ></div>
        <div
            class="absolute -right-1.5 -bottom-1.5 z-20 h-2.5 w-2.5 cursor-nwse-resize rounded-full border-2 border-[oklch(0.6_0.15_250)] bg-white transition-colors duration-200"
            onmousedown={(e) => handleMouseDown(e, 'right')}
            role="button"
            tabindex="-1"
            aria-hidden="true"
        ></div>
        <div
            class="absolute -bottom-1.5 -left-1.5 z-20 h-2.5 w-2.5 cursor-nesw-resize rounded-full border-2 border-[oklch(0.6_0.15_250)] bg-white transition-colors duration-200"
            onmousedown={(e) => handleMouseDown(e, 'left')}
            role="button"
            tabindex="-1"
            aria-hidden="true"
        ></div>
    {/if}

    {#if $ctxStore.selected}
        <div
            class="absolute top-2 -right-12 z-50 flex flex-col gap-2"
            class:analyzing={isAnalyzing}
        >
            <button
                class="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white p-0 text-gray-700 shadow-sm transition-all duration-200 hover:border-[oklch(0.6_0.15_250)] hover:bg-gray-50 hover:text-[oklch(0.6_0.15_250)] active:scale-95 disabled:opacity-50"
                onclick={handleOCR}
                disabled={isAnalyzing}
                title="Extract Text"
            >
                <ScanIcon size={18} />
                {#if isAnalyzing}
                    <span
                        class="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin rounded-full border-2 border-transparent border-t-current"
                    ></span>
                {/if}
            </button>
            {#if $ctxStore.node.attrs.ocrText}
                <button
                    class="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white p-0 text-gray-700 shadow-sm transition-all duration-200 hover:border-[oklch(0.6_0.15_250)] hover:bg-gray-50 hover:text-[oklch(0.6_0.15_250)] active:scale-95"
                    onclick={copyOCRText}
                    title="Copy Text"
                >
                    <CopyIcon size={18} />
                </button>
            {/if}
        </div>
    {/if}
</div>
