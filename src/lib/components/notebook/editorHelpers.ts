import type { Editor } from '@tiptap/core';
import { containsJapanese } from '$lib/utils/japaneseDetector';

export interface FloatingButtonPosition {
    top: number;
    left: number;
}

export interface SelectionResult {
    selectedText: string;
    floatingBtnPos: FloatingButtonPosition | null;
}

/**
 * Handle text selection changes in the editor.
 * Returns the selected text and position for the floating button if the selection contains Japanese.
 */
export function handleSelectionChange(editor: Editor): SelectionResult {
    const { from, to, empty } = editor.state.selection;

    if (empty) {
        return { selectedText: '', floatingBtnPos: null };
    }

    const text = editor.state.doc.textBetween(from, to, ' ');

    // Only show button if selection contains Japanese
    if (!containsJapanese(text)) {
        return { selectedText: '', floatingBtnPos: null };
    }

    // Get position for floating button
    const view = editor.view;
    const coords = view.coordsAtPos(from);

    return {
        selectedText: text,
        floatingBtnPos: {
            top: coords.top - 40,
            left: coords.left
        }
    };
}

/**
 * Handle clicks on analyzed sentences within the editor.
 * Returns the analysis ID if an analyzed sentence was clicked, null otherwise.
 */
export function getClickedAnalysisId(e: MouseEvent): string | null {
    const target = e.target as HTMLElement;
    const analyzed = target.closest('.analyzed-sentence') as HTMLElement;

    if (analyzed) {
        return analyzed.getAttribute('data-analysis-id');
    }

    return null;
}

/**
 * Generate a unique ID for an analysis.
 */
export function generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Check if the Ctrl+Shift+A keyboard shortcut for analysis was pressed.
 */
export function isAnalysisShortcut(e: KeyboardEvent): boolean {
    return e.ctrlKey && e.shiftKey && e.key === 'A';
}

export interface AnalysisCandidate {
    from: number;
    to: number;
    text: string;
}

/**
 * Identify all unanalyzed Japanese sentences in the document.
 * Returns a list of candidates sorted in reverse order (bottom to top).
 */
export function identifyJapaneseCandidates(
    editor: Editor
): AnalysisCandidate[] {
    const doc = editor.state.doc;
    const candidates: AnalysisCandidate[] = [];

    // We will collect ranges of text that contain Japanese
    // Simplified approach: Iterate block nodes, get text, split by punctuation
    doc.descendants((node, pos) => {
        // Skip if we are inside an analyzed sentence (atomic)
        if (node.type.name === 'analyzedSentence') return false;

        if (node.isText) {
            const text = node.text || '';
            if (!text) return;

            // Split into sentences (rudimentary: split by 。！？)
            // We want to keep the delimiters attached to the previous part
            // Regex to match "Chunk of text。/！/？"
            const sentences = text.match(/[^。！？]*[。！？]?/g) || [];

            let currentOffset = 0;
            for (const sentence of sentences) {
                if (!sentence) continue;

                // Check if it has Japanese chars
                if (containsJapanese(sentence)) {
                    const from = pos + currentOffset;
                    const to = from + sentence.length;

                    candidates.push({ from, to, text: sentence });
                }
                currentOffset += sentence.length;
            }
        }
        return true;
    });

    // Process candidates in reverse order to maintain positions for earlier edits
    return candidates.sort((a, b) => b.from - a.from);
}
