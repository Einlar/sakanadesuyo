import type { SentenceAnalysis } from '$lib/types';

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

const DB_NAME = 'wakarimasen-notebook';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

/**
 * Opens the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id'
                });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
        };
    });
}

/**
 * Generates a unique ID for documents
 */
function generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Creates the notebook store with Svelte 5 runes
 */
function createNotebookStore() {
    let documents = $state<NotebookDocument[]>([]);
    let initialized = $state(false);
    let db: IDBDatabase | null = null;

    /**
     * Initialize the store by loading documents from IndexedDB
     */
    async function init() {
        if (initialized) return;

        try {
            db = await openDB();
            await loadDocuments();
            initialized = true;
        } catch (error) {
            console.error('Failed to initialize notebook store:', error);
        }
    }

    /**
     * Load all documents from IndexedDB
     */
    async function loadDocuments() {
        if (!db) return;

        return new Promise<void>((resolve, reject) => {
            const transaction = db!.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('updatedAt');
            const request = index.openCursor(null, 'prev'); // newest first

            const results: NotebookDocument[] = [];

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const doc = cursor.value;
                    // Convert date strings back to Date objects
                    doc.createdAt = new Date(doc.createdAt);
                    doc.updatedAt = new Date(doc.updatedAt);
                    results.push(doc);
                    cursor.continue();
                } else {
                    documents = results;
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a document to IndexedDB
     */
    async function saveDocument(doc: NotebookDocument) {
        if (!db) return;

        return new Promise<void>((resolve, reject) => {
            const transaction = db!.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(doc);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Create a new document
     */
    function createDocument(title: string = 'Untitled'): NotebookDocument {
        const now = new Date();
        const doc: NotebookDocument = {
            id: generateId(),
            title,
            content: '',
            createdAt: now,
            updatedAt: now
        };

        documents = [doc, ...documents];
        saveDocument(doc);
        return doc;
    }

    /**
     * Update a document
     */
    function updateDocument(
        id: string,
        updates: Partial<Pick<NotebookDocument, 'title' | 'content'>>
    ) {
        const index = documents.findIndex((d) => d.id === id);
        if (index === -1) return;

        // Use $state.snapshot() to get a plain object (not a Proxy) for IndexedDB storage
        let updated = {
            ...$state.snapshot(documents[index]),
            ...updates,
            updatedAt: new Date()
        };

        // Update local state and re-sort
        const newDocs = [...documents];
        newDocs.splice(index, 1);
        newDocs.unshift(updated); // Move to top (most recently updated)
        documents = newDocs;

        saveDocument(updated);
    }

    /**
     * Delete a document
     */
    function deleteDocument(id: string) {
        documents = documents.filter((d) => d.id !== id);

        if (!db) return;

        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(id);
    }

    /**
     * Get a document by ID
     */
    function getDocument(id: string): NotebookDocument | undefined {
        return documents.find((d) => d.id === id);
    }

    /**
     * Search documents by title or content
     */
    function searchDocuments(query: string): NotebookDocument[] {
        if (!query.trim()) return documents;

        const lowerQuery = query.toLowerCase();
        return documents.filter(
            (doc) =>
                doc.title.toLowerCase().includes(lowerQuery) ||
                doc.content.toLowerCase().includes(lowerQuery)
        );
    }

    return {
        get documents() {
            return documents;
        },
        get initialized() {
            return initialized;
        },
        init,
        createDocument,
        updateDocument,
        deleteDocument,
        getDocument,
        searchDocuments
    };
}

export const notebookStore = createNotebookStore();
