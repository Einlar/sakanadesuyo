<script lang="ts">
    import type { SentenceAnalysis } from '$lib/types';
    import { toBlob } from '@jpinsonneau/html-to-image';
    import ShareCard from './ShareCard.svelte';
    import CopyIcon from './icons/CopyIcon.svelte';
    import DownloadIcon from './icons/DownloadIcon.svelte';
    import XIcon from './icons/XIcon.svelte';

    interface Props {
        isOpen: boolean;
        analysis: SentenceAnalysis | null;
        onClose: () => void;
    }

    let { isOpen, analysis, onClose }: Props = $props();

    let cardElement: HTMLElement | undefined = $state();
    let dialog: HTMLDialogElement | undefined = $state();

    let copyStatus = $state<'idle' | 'success' | 'error'>('idle');

    async function generateBlob() {
        if (!cardElement) return null;

        await document.fonts.ready;
        return await toBlob(cardElement, {
            backgroundColor: '#0f172a' // Matches the card bg
        });
    }

    async function handleCopy() {
        copyStatus = 'idle';
        try {
            const blob = await generateBlob();
            if (!blob) throw new Error('Failed to generate image');
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            copyStatus = 'success';
            setTimeout(() => (copyStatus = 'idle'), 2000);
        } catch (err) {
            console.error(err);
            copyStatus = 'error';
        }
    }

    async function handleDownload() {
        if (!cardElement) return;

        try {
            const blob = await generateBlob();
            if (!blob) throw new Error('Failed to generate image');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sakanadesuyo-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
        }
    }

    $effect(() => {
        if (isOpen && dialog && !dialog.open) {
            dialog.showModal();
        } else if (!isOpen && dialog && dialog.open) {
            dialog.close();
        }
    });
</script>

{#if isOpen && analysis}
    <!-- Native dialog with backdrop handling -->
    <dialog
        bind:this={dialog}
        class="fixed inset-0 z-50 flex h-full max-h-none w-full max-w-none flex-col items-center justify-center border-none bg-transparent p-4 text-left backdrop:bg-black/80 backdrop:backdrop-blur-sm focus:outline-none"
        onclose={onClose}
        onclick={(e) => {
            if (e.target === dialog) onClose();
        }}
        aria-labelledby="share-title"
    >
        <!-- Content wrapper - No inner overlay needed properly -->

        <div
            class="relative z-10 flex max-h-[100dvh] w-full max-w-5xl flex-col items-center gap-6 overflow-y-auto rounded-xl p-4"
        >
            <!-- Controls -->
            <div
                class="flex w-full max-w-[800px] items-start justify-between rounded-lg bg-white/10 p-2 text-white backdrop-blur-md sm:items-center sm:p-4"
            >
                <h2
                    id="share-title"
                    class="hidden text-lg font-medium sm:block"
                >
                    Share Card
                </h2>

                <div
                    class="flex w-full items-start justify-end gap-2 sm:w-auto sm:items-center"
                >
                    <!-- Action Buttons Wrapper -->
                    <div
                        class="flex flex-1 flex-wrap justify-end gap-2 overflow-hidden sm:flex-initial sm:items-center"
                    >
                        <button
                            onclick={handleCopy}
                            class="flex min-w-fit flex-1 items-center justify-center gap-2 rounded bg-white/20 px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors hover:bg-white/30 disabled:opacity-50 sm:flex-initial sm:justify-start"
                            style="max-width: 200px;"
                        >
                            {#if copyStatus === 'success'}
                                <span class="text-[var(--color-primary)]"
                                    >Copied!</span
                                >
                            {:else}
                                <CopyIcon class="h-4 w-4" />
                                <span
                                    >Copy <span class="hidden sm:inline"
                                        >Image</span
                                    ></span
                                >
                            {/if}
                        </button>

                        <button
                            onclick={handleDownload}
                            class="flex min-w-fit flex-1 items-center justify-center gap-2 rounded bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium whitespace-nowrap text-black transition-opacity hover:opacity-90 disabled:opacity-50 sm:flex-initial sm:justify-start"
                            style="max-width: 200px;"
                        >
                            <DownloadIcon class="h-4 w-4" />
                            <span>Download</span>
                        </button>
                    </div>

                    <!-- Close Button (Always Fixed Right relative to actions) -->
                    <button
                        onclick={onClose}
                        class="ml-1 rounded-full p-1.5 hover:bg-white/20"
                        aria-label="Close modal"
                    >
                        <XIcon class="h-5 w-5" />
                    </button>
                </div>
            </div>

            <!-- Preview Wrapper (Scales down if screen is small, but Card stays 800px wide for capture) -->
            <div
                class="w-full max-w-[800px] overflow-auto rounded-xl shadow-2xl [scrollbar-color:var(--color-surface-hover)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-[4px] [&::-webkit-scrollbar-thumb]:border-[2px] [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-[var(--color-surface-hover)] [&::-webkit-scrollbar-thumb:hover]:bg-[var(--color-primary)] [&::-webkit-scrollbar-track]:bg-transparent"
            >
                <ShareCard {analysis} bind:element={cardElement!} />
            </div>

            <p class="text-sm text-white/50">
                Designed for Discord & Social Media
            </p>
        </div>
    </dialog>
{/if}
