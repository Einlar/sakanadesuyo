<script lang="ts">
    import type { NotebookDocument } from '$lib/stores/notebookStore.svelte';
    import DocumentPlusIcon from '$lib/components/icons/DocumentPlusIcon.svelte';
    import SidebarIcon from '$lib/components/icons/SidebarIcon.svelte';

    interface Props {
        documents: NotebookDocument[];
        selectedDocId: string | null;
        onSelect: (id: string) => void;
        onNew: () => void;
        onDelete: (id: string) => void;
        onToggle?: () => void;
    }

    let {
        documents,
        selectedDocId,
        onSelect,
        onNew,
        onDelete,
        onToggle
    }: Props = $props();

    /** Search query for filtering documents */
    let searchQuery = $state('');

    /** Filtered documents based on search */
    let filteredDocuments = $derived(() => {
        if (!searchQuery.trim()) return documents;
        const query = searchQuery.toLowerCase();
        return documents.filter(
            (doc) =>
                doc.title.toLowerCase().includes(query) ||
                doc.content.toLowerCase().includes(query)
        );
    });

    /** Format relative date */
    function formatRelativeDate(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours === 0) {
                const minutes = Math.floor(diff / (1000 * 60));
                return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
            }
            return `${hours}h ago`;
        }
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    /** Handle delete with confirmation */
    function handleDelete(e: MouseEvent, id: string) {
        e.stopPropagation();
        if (confirm('Delete this document?')) {
            onDelete(id);
        }
    }
</script>

<aside
    class="col-start-1 row-span-full flex flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface)]"
>
    <header
        class="flex items-center justify-between border-b border-[var(--color-border)] p-4"
    >
        <h2 class="m-0 text-xl font-semibold text-[var(--color-text)]">
            Notebook
        </h2>
        {#if onToggle}
            <button
                class="flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-background)] hover:text-[var(--color-text)]"
                onclick={onToggle}
                aria-label="Toggle sidebar"
            >
                <SidebarIcon class="h-5 w-5" />
            </button>
        {/if}
    </header>

    <div class="px-4 py-3">
        <input
            type="search"
            placeholder="Search documents..."
            bind:value={searchQuery}
            class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
        />
    </div>

    <button
        class="mx-4 mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-[var(--color-primary)] p-2.5 font-medium text-black transition-all duration-200 hover:-translate-y-px hover:opacity-90"
        onclick={onNew}
    >
        <DocumentPlusIcon class="mt-[1px] h-4 w-4 shrink-0" />
        New Document
    </button>

    <div
        class="flex-1 space-y-1 overflow-x-hidden overflow-y-auto p-2"
        role="listbox"
        aria-label="Documents"
    >
        {#each filteredDocuments() as doc (doc.id)}
            <div
                class="group grid w-full cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border-none p-3 text-left transition-colors duration-200 hover:bg-[var(--color-background)] {doc.id ===
                selectedDocId
                    ? 'bg-[oklch(0.6_0.15_250_/_0.15)] ring-[1.5px] ring-[var(--color-primary)] ring-inset'
                    : 'bg-transparent'}"
                onclick={() => onSelect(doc.id)}
                onkeydown={(e) => e.key === 'Enter' && onSelect(doc.id)}
                role="option"
                aria-selected={doc.id === selectedDocId}
                tabindex="0"
            >
                <span
                    class="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-[var(--color-text)]"
                    >{doc.title || 'Untitled'}</span
                >
                <span
                    class="text-xs whitespace-nowrap text-[var(--color-text-muted)]"
                    >{formatRelativeDate(doc.updatedAt)}</span
                >
                <button
                    class="flex h-6 w-6 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-xl leading-none text-[var(--color-text-muted)] opacity-0 transition-all duration-200 group-hover:opacity-100 hover:text-red-500"
                    onclick={(e) => handleDelete(e, doc.id)}
                    aria-label="Delete document"
                    title="Delete"
                >
                    ×
                </button>
            </div>
        {:else}
            <p
                class="py-8 px-4 text-center text-sm text-[var(--color-text-muted)]"
            >
                {searchQuery ? 'No matching documents' : 'No documents yet'}
            </p>
        {/each}
    </div>
</aside>
