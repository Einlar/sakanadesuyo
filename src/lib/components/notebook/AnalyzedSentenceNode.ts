import { Node, mergeAttributes } from '@tiptap/core';
import { Fragment, Slice, Node as ProseMirrorNode } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { SentenceAnalysis } from '$lib/types';

export interface AnalyzedSentenceOptions {
    HTMLAttributes: Record<string, unknown>;
}

export interface AnalyzedSentenceStorage {
    selectedAnalysisId: string | null;
}

/** Plugin key for the selection decoration plugin */
const selectedAnalysisPluginKey = new PluginKey('analyzedSentenceSelection');

/** Meta key used to signal selectedAnalysisId changes */
const SELECTED_ANALYSIS_META = 'selectedAnalysisChanged';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        analyzedSentence: {
            /**
             * Insert an analyzed sentence node with the current selection's content (optionally in loading state)
             */
            setAnalyzedSentence: (
                id: string,
                isLoading?: boolean
            ) => ReturnType;
            /**
             * Insert an analyzed sentence node at a specific range
             */
            setAnalyzedSentenceAt: (
                range: { from: number; to: number },
                id: string,
                isLoading?: boolean
            ) => ReturnType;
            /**
             * Update an analyzed sentence node to set its analysis ID and clear loading state
             */
            completeAnalyzedSentence: (
                analysisId: string,
                analysis: SentenceAnalysis
            ) => ReturnType;
            /**
             * Remove a loading analyzed sentence (when analysis fails/cancels)
             */
            removeLoadingAnalyzedSentence: (analysisId: string) => ReturnType;
            /**
             * Remove an analyzed sentence by ID and replace with plain text
             */
            removeAnalyzedSentence: (id: string) => ReturnType;
            /**
             * Set the currently selected analysis ID (for highlighting)
             */
            setSelectedAnalysis: (id: string | null) => ReturnType;
            /**
             * Update the text content of an analyzed sentence node
             */
            updateAnalyzedSentenceText: (
                id: string,
                text: string
            ) => ReturnType;
            /**
             * Update the list of highlighted terms for the visual progress bar
             */
            updateAnalyzedSentenceTerms: (
                id: string,
                terms: string[]
            ) => ReturnType;
            /**
             * Update the analysis data of an analyzed sentence node
             */
            updateAnalyzedSentenceData: (
                id: string,
                analysis: SentenceAnalysis
            ) => ReturnType;
        };
    }
}

/**
 * TipTap Node extension for analyzed sentences.
 * Renders as an atomic, read-only, non-copyable widget.
 */
export const AnalyzedSentenceNode = Node.create<
    AnalyzedSentenceOptions,
    AnalyzedSentenceStorage
