<script lang="ts">
    import FuriganaText from '$lib/components/FuriganaText.svelte';
    import type { KaraokeSentence } from '$lib/stores/karaokeStore.svelte.ts';
    import { findActiveLineIndex, getSyncedIntervals } from '$lib/utils/lyrics';
    import { onDestroy, onMount, tick } from 'svelte';
    import TimingEditor from './TimingEditor.svelte';

    interface Props {
        /** Song sentences to sync */
        sentences: KaraokeSentence[];
        /** Current audio playback time in seconds */
        currentTime: number;
        /** Whether audio is available */
        hasAudio: boolean;
        /** Cover art URL */
        coverUrl?: string;
        /** Called when saving sync data with all timings */
        onSave: (timings: (number | null)[]) => void;
        /** Called when cancelling sync mode */
        onCancel: () => void;
        /** Callback when a verse is double clicked to seek */
        onVerseDbClick?: (startTime: number) => void;
    }

    let {
        sentences,
        currentTime,
        hasAudio,
        coverUrl,
        onSave,
        onCancel,
        onVerseDbClick
    }: Props = $props();

    /** Base timings derived from sentences */
    let baseTimings = $derived(sentences.map((s) => s.startTime ?? null));

    /** Local modifications to timings (overrides baseTimings) */
    let modifications = $state<Map<number, number>>(new Map());

    /** Merged timings: base + modifications */
    let timings = $derived(
        baseTimings.map((base, i) => modifications.get(i) ?? base)
    );

    /** Index of the next verse to set timing for */
    let syncTargetIndex = $state(0);

    /** Scroll container reference */
    let scrollContainer = $state<HTMLDivElement>();

    /** Verse element references */
    let verseElements: HTMLDivElement[] = $state([]);

    /** Intervals derived from current timings */
    let syncedIntervals = $derived(getSyncedIntervals(timings));

    /** Currently playing line based on timings */
    let activeLineIndex = $derived.by(() => {
        if (!currentTime || timings.length === 0) return -1;

        return findActiveLineIndex(syncedIntervals, currentTime);
    });

    /**
     * Sets the timing for the current target verse and advances to the next.
     */
    const setCurrentTiming = async (): Promise<void> => {
        if (syncTargetIndex < timings.length) {
            modifications.set(
                syncTargetIndex,
                Math.round(currentTime * 10) / 10
            );
            modifications = new Map(modifications); // Trigger reactivity
            syncTargetIndex++;

            await tick();

            if (syncTargetIndex < sentences.length) {
                verseElements[syncTargetIndex]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            } else {
                scrollContainer?.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    };

    /**
     * Updates a specific timing.
     */
    const updateTiming = (index: number, value: number): void => {
        modifications.set(index, value);
        modifications = new Map(modifications); // Trigger reactivity
    };

    /**
     * Handles keyboard events for spacebar sync.
     */
    const handleKeydown = (e: KeyboardEvent): void => {
        if (e.code === 'Space' && hasAudio && !e.repeat) {
            e.preventDefault();
            setCurrentTiming();
        }
    };

    /**
     * Saves all timings.
     */
    const handleSave = (): void => {
        onSave(timings);
    };

    onMount(() => {
        window.addEventListener('keydown', handleKeydown);
    });

    onDestroy(() => {
        window.removeEventListener('keydown', handleKeydown);
    });

    /**
     * Formats time in seconds to mm:ss.t format.
     */
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(1);
        return `${mins}:${secs.padStart(4, '0')}`;
    };
</script>

<div class="flex min-h-0 flex-1 flex-col">
    <!-- Header with cover and controls -->
    <div
        class="flex flex-col items-center gap-4 border-b border-[var(--color-border)] p-4"
    >
        {#if coverUrl}
            <div class="h-32 w-32 overflow-hidden rounded-xl shadow-lg">
                <img
                    src={coverUrl}
                    alt="Cover"
                    class="h-full w-full object-cover"
                />
            </div>
        {/if}

        <div class="flex gap-2">
            <button
                type="button"
                onclick={handleSave}
                class="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:text-black"
            >
                Save Sync
            </button>
            <button
                type="button"
                onclick={onCancel}
                class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
                Cancel
            </button>
        </div>

        {#if hasAudio}
            <p class="text-center text-sm text-[var(--color-text-muted)]">
                Play the song and press <kbd
                    class="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-xs"
                    >Space</kbd
                > to set the timing for each verse.
            </p>
            <button
                type="button"
                onclick={setCurrentTiming}
                class="rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-4 py-2 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/20"
            >
                Set Timing of Next Verse ({formatTime(currentTime)})
            </button>
        {/if}
    </div>

    <!-- Lyrics with timing editors -->
    <div class="flex-1 overflow-y-auto p-4" bind:this={scrollContainer}>
        <div class="mx-auto flex max-w-2xl flex-col gap-3">
            {#each sentences as sentence, index (index)}
                {@const isTarget = index === syncTargetIndex}
                {@const isActive = index === activeLineIndex}
                {@const timing = timings[index] ?? 0}
                <div
                    bind:this={verseElements[index]}
                    class={[
                        'flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-all',
                        isTarget
                            ? 'border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                            : isActive
                              ? 'border border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10'
                              : 'border border-transparent'
                    ].join(' ')}
                    role="presentation"
                    onmousedown={(e) => {
                        if (
                            e.detail > 1 &&
                            (e.target as Element).tagName !== 'INPUT'
                        ) {
                            e.preventDefault();
                        }
                    }}
                    ondblclick={() => {
                        const time = timings[index];
                        if (time !== null && time !== undefined) {
                            onVerseDbClick?.(time);
                        }
                    }}
                >
                    <div class="flex w-full items-center justify-center gap-2">
                        {#if isTarget}
                            <span
                                class="rounded bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase dark:text-black"
                            >
                                Next
                            </span>
                        {/if}
                        {#if isActive && !isTarget}
                            <span
                                class="rounded bg-[var(--color-primary)]/50 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase dark:text-black"
                            >
                                Playing
                            </span>
                        {/if}
                        <span
                            class="text-xs text-[var(--color-text-muted)] tabular-nums"
                        >
                            #{index + 1}
                        </span>
                    </div>
                    <p class="text-lg leading-relaxed text-[var(--color-text)]">
                        {#if sentence.furigana}
                            <FuriganaText segments={sentence.furigana} />
                        {:else}
                            {sentence.text}
                        {/if}
                    </p>
                    <TimingEditor
                        value={timing}
                        {currentTime}
                        {hasAudio}
                        onchange={(newValue: number) =>
                            updateTiming(index, newValue)}
                    />
                </div>
            {/each}
        </div>
    </div>
</div>
