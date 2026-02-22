import { Node, mergeAttributes } from '@tiptap/core';
import { mount, unmount } from 'svelte';
import { writable, type Writable } from 'svelte/store';
import ImageNode from './ImageNode.svelte';

export interface ImageNodeContext {
    node: any;
    selected: boolean;
    extension: any;
    editor: any;
    getPos: () => number;
    updateAttributes: (attrs: any) => void;
}

export const ImageExtension = Node.create({
    name: 'image',

    addOptions() {
        return {
            inline: false,
            HTMLAttributes: {}
        };
    },

    inline() {
        return this.options.inline;
    },

    group() {
        return this.options.inline ? 'inline' : 'block';
    },

    draggable: true,
    atom: true,

    addAttributes() {
        return {
            src: {
                default: null
            },
            ocrText: {
                default: null
            },
            alt: {
                default: null
            },
            title: {
                default: null
            },
            width: {
                default: null,
                parseHTML: (element) => element.getAttribute('width'),
                renderHTML: (attributes) => {
                    if (!attributes.width) {
                        return {};
                    }
                    return {
                        width: attributes.width
                    };
                }
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: 'img[src]'
            }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'img',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
        ];
    },

    addNodeView() {
        return (props) => {
            const dom = document.createElement('div');
            dom.style.display = 'inline-flex'; // Changed to inline-flex to match component
            dom.className = 'image-node-view';

            const ctxStore: Writable<ImageNodeContext> = writable({
                node: props.node,
                selected: false,
                extension: this,
                editor: props.editor,
                getPos: props.getPos as () => number,
                updateAttributes: (attrs: any) => {
                    if (props.getPos) {
                        props.editor.view.dispatch(
                            props.editor.view.state.tr.setNodeMarkup(
                                props.getPos(),
                                undefined,
                                {
                                    ...props.node.attrs,
                                    ...attrs
                                }
                            )
                        );
                    }
                }
            });

            const component = mount(ImageNode, {
                target: dom,
                props: { ctxStore }
            });

            return {
                dom,
                update: (node) => {
                    if (node.type !== props.node.type) {
                        return false;
                    }

                    ctxStore.update((ctx) => ({
                        ...ctx,
                        node: node
                    }));

                    return true;
                },
                selectNode: () => {
                    ctxStore.update((ctx) => ({ ...ctx, selected: true }));
                },
                deselectNode: () => {
                    ctxStore.update((ctx) => ({ ...ctx, selected: false }));
                },
                destroy: () => {
                    unmount(component);
                },
                stopEvent: (event) => {
                    const target = event.target as HTMLElement;
                    return target.classList.contains('resize-handle');
                },
                ignoreMutation: () => true
            };
        };
    }
});
