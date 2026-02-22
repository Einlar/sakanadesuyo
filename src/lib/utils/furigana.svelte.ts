import { api } from '$lib/api';
import {
    karaokeStore,
    type KaraokeSong
} from '$lib/stores/karaokeStore.svelte';

export class FuriganaProcessor {
    private isProcessingFurigana = $state(false);
    private autoProcessFurigana = $state(true);

    get shouldProcessFurigana() {
        return this.autoProcessFurigana && !this.isProcessingFurigana;
    }

    get isProcessing() {
        return this.isProcessingFurigana;
    }

    async processSongFurigana(song: KaraokeSong) {
        if (!song) return;

        const sentencesToProcess = song.sentences
            .map((s, i) => ({ s, i }))
            .filter(({ s }) => !s.furigana && s.text.trim());

        if (sentencesToProcess.length === 0) return;

        this.isProcessingFurigana = true;

        try {
            // Group into batches
            const batches: { indices: number[]; texts: string[] }[] = [];
            let currentBatchIndices: number[] = [];
            let currentBatchTexts: string[] = [];
            let currentBatchLength = 0;

            for (const { s, i } of sentencesToProcess) {
                // Check limits: 5000 chars total or 500 lines per batch
                if (
                    currentBatchLength + s.text.length > 5000 ||
                    currentBatchTexts.length >= 500
                ) {
                    batches.push({
                        indices: currentBatchIndices,
                        texts: currentBatchTexts
                    });
                    currentBatchIndices = [];
                    currentBatchTexts = [];
                    currentBatchLength = 0;
                }
                currentBatchIndices.push(i);
                currentBatchTexts.push(s.text);
                currentBatchLength += s.text.length;
            }
            if (currentBatchTexts.length > 0) {
                batches.push({
                    indices: currentBatchIndices,
                    texts: currentBatchTexts
                });
            }

            const newSentences = [...song.sentences];

            // Process batches
            for (const batch of batches) {
                // Implement backoff
                let attempt = 0;
                const maxRetries = 3;
                while (true) {
                    try {
                        const results = await api.getFurigana(batch.texts);
                        // Assign results
                        batch.indices.forEach((originalIndex, batchIndex) => {
                            newSentences[originalIndex] = {
                                ...newSentences[originalIndex],
                                furigana: results[batchIndex]
                            };
                        });
                        // Update store incrementally so UI updates
                        await karaokeStore.updateSong(song.id, {
                            sentences: newSentences
                        });
                        break; // Success
                    } catch (e) {
                        attempt++;
                        if (attempt > maxRetries) {
                            console.error('Failed to process batch', e);
                            this.autoProcessFurigana = false;
                            break; // Skip this batch
                        }
                        const delay = 1000 * Math.pow(2, attempt - 1);
                        await new Promise((r) => setTimeout(r, delay));
                    }
                }
            }
        } finally {
            this.isProcessingFurigana = false;
        }
    }
}
