<script lang="ts">
    interface Props {
        /** The timing value in seconds */
        value: number;
        /** Current playback time in seconds */
        currentTime?: number;
        /** Whether audio is available */
        hasAudio?: boolean;
        /** Called when the value changes */
        onchange?: (newValue: number) => void;
    }

    let {
        value = $bindable(0),
        currentTime = 0,
        hasAudio = false,
        onchange
    }: Props = $props();

    /**
     * Adjusts the timing by a delta value, clamping to >= 0.
     */
    const adjust = (delta: number): void => {
        value = Math.max(0, Math.round((value + delta) * 10) / 10);
        onchange?.(value);
    };

    /**
     * Handles input change from the text field.
     */
    const handleInput = (e: Event): void => {
        const target = e.target as HTMLInputElement;
        const parsed = parseFloat(target.value);
        if (!isNaN(parsed) && parsed >= 0) {
            value = Math.round(parsed * 10) / 10;
            onchange?.(value);
        }
    };
    /**
     * Sets value to current playback time.
     */
    const setToCurrent = (): void => {
        value = Math.round(currentTime * 10) / 10;
        onchange?.(value);
    };
</script>

<div class="flex items-center justify-center gap-0.5">
    <!-- Decrement buttons -->
    <button
        type="button"
        onclick={() => adjust(-1)}
        class="flex h-8 w-8 items-center justify-center text-[var(--color-text)] opacity-60 transition-all hover:text-[var(--color-primary)] hover:opacity-100"
        title="-1s"
    >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.41 7.41L17 6l-6 6 6 6 1.41-1.41L13.83 12z" />
            <path d="M12.41 7.41L11 6l-6 6 6 6 1.41-1.41L7.83 12z" />
            <path d="M6.41 7.41L5 6l-6 6 6 6 1.41-1.41L1.83 12z" />
        </svg>
    </button>
    <button
        type="button"
        onclick={() => adjust(-0.5)}
        class="flex h-8 w-8 items-center justify-center text-[var(--color-text)] opacity-60 transition-all hover:text-[var(--color-primary)] hover:opacity-100"
        title="-0.5s"
    >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            <path d="M9.41 7.41L8 6l-6 6 6 6 1.41-1.41L4.83 12z" />
        </svg>
    </button>
    <button
        type="button"
        onclick={() => adjust(-0.1)}
        class="flex h-8 w-8 items-center justify-center text-[var(--color-text)] opacity-60 transition-all hover:text-[var(--color-primary)] hover:opacity-100"
        title="-0.1s"
    >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
    </button>

    <!-- Input and Current Time Button -->
    <div class="flex flex-col items-center gap-1">
        <input
            type="text"
            inputmode="decimal"
            value={value.toFixed(1)}
            oninput={handleInput}
            class="mx-1 h-7 w-14 rounded bg-[var(--color-bg)] text-center text-sm text-[var(--color-text)] tabular-nums focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none"
        />
        {#if hasAudio}
            <button
                type="button"
                onclick={setToCurrent}
                class="flex items-center justify-center text-[var(--color-text)] opacity-60 transition-all hover:text-[var(--color-primary)] hover:opacity-100"
                title="Set to {currentTime.toFixed(1)}s"
            >
                <svg
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M7 6c-3 0-4 12 0 12" />
                    <circle
                        cx="12"
                        cy="12"
                        r="2"
                        fill="currentColor"
                        stroke="none"
                    />
                    <path d="M17 6c3 0 4 12 0 12" />
                </svg>
            </button>
        {/if}
    </div>

    <!-- Increment buttons -->
    <button
        type="button"
        onclick={() => adjust(0.1)}
        class="flex h-8 w-8 items-center justify-center text-[var(--color-text)] opacity-60 transition-all hover:text-[var(--color-primary)] hover:opacity-100"
        title="+0.1s"
    >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
        </svg>
    </button>
    <button
        type="button"
        onclick={() => adjust(0.5)}
        class="flex h-8 w-8 items-center justify-center text-[var(--color-text)] opacity-60 transition-all hover:text-[var(--color-primary)] hover:opacity-100"
        title="+0.5s"
    >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
            <path d="M14.59 16.59L16 18l6-6-6-6-1.41 1.41L19.17 12z" />
        </svg>
    </button>
    <button
        type="button"
        onclick={() => adjust(1)}
        class="flex h-8 w-8 items-center justify-center text-[var(--color-text)] opacity-60 transition-all hover:text-[var(--color-primary)] hover:opacity-100"
        title="+1s"
    >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.59 16.59L7 18l6-6-6-6-1.41 1.41L10.17 12z" />
            <path d="M11.59 16.59L13 18l6-6-6-6-1.41 1.41L16.17 12z" />
            <path d="M17.59 16.59L19 18l6-6-6-6-1.41 1.41L22.17 12z" />
        </svg>
    </button>
</div>