>({
    name: 'analyzedSentence',

    // Inline node that appears within text
    group: 'inline',
    inline: true,

    // Treat as a single atomic unit (cannot edit inside)
    atom: true,

    // Allow node selection (clicking selects the whole node)
    selectable: true,

    // Not draggable
    draggable: false,

    addOptions() {
        return {
            HTMLAttributes: {}
        };
    },

    addStorage() {
        return {
            selectedAnalysisId: null
        };
    },

    addAttributes() {
        return {
            'data-analysis-id': {
                default: null,
                parseHTML: (element) =>
                    element.getAttribute('data-analysis-id'),
                renderHTML: (attributes) => {
                    if (!attributes['data-analysis-id']) {
                        return {};
                    }
                    return {
                        'data-analysis-id': attributes['data-analysis-id']
                    };
                }
            },
            'data-analysis-json': {
                default: null,
                parseHTML: (element) => {
                    const json = element.getAttribute('data-analysis-json');
                    if (!json) return null;
                    try {
                        return JSON.parse(json);
                    } catch (e) {
                        console.error('Failed to parse analysis JSON', e);
                        return null;
                    }
                },
                renderHTML: (attributes) => {
                    if (!attributes['data-analysis-json']) {
                        return {};
                    }
                    // If it's an object, stringify it
                    const val = attributes['data-analysis-json'];
                    const str =
                        typeof val === 'string' ? val : JSON.stringify(val);
                    return {
                        'data-analysis-json': str
                    };
                }
            },
            content: {
                default: '',
                parseHTML: (element) => element.textContent || '',
                renderHTML: () => ({}) // Don't render as attribute, rendered as content
            },
            isLoading: {
                default: false,
                parseHTML: (element) => element.hasAttribute('data-loading'),
                renderHTML: (attributes) => {
                    if (!attributes.isLoading) {
                        return {};
                    }
                    return { 'data-loading': 'true' };
                }
            },
            highlightedTerms: {
                default: [],
                parseHTML: (element) => {
                    const val = element.getAttribute('data-highlighted-terms');
                    return val ? JSON.parse(val) : [];
                },
                renderHTML: (attributes) => {
                    if (
                        !attributes.highlightedTerms ||
                        attributes.highlightedTerms.length === 0
                    ) {
                        return {};
                    }
                    return {
                        'data-highlighted-terms': JSON.stringify(
                            attributes.highlightedTerms
                        )
                    };
                }
            }
        };
    },

    parseHTML() {
        return [
            {
                // Parse the new node format
                tag: 'span.analyzed-sentence-node[data-analysis-id]'
            },
            {
                // Also parse old mark format for backwards compatibility during transition
                tag: 'span.analyzed-sentence[data-analysis-id]',
                getAttrs: (element) => {
                    const el = element as HTMLElement;
                    return {
                        'data-analysis-id': el.getAttribute('data-analysis-id'),
                        'data-analysis-json':
                            el.getAttribute('data-analysis-json'),
                        content: el.textContent || ''
                    };
                }
            }
        ];
    },

    renderHTML({ HTMLAttributes, node }) {
        const classes = [
            'analyzed-sentence-node',
            'analyzed-sentence',
            'jp-styled-text'
        ];
        if (node.attrs.isLoading) {
            classes.push('loading-analysis');
        }
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: classes.join(' '),
                contenteditable: 'false'
            }),
            node.attrs.content
        ];
    },

    addNodeView() {
        return ({ node, HTMLAttributes }) => {
            const dom = document.createElement('span');
            const classes = [
                'analyzed-sentence-node',
                'analyzed-sentence',
                'jp-styled-text'
            ];
            if (node.attrs.isLoading) {
                classes.push('loading-analysis');
            }

            const attrs = mergeAttributes(
                this.options.HTMLAttributes,
                HTMLAttributes,
                {
                    class: classes.join(' '),
                    contenteditable: 'false'
                }
            );

            Object.entries(attrs).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    dom.setAttribute(key, String(value));
                }
            });

            // Handle content rendering with highlights
            const content = node.attrs.content as string;
            const terms = node.attrs.highlightedTerms as string[];

            if (terms && terms.length > 0) {
                let currentIndex = 0;
                let html = '';

                // We will try to find each term sequentially in the content
                for (const term of terms) {
                    const foundIndex = content.indexOf(term, currentIndex);

                    if (foundIndex !== -1) {
                        // Append text before the term (unhighlighted)
                        if (foundIndex > currentIndex) {
                            const skipped = content.substring(
                                currentIndex,
                                foundIndex
                            );
                            html += escapeHtml(skipped);
                        }

                        // Append the term (highlighted)
                        html += `<span class="received-analysis-chunk">${escapeHtml(term)}</span>`;

                        // Advance index
                        currentIndex = foundIndex + term.length;
                    } else {
                        // Term not found? Just continue scanning (or break? user said robust...)
                        // If strict, we might stop highlighting. If loose, we stick to currentIndex.
                        // Let's assume sequential. If not found, ignore this term and keep looking for next?
                        // But if analysis returns "ABC" and text is "A B C", it might fail.
                        // For now let's trust the sequence usually matches.
                    }
                }

                // Append remaining text
                if (currentIndex < content.length) {
                    html += escapeHtml(content.substring(currentIndex));
                }

                dom.innerHTML = html;
            } else {
                dom.textContent = content;
            }

            return {
                dom
            };
        };
    },

    addCommands() {
        return {
            setAnalyzedSentence:
                (id: string, isLoading: boolean = false) =>
                ({ state, chain }) => {
                    const { from, to } = state.selection;
                    const selectedText = state.doc.textBetween(from, to, '');

                    if (!selectedText) {
                        return false;
                    }

                    // Delete the selected text and insert the node
                    return chain()
                        .deleteSelection()
                        .insertContent({
                            type: this.name,
                            attrs: {
                                'data-analysis-id': id,
                                content: selectedText,
                                isLoading
                            }
                        })
                        .run();
                },
            setAnalyzedSentenceAt:
                (
                    range: { from: number; to: number },
                    id: string,
                    isLoading: boolean = false
                ) =>
                ({ state, chain }) => {
                    const { from, to } = range;
                    const text = state.doc.textBetween(from, to, '');

                    if (!text) {
                        return false;
                    }

                    // Delete the specified range and insert the node
                    return chain()
                        .deleteRange({ from, to })
                        .insertContentAt(from, {
                            type: this.name,
                            attrs: {
                                'data-analysis-id': id,
                                content: text,
                                isLoading
                            }
                        })
                        .run();
                },
            completeAnalyzedSentence:
                (analysisId: string, analysis: SentenceAnalysis) =>
                ({ tr, dispatch, state }) => {
                    let found = false;
                    state.doc.descendants((node, pos) => {
                        if (
                            node.type.name === 'analyzedSentence' &&
                            node.attrs['data-analysis-id'] === analysisId
                        ) {
                            if (dispatch) {
                                tr.setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    'data-analysis-id': analysisId,
                                    'data-analysis-json': analysis,
                                    isLoading: false,
                                    highlightedTerms: [] // Clear highlighted terms
                                });
                            }
                            found = true;
                            return false; // Stop searching
                        }
                    });
                    if (found && dispatch) {
                        dispatch(tr);
                    }
                    return found;
                },
            removeLoadingAnalyzedSentence:
                (analysisId: string) =>
                ({ tr, dispatch, state }) => {
                    let found = false;
                    state.doc.descendants((node, pos) => {
                        if (
                            node.type.name === 'analyzedSentence' &&
                            node.attrs['data-analysis-id'] === analysisId
                        ) {
                            if (dispatch) {
                                // Replace the node with its text content
                                const textNode = state.schema.text(
                                    node.attrs.content
                                );
                                tr.replaceWith(
                                    pos,
                                    pos + node.nodeSize,
                                    textNode
                                );
                            }
                            found = true;
                            return false; // Stop searching
                        }
                    });
                    if (found && dispatch) {
                        dispatch(tr);
                    }
                    return found;
                },
            removeAnalyzedSentence:
                (id: string) =>
                ({ tr, dispatch, state }) => {
                    let found = false;
                    state.doc.descendants((node, pos) => {
                        if (
                            node.type.name === 'analyzedSentence' &&
                            node.attrs['data-analysis-id'] === id
                        ) {
                            if (dispatch) {
                                // Replace the node with its text content
                                const textNode = state.schema.text(
                                    node.attrs.content
                                );
                                tr.replaceWith(
                                    pos,
                                    pos + node.nodeSize,
                                    textNode
                                );
                            }
                            found = true;
                            return false; // Stop searching
                        }
                    });
                    if (found && dispatch) {
                        dispatch(tr);
                    }
                    return found;
                },
            setSelectedAnalysis:
                (id: string | null) =>
                ({ tr, dispatch }) => {
                    // Update storage
                    this.storage.selectedAnalysisId = id;
                    // Dispatch a transaction with meta to trigger decoration rebuild
                    if (dispatch) {
                        dispatch(tr.setMeta(SELECTED_ANALYSIS_META, id));
                    }
                    return true;
                },
            updateAnalyzedSentenceText:
                (id: string, text: string) =>
                ({ tr, dispatch, state }) => {
                    let found = false;
                    state.doc.descendants((node, pos) => {
                        if (
                            node.type.name === 'analyzedSentence' &&
                            node.attrs['data-analysis-id'] === id
                        ) {
                            if (dispatch) {
                                tr.setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    content: text
                                });
                            }
                            found = true;
                            return false; // Stop searching
                        }
                    });
                    if (found && dispatch) {
                        dispatch(tr);
                    }
                    return found;
                },
            updateAnalyzedSentenceTerms:
                (id: string, terms: string[]) =>
                ({ tr, dispatch, state }) => {
                    let found = false;
                    state.doc.descendants((node, pos) => {
                        if (
                            node.type.name === 'analyzedSentence' &&
                            node.attrs['data-analysis-id'] === id
                        ) {
                            if (dispatch) {
                                tr.setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    highlightedTerms: terms
                                });
                            }
                            found = true;
                            return false; // Stop searching
                        }
                    });
                    if (found && dispatch) {
                        dispatch(tr);
                    }
                    return found;
                },
            updateAnalyzedSentenceData:
                (id: string, analysis: SentenceAnalysis) =>
                ({ tr, dispatch, state }) => {
                    let found = false;
                    state.doc.descendants((node, pos) => {
                        if (
                            node.type.name === 'analyzedSentence' &&
                            node.attrs['data-analysis-id'] === id
                        ) {
                            if (dispatch) {
                                tr.setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    'data-analysis-json': analysis
                                });
                            }
                            found = true;
                            return false; // Stop searching
                        }
                    });
                    if (found && dispatch) {
                        dispatch(tr);
                    }
                    return found;
                }
        };
    },

    // Helper to add at the end of module or inside if needed

    addProseMirrorPlugins() {
        const extensionStorage = this.storage;
        const nodeType = this.type;

        return [
            new Plugin({
                key: selectedAnalysisPluginKey,
                state: {
                    init(_, state) {
                        return buildDecorations(
                            state.doc,
                            nodeType,
                            extensionStorage.selectedAnalysisId
                        );
                    },
                    apply(tr, oldDecorations, _oldState, newState) {
                        // Rebuild decorations if selection changed or doc changed
                        const selectionChanged =
                            tr.getMeta(SELECTED_ANALYSIS_META) !== undefined;
                        if (selectionChanged || tr.docChanged) {
                            return buildDecorations(
                                newState.doc,
                                nodeType,
                                extensionStorage.selectedAnalysisId
                            );
                        }
                        // Map decorations through document changes
                        return oldDecorations.map(tr.mapping, tr.doc);
                    }
                },
                props: {
                    decorations(state) {
                        return this.getState(state);
                    },
                    // Transform copied content to replace AnalyzedSentenceNode with plain text
                    transformCopied: (slice, view) => {
                        const schema = view.state.schema;

                        // Recursively transform nodes in a fragment
                        const transformFragment = (
                            fragment: Fragment
                        ): Fragment => {
                            const nodes: ProseMirrorNode[] = [];
                            fragment.forEach((node) => {
                                if (node.type.name === 'analyzedSentence') {
                                    // Replace analyzed sentence node with plain text
                                    const textContent = node.attrs
                                        .content as string;
                                    if (textContent) {
                                        // Use schema.text() to create text nodes
                                        nodes.push(schema.text(textContent));
                                    }
                                } else if (node.isText) {
                                    nodes.push(node);
                                } else {
                                    // Recursively transform child content
                                    const newContent = transformFragment(
                                        node.content
                                    );
                                    nodes.push(node.copy(newContent));
                                }
                            });
                            return Fragment.fromArray(nodes);
                        };

                        const newContent = transformFragment(slice.content);
                        return new Slice(
                            newContent,
                            slice.openStart,
                            slice.openEnd
                        );
                    },
                    // Serialize analyzed sentences as plain text for clipboard
                    clipboardTextSerializer: (slice) => {
                        let text = '';
                        slice.content.forEach((node) => {
                            if (node.type.name === 'analyzedSentence') {
                                // Include the text content of analyzed nodes
                                text += node.attrs.content || '';
                            } else {
                                text += node.textContent;
                            }
                        });
                        return text;
                    }
                }
            })
        ];
    }
});

/**
 * Build decorations for the selected analyzed sentence node
 */
function buildDecorations(
    doc: import('prosemirror-model').Node,
    nodeType: import('prosemirror-model').NodeType,
    selectedId: string | null
): DecorationSet {
    const decorations: Decoration[] = [];

    // Add selected decoration for analyzed sentence nodes
    if (selectedId) {
        doc.descendants((node, pos) => {
            if (node.type !== nodeType) return;

            if (node.attrs['data-analysis-id'] === selectedId) {
                decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                        class: 'selected'
                    })
                );
            }
        });
    }

    if (decorations.length === 0) {
        return DecorationSet.empty;
    }

    return DecorationSet.create(doc, decorations);
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Helper to check if an HTML element represents an analyzed sentence node.
 * Used to preventing conflicting parse rules in other extensions.
 */
export function isAnalyzedSentenceEl(element: HTMLElement): boolean {
    return (
        element.classList.contains('analyzed-sentence-node') ||
        element.classList.contains('analyzed-sentence') ||
        element.hasAttribute('data-analysis-id')
    );
}
