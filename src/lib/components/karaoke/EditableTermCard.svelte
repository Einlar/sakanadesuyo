<script lang="ts">
    import type { AnalyzedTerm } from '$lib/types';
    import {
        serializeFurigana,
        deserializeFurigana,
        getFuriganaKanji,
        getFuriganaReading
    } from '$lib/utils/furiganaSerializer';

    interface Props {
        /** The term being edited */
        term: AnalyzedTerm;
        /** Callback when user confirms changes */
        onConfirm: (updatedTerm: AnalyzedTerm) => void;
        /** Callback when user cancels editing */
        onCancel: () => void;
    }

    let { term, onConfirm, onCancel }: Props = $props();

    /**
     * Formats the term for editing.
     * Uses furigana array if available, otherwise falls back to kanji (reading) format.
     */
    const formatTermForEditing = (): string => {
        if (term.furigana && term.furigana.length > 0) {
            return serializeFurigana(term.furigana);
        }
        // Fallback for terms without furigana array
        if (term.kanji === term.reading) return term.kanji;
        return `${term.kanji}(${term.reading})`;
    };

    // Local draft state for editing (captures initial term values)
    let termText = $derived(formatTermForEditing());
    let partOfSpeech = $derived(term.partOfSpeech);
    let definition = $derived(term.definition);
    let notes = $derived(term.notes ?? '');
    let showTypoWarning = $derived(term.possibleTypo ?? false);

    // Textarea element refs for auto-resize
    let definitionTextarea: HTMLTextAreaElement | undefined = $state();
    let notesTextarea: HTMLTextAreaElement | undefined = $state();

    /**
     * Handles save - parses term text and calls onConfirm with updated term.
     */
    const handleSave = (): void => {
        // Parse the term text into furigana segments
        const furigana = deserializeFurigana(termText);
        const kanji = getFuriganaKanji(furigana);
        const reading = getFuriganaReading(furigana);

        const updatedTerm: AnalyzedTerm = {
            kanji,
            reading,
            furigana,
            partOfSpeech,
            partOfSpeechShort: term.partOfSpeechShort,
            definition,
            notes: notes.trim() || undefined,
            possibleTypo: showTypoWarning ? term.possibleTypo : false,
            suggestedCorrection: showTypoWarning
                ? term.suggestedCorrection
                : undefined
        };

        onConfirm(updatedTerm);
    };

    /**
     * Dismisses the typo warning.
     */
    const dismissTypo = (): void => {
        showTypoWarning = false;
    };

    /**
     * Auto-resize textarea to fit content.
     */
    const autoResize = (event: Event): void => {
        const textarea = event.target as HTMLTextAreaElement;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    };

    // Auto-resize textareas on mount
    $effect(() => {
        if (definitionTextarea) {
            definitionTextarea.style.height = 'auto';
            definitionTextarea.style.height = `${definitionTextarea.scrollHeight}px`;
        }
        if (notesTextarea) {
            notesTextarea.style.height = 'auto';
            notesTextarea.style.height = `${notesTextarea.scrollHeight}px`;
        }
    });
</script>

<article
    class="flex h-full flex-col rounded-lg border border-[var(--color-primary)] bg-[var(--color-surface)] p-4"
>
    <!-- Term Input -->
    <div class="mb-3">
        <label
            for="term-input"
            class="mb-1 block text-xs text-[var(--color-text-muted)]"
        >
            Term (reading)
        </label>
        <input
            id="term-input"
            type="text"
            bind:value={termText}
            class="w-full border-b border-[var(--color-border)] bg-transparent py-1 text-xl font-medium text-[var(--color-text)] transition-colors outline-none focus:border-[var(--color-primary)]"
        />
    </div>

    <!-- Part of Speech Input -->
    <div class="mb-3">
        <label
            for="pos-input"
            class="mb-1 block text-xs text-[var(--color-text-muted)]"
        >
            Part of Speech
        </label>
        <input
            id="pos-input"
            type="text"
            bind:value={partOfSpeech}
            class="w-full border-b border-[var(--color-border)] bg-transparent py-1 text-sm text-[var(--color-text)] transition-colors outline-none focus:border-[var(--color-primary)]"
        />
    </div>

    <!-- Definition Textarea -->
    <div class="mb-3">
        <label
            for="definition-input"
            class="mb-1 block text-xs text-[var(--color-text-muted)]"
        >
            Definition
        </label>
        <textarea
            id="definition-input"
            bind:value={definition}
            bind:this={definitionTextarea}
            oninput={autoResize}
            rows="1"
            class="w-full resize-none overflow-hidden border-b border-[var(--color-border)] bg-transparent py-1 text-sm text-[var(--color-text)] transition-colors outline-none focus:border-[var(--color-primary)]"
        ></textarea>
    </div>

    <!-- Notes Textarea -->
    <div class="mb-3">
        <label
            for="notes-input"
            class="mb-1 block text-xs text-[var(--color-text-muted)]"
        >
            Notes (optional)
        </label>
        <textarea
            id="notes-input"
            bind:value={notes}
            bind:this={notesTextarea}
            oninput={autoResize}
            rows="1"
            placeholder="Add notes..."
            class="w-full resize-none overflow-hidden border-b border-[var(--color-border)] bg-transparent py-1 text-sm text-[var(--color-text)] italic transition-colors outline-none placeholder:text-[var(--color-text-muted)]/50 focus:border-[var(--color-primary)]"
        ></textarea>
    </div>

    <!-- Typo Warning (dismissable) -->
    {#if showTypoWarning && term.suggestedCorrection}
        <div
            class="mb-3 flex items-center justify-between gap-2 rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-700 dark:text-amber-300"
        >
            <div class="flex items-center gap-1.5">
                <span class="font-medium">Possible typo:</span>
                <span
                    >Did you mean <strong>{term.suggestedCorrection}</strong
                    >?</span
                >
            </div>
            <button
                type="button"
                onclick={dismissTypo}
                class="rounded p-0.5 transition-colors hover:bg-amber-500/30"
                aria-label="Dismiss typo warning"
            >
                <svg
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>
        </div>
    {/if}

    <!-- Action Buttons -->
    <div class="mt-auto flex justify-end gap-2 pt-2">
        <button
            type="button"
            onclick={onCancel}
            class="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)]"
        >
            Cancel
        </button>
        <button
            type="button"
            onclick={handleSave}
            class="rounded bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] dark:text-[#0f0f0f]"
        >
            Save
        </button>
    </div>
</article>
