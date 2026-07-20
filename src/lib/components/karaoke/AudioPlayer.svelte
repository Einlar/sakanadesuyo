<script lang="ts">
    import { PersistentState } from '$lib/utils/storage.svelte';
    import { WebAudioPlayer } from '$lib/audio/webAudioPlayer.svelte';
    import { onDestroy } from 'svelte';

    type Props = {
        blob: Blob;
        currentTime?: number;
        paused?: boolean;
    };

    let {
        blob,
        currentTime = $bindable(0),
        paused = $bindable(true)
    }: Props = $props();

    const volumeState = new PersistentState<number>('karaoke_volume', 0.8);

    // Sample-accurate playback engine. Owns its own AudioContext for the
    // component's lifetime; only ever runs on the client (the player is
    // rendered behind an `audioBlob` guard that is only set client-side).
    const engine = new WebAudioPlayer(volumeState.current);
    engine.onended = () => {
        currentTime = 0;
        paused = true; // explicitly pause so the loop stops
    };

    let duration = $derived(engine.duration);
    let isDraggingVolume = $state(false);
    let volumeControl: HTMLDivElement;

    let isDraggingSeek = $state(false);
    let progressBar: HTMLDivElement;

    // Decode the audio whenever the source changes.
    $effect(() => {
        engine.load(blob);
    });

    function togglePlay() {
        paused = !paused;
    }

    function formatTime(seconds: number) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /*
       Drive the engine from the `paused` prop — the single source of playback
       intent. play()/pause() are no-ops when already in that state, so this
       just re-asserts intent whenever `paused` or readiness changes.
    */
    $effect(() => {
        if (!engine.ready) return;
        if (paused) engine.pause();
        else engine.play();
    });

    /*
       Sync currentTime prop to the engine when it changes from outside
       (seeking). We use a threshold to avoid conflicts with the rAF time
       updates during playback.
    */
    $effect(() => {
        if (
            engine.ready &&
            !isDraggingSeek &&
            Math.abs(engine.currentTime - currentTime) > 0.5
        ) {
            engine.seek(currentTime);
        }
    });

    function updateSeekFromEvent(e: MouseEvent) {
        if (!engine.ready || !duration || !progressBar) return;
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const newTime = percent * duration;
        engine.seek(newTime);
        currentTime = newTime;
    }

    function handleGlobalSeekDrag(e: MouseEvent) {
        if (!isDraggingSeek) return;
        updateSeekFromEvent(e);
    }

    function handleWindowMouseUpSeek() {
        isDraggingSeek = false;
        window.removeEventListener('mousemove', handleGlobalSeekDrag);
        window.removeEventListener('mouseup', handleWindowMouseUpSeek);
    }

    function startSeekDrag(e: MouseEvent) {
        isDraggingSeek = true;
        updateSeekFromEvent(e);
        window.addEventListener('mousemove', handleGlobalSeekDrag);
        window.addEventListener('mouseup', handleWindowMouseUpSeek);
    }

    // Volume drag: click or drag along the control to set the level.
    function handleGlobalVolumeDrag(e: MouseEvent) {
        if (!isDraggingVolume || !volumeControl) return;
        const rect = volumeControl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newVolume = Math.max(0, Math.min(1, x / rect.width));
        volumeState.current = newVolume;
        engine.setVolume(newVolume);
    }

    function handleWindowMouseUp() {
        isDraggingVolume = false;
        window.removeEventListener('mousemove', handleGlobalVolumeDrag);
        window.removeEventListener('mouseup', handleWindowMouseUp);
    }

    function startVolumeDrag(e: MouseEvent) {
        isDraggingVolume = true;
        if (volumeControl) {
            const rect = volumeControl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const v = Math.max(0, Math.min(1, x / rect.width));
            volumeState.current = v;
            engine.setVolume(v);
        }
        window.addEventListener('mousemove', handleGlobalVolumeDrag);
        window.addEventListener('mouseup', handleWindowMouseUp);
    }

    /*
        Use requestAnimationFrame for smooth time updates (60fps) so the lyrics
        and progress bar track the engine clock smoothly.
    */
    let rafId: number;

    function loop() {
        if (!paused) {
            // Don't update time from the engine while dragging to prevent jitter
            if (!isDraggingSeek) {
                currentTime = engine.currentTime;
            }
            rafId = requestAnimationFrame(loop);
        }
    }

    $effect(() => {
        if (!paused) {
            cancelAnimationFrame(rafId);
            loop();
        } else {
            cancelAnimationFrame(rafId);
        }
        return () => cancelAnimationFrame(rafId);
    });

    onDestroy(() => engine.destroy());
</script>

<div
    class="relative w-full border-t-0 border-r border-b border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm backdrop-blur-md"
>
    <!-- Removed rounded-b-xl to flush with potential sidebar/layout -->
    <div class="flex items-center gap-3 px-4 py-2">
        <!-- Play/Pause Button -->
        <button
            onclick={togglePlay}
            disabled={!engine.ready}
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-black shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={paused ? 'Play' : 'Pause'}
        >
            {#if paused}
                <svg
                    class="ml-0.5 h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M8 5v14l11-7z" />
                </svg>
            {:else}
                <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
            {/if}
        </button>

        <!-- Main Info & Progress -->
        <div class="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <div
                class="flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)]"
            >
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>

            <!-- Progress Bar Container -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="group relative h-3 w-full cursor-pointer py-1"
                bind:this={progressBar}
                onmousedown={startSeekDrag}
            >
                <!-- Track background -->
                <div
                    class="h-1 w-full rounded-full bg-[var(--color-border)]"
                ></div>

                <!-- Fill -->
                <div
                    class="absolute top-1 left-0 h-1 rounded-full bg-[var(--color-primary)] transition-all duration-100 ease-out"
                    style="width: {(currentTime / (duration || 1)) * 100}%"
                >
                    <!-- Handle (visible on group hover) -->
                    <div
                        class="absolute top-1/2 right-0 -mt-1.5 -mr-1.5 h-3 w-3 scale-0 rounded-full bg-[var(--color-primary)] shadow-sm transition-transform group-hover:scale-100"
                    ></div>
                </div>
            </div>
        </div>

        <!-- Volume Control: Square Triangle -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="flex cursor-pointer items-center justify-center p-2"
            onmousedown={startVolumeDrag}
            bind:this={volumeControl}
            aria-label="Volume"
        >
            <div class="relative h-6 w-12">
                <!-- Background Triangle (Gray/Muted) -->
                <svg
                    class="absolute inset-0 h-full w-full text-[var(--color-border)]"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >
                    <path d="M0 100 L100 0 L100 100 Z" fill="currentColor" />
                </svg>

                <!-- Foreground Triangle (Primary Color, Clipped) -->
                <div
                    class="absolute inset-0 overflow-hidden"
                    style="width: {volumeState.current * 100}%"
                >
                    <svg
                        class="h-full w-[calc(100%/var(--vol))] min-w-full text-[var(--color-primary)]"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        style="--vol: {volumeState.current}"
                    >
                        <path
                            d="M0 100 L100 0 L100 100 Z"
                            fill="currentColor"
                        />
                    </svg>
                </div>
            </div>
        </div>
    </div>
</div>
