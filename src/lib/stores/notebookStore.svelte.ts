import { createIdbCollection, generateId } from './idbCollection.svelte';

/**
 * Represents a notebook document stored in IndexedDB
 */
export interface NotebookDocument {
    id: string;
    title: string;
    content: string; // HTML content from Tipex
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Creates the notebook store with Svelte 5 runes
 */
function createNotebookStore() {
    const collection = createIdbCollection<NotebookDocument>({
        dbName: 'wakarimasen-notebook',
        dbVersion: 1,
        storeName: 'documents',
        upgrade(db) {
            if (!db.objectStoreNames.contains('documents')) {
                const store = db.createObjectStore('documents', {
                    keyPath: 'id'
                });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
        }
    });

    /**
     * Create a new document
     */
    function createDocument(title: string = 'Untitled'): NotebookDocument {
        const now = new Date();
        const doc: NotebookDocument = {
            id: generateId('doc'),
            title,
            content: '',
            createdAt: now,
            updatedAt: now
        };

        collection.insert(doc);
        return doc;
    }

    /**
     * Update a document
     */
    function updateDocument(
        id: string,
        updates: Partial<Pick<NotebookDocument, 'title' | 'content'>>
    ) {
        collection.update(id, updates);
    }

    /**
     * Get a document by ID
     */
    function getDocument(id: string): NotebookDocument | undefined {
        return collection.items.find((d) => d.id === id);
    }

    /**
     * Search documents by title or content
     */
    function searchDocuments(query: string): NotebookDocument[] {
        if (!query.trim()) return collection.items;

        const lowerQuery = query.toLowerCase();
        return collection.items.filter(
            (doc) =>
                doc.title.toLowerCase().includes(lowerQuery) ||
                doc.content.toLowerCase().includes(lowerQuery)
        );
    }

    return {
        get documents() {
            return collection.items;
        },
        get initialized() {
            return collection.initialized;
        },
        init: collection.init,
        createDocument,
        updateDocument,
        deleteDocument: collection.remove,
        getDocument,
        searchDocuments,
        upsertDocuments: collection.upsert
    };
}

export const notebookStore = createNotebookStore();
