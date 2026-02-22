<script lang="ts">
    import type { SentenceAnalysis } from '$lib/types';

    interface Props {
        analysis: SentenceAnalysis;
        element: HTMLElement;
    }

    let { analysis, element = $bindable() }: Props = $props();
</script>

<!-- 
  This element is what gets captured. 
  We set a fixed width to ensure consistent image generation, 
  and a min-height to look like a proper card.
  Background is a "Dark Ocean" gradient.
-->
<div
    bind:this={element}
    class="flex w-[800px] flex-col overflow-hidden rounded-xl bg-gradient-to-br from-[#0f172a] via-[#112222] to-[#0f172a] p-10 text-white shadow-2xl"
    style="font-family: 'Noto Sans JP', sans-serif;"
>
    <!-- Header / Branding -->
    <header class="mb-8 flex items-center justify-between opacity-50">
        <span class="text-sm font-light tracking-[0.3em] uppercase"
            >Sakana desu yo</span
        >
        <span class="text-xs tracking-widest">Japanese Analyzer</span>
    </header>

    <!-- Main Sentence -->
    <div class="mb-10 text-center">
        <h1
            class="font-['Yuji_Syuku'] text-4xl leading-relaxed font-bold tracking-wide text-[#2dd4bf] drop-shadow-lg"
        >
            {analysis.original}
        </h1>
    </div>

    <!-- Analysis Terms Grid -->
    <!-- We limit to a readable amount, usually all fit, but if not it will just expand the height which is fine for image gen -->
    <div class="grid grid-cols-4 gap-4">
        {#each analysis.terms as term}
            <div
                class="flex flex-col rounded-lg border p-3 backdrop-blur-sm {term.possibleTypo
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-white/10 bg-white/5'}"
            >
                <!-- Header (Kanji + Reading) - Side-by-side when space allows, wraps when needed -->
                <div class="mb-1 flex flex-wrap items-baseline gap-x-2">
                    <span class="text-lg font-bold text-[#f0f9ff]">
                        {term.kanji}
                    </span>
                    {#if term.reading && term.reading !== term.kanji}
                        <span class="text-xs text-[#94a3b8]"
                            >{term.reading}</span
                        >
                    {/if}
                </div>

                <!-- Part of Speech -->
                <div class="mb-2 flex h-8 items-start">
                    <span
                        class="inline-block rounded bg-[#2dd4bf]/20 px-2 py-1 text-[10px] leading-tight font-medium text-[#2dd4bf]"
                    >
                        {term.partOfSpeechShort || term.partOfSpeech}
                    </span>
                </div>

                <!-- Definition - Pushed text -->
                <div class="flex-grow">
                    <p class="text-xs leading-relaxed text-[#cbd5e1]">
                        {term.definition}
                    </p>
                </div>

                <!-- Typo suggestion -->
                {#if term.possibleTypo && term.suggestedCorrection}
                    <div
                        class="mt-2 rounded bg-amber-500/20 px-2 py-1 text-[10px] text-amber-300"
                    >
                        Typo? → <strong>{term.suggestedCorrection}</strong>
                    </div>
                {/if}
            </div>
        {/each}
    </div>

    <!-- Footer branding decoration -->
    <div
        class="mt-10 flex items-center justify-center gap-2 text-xs text-white/20"
    >
        <div class="h-px w-12 bg-current"></div>
        <span>わかる</span>
        <div class="h-px w-12 bg-current"></div>
    </div>
</div>
