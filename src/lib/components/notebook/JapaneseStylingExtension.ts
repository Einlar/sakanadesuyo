import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey, Transaction } from 'prosemirror-state';
import type { Node, MarkType } from 'prosemirror-model';
import { isAnalyzedSentenceEl } from './AnalyzedSentenceNode';

// Regex to match Japanese characters sequences
// Includes Hiragana, Katakana, Kanji, and CJK punctuation
const JAPANESE_REGEX =
    /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u4E00-\u9FFF\u3400-\u4DBF\uFF65-\uFF9F]+/g;

export const JapaneseStylingExtension = Mark.create({
    name: 'japaneseStyling',

    addOptions() {
        return {
            HTMLAttributes: {}
        };
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: 'jp-styled-text'
            }),
            0
        ];
    },

    parseHTML() {
        return [
            {
                tag: 'span.jp-styled-text',
                getAttrs: (element) => {
                    const el = element as HTMLElement;
                    // Prevent this mark from stealing AnalyzedSentenceNode content
                    if (isAnalyzedSentenceEl(el)) {
                        return false;
                    }
                    return {};
                }
            }
        ];
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('japaneseStyling'),
                appendTransaction: (transactions, _oldState, newState) => {
                    const docChanged = transactions.some((tr) => tr.docChanged);
                    if (!docChanged) return null;

                    const markType = this.editor.schema.marks.japaneseStyling;
                    if (!markType) return null;

                    return applyJapaneseMarks(
                        newState.tr,
                        newState.doc,
                        markType
                    );
                }
            })
        ];
    }
});

function applyJapaneseMarks(
    tr: Transaction,
    doc: Node,
    markType: MarkType
): Transaction | null {
    doc.descendants((node, pos) => {
        if (!node.isText || !node.text) return;

        const text = node.text;
        JAPANESE_REGEX.lastIndex = 0;

        let match;
        let lastPos = 0;

        while ((match = JAPANESE_REGEX.exec(text)) !== null) {
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;

            // Remove mark from non-japanese text before this match
            if (matchStart > lastPos) {
                tr.removeMark(pos + lastPos, pos + matchStart, markType);
            }

            // Add mark to japanese text
            tr.addMark(pos + matchStart, pos + matchEnd, markType.create());

            lastPos = matchEnd;
        }

        // Remove mark from remaining text
        if (lastPos < text.length) {
            tr.removeMark(pos + lastPos, pos + text.length, markType);
        }
    });

    if (!tr.steps.length) return null;

    tr.setMeta('addToHistory', false);
    return tr;
}
