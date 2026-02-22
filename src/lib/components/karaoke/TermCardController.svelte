<script lang="ts">
    import type { AnalyzedTerm } from '$lib/types';
    import type { KaraokeSentence } from '$lib/stores/karaokeStore.svelte';
    import { karaokeStore } from '$lib/stores/karaokeStore.svelte';

    import TermCard from '$lib/components/TermCard.svelte';
    import EditableTermCard from './EditableTermCard.svelte';
    import EditIcon from '$lib/components/icons/EditIcon.svelte';

    interface Props {
        /** The term data to display/edit */
        term: AnalyzedTerm;
        /** Whether this card is highlighted */
        isHighlighted?: boolean;
        /** Song ID for store updates */
        songId: string;
        /** Line index in sentences array */
        lineIndex: number;
        /** Term index within line's terms */
        termIndex: number;
        /** Current sentences array (for copying) */
        sentences: KaraokeSentence[];
    }

    let {
        term,
        isHighlighted = false,
        songId,
        lineIndex,
        termIndex,
        sentences
    }: Props = $props();

    let isEditing = $state(false);

    /**
     * Toggles edit mode on.
     */
    const startEditing = (): void => {
        isEditing = true;
    };

    /**
     * Cancels editing and returns to view mode.
     */
    const cancelEditing = (): void => {
        isEditing = false;
    };

    /**
     * Saves the updated term to the store and exits edit mode.
     */
    const saveEdit = async (updatedTerm: AnalyzedTerm): Promise<void> => {
        // Deep copy sentences to avoid mutating the original
        const newSentences = sentences.map((s, i) => {
            if (i !== lineIndex) return { ...s };

            // Clone the analysis and update the specific term
            const updatedTerms = s.analysis
                ? s.analysis.terms.map((t, j) =>
                      j === termIndex ? updatedTerm : t
                  )
                : [];

            const analysis = s.analysis
                ? {
                      ...s.analysis,
                      terms: updatedTerms,
                      // Recompute original from all terms
                      original: updatedTerms.map((t) => t.kanji).join('')
                  }
                : undefined;

            // Also update sentence.text to match the new analysis
            const newText = analysis
                ? updatedTerms.map((t) => t.kanji).join('')
                : s.text;

            return { ...s, text: newText, analysis };
        });

        await karaokeStore.updateSong(songId, { sentences: newSentences });
        isEditing = false;
    };
</script>

<div class="relative h-full">
    {#if isEditing}
        <EditableTermCard
            {term}
            onConfirm={saveEdit}
            onCancel={cancelEditing}
        />
    {:else}
        <TermCard {term} {isHighlighted}>
            {#snippet actions()}
                <!-- Edit button (aligned with Jisho icon) -->
                <button
                    type="button"
                    onclick={startEditing}
                    class="rounded p-1 text-[var(--color-text-muted)] transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary)]"
                    aria-label="Edit term"
                >
                    <EditIcon size={18} />
                </button>
            {/snippet}
        </TermCard>
    {/if}
</div>
