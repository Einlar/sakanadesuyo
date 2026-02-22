<script lang="ts">
    import { onMount } from 'svelte';
    import { crossfade } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import type { FuriganaSegment } from '$lib/types';
    import FuriganaText from './FuriganaText.svelte';

    const [send, receive] = crossfade({
        duration: 400,
        easing: quintOut
    });

    import rawMessages from '$lib/data/loadingMessages.json';
    import { isJapanese } from 'wanakana';

    const highlightStyle = 'font-bold text-[var(--color-primary)]';

    const messages: FuriganaSegment[][] = (
        rawMessages as FuriganaSegment[][]
    ).map((msg) =>
        msg.map((segment) => ({
            ...segment,
            className: isJapanese(segment.base) ? highlightStyle : undefined
        }))
    );

    let displayMessages = $state([...messages]);
    let currentIndex = $state(0);

    function shuffle<T>(array: T[]): T[] {
        let currentIndex = array.length,
            randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex],
                array[currentIndex]
            ];
        }
        return array;
    }

    onMount(() => {
        // Shuffle messages on mount so order is random each time
        displayMessages = shuffle([...messages]);

        const interval = setInterval(() => {
            currentIndex = (currentIndex + 1) % displayMessages.length;
        }, 3000);

        return () => clearInterval(interval);
    });
</script>

<div class="flex flex-col items-center justify-center space-y-4 py-8">
    <!-- Dynamic Text -->
    <div class="relative h-10 min-w-[300px]">
        {#key currentIndex}
            <div
                class="absolute inset-0 flex items-end justify-center pb-1"
                in:receive={{ key: currentIndex }}
                out:send={{ key: currentIndex }}
            >
                <span>
                    <FuriganaText
                        segments={displayMessages[currentIndex]}
                        textStyle="text-[var(--color-text-muted)]"
                    />
                </span>
            </div>
        {/key}
    </div>

    <!-- Spinner / Animation -->
    <div class="relative h-12 w-12">
        <div
            class="absolute inset-0 animate-ping rounded-full bg-[var(--color-primary)] opacity-20"
        ></div>
        <div
            class="absolute inset-2 animate-pulse rounded-full bg-[var(--color-primary)] opacity-40"
        ></div>
        <div
            class="absolute inset-4 rounded-full bg-[var(--color-primary)] shadow-[0_0_15px_var(--color-primary)]"
        ></div>
    </div>
</div>
