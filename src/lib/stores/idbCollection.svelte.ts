/**
 * Shared plumbing for IndexedDB-backed collection stores (see
 * karaokeStore and notebookStore).
 *
 * Keeps a reactive array of records sorted by `updatedAt` (newest first),
 * mirrored to an IndexedDB object store keyed by `id`. The object store
 * must have an `updatedAt` index (create it in the `upgrade` callback).
 */

/** Minimum shape of a record managed by a collection. */
export interface StoredRecord {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IdbCollectionOptions<T extends StoredRecord> {
    dbName: string;
    dbVersion: number;
    storeName: string;
    /** Creates object stores/indexes and runs migrations (called inside onupgradeneeded). */
    upgrade: (db: IDBDatabase, transaction: IDBTransaction) => void;
    /**
     * Merges an incoming synced record with the locally stored one,
     * e.g. to keep fields the peer doesn't send. Defaults to taking
     * the incoming record as-is.
     */
    mergeOnSync?: (incoming: T, existing: T) => T;
}

/** Resolves/rejects when an IndexedDB request completes. */
function promisify<R>(request: IDBRequest<R>): Promise<R> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Generates a unique record ID with the given prefix, e.g. `song_1712_ab12cd3`. */
export function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createIdbCollection<T extends StoredRecord>(
    options: IdbCollectionOptions<T>
) {
    const { dbName, dbVersion, storeName, upgrade, mergeOnSync } = options;

    let items = $state<T[]>([]);
    let initialized = $state(false);
    let db: IDBDatabase | null = null;

    function openDatabase(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = () =>
                upgrade(request.result, request.transaction!);
        });
    }

    /**
     * Opens the database and loads all records. Safe to call multiple
     * times; initialization failures are logged and leave the store empty.
     */
    async function init() {
        if (initialized) return;

        try {
            db = await openDatabase();
            await load();
            initialized = true;
        } catch (error) {
            console.error(`Failed to initialize ${storeName} store:`, error);
        }
    }

    /** Loads all records, newest first. */
    async function load() {
        if (!db) return;

        const transaction = db.transaction(storeName, 'readonly');
        const index = transaction.objectStore(storeName).index('updatedAt');
        const records = await promisify(index.getAll() as IDBRequest<T[]>);

        records.reverse(); // getAll returns oldest-first
        for (const record of records) {
            // Revive dates (older records may have been stored as strings)
            record.createdAt = new Date(record.createdAt);
            record.updatedAt = new Date(record.updatedAt);
        }
        items = records;
    }

    /** Persists a record (does not touch reactive state). */
    async function save(item: T) {
        if (!db) return;

        const transaction = db.transaction(storeName, 'readwrite');
        // Snapshot to strip reactive proxies before structured cloning
        const request = transaction
            .objectStore(storeName)
            .put($state.snapshot(item));
        await promisify(request);
    }

    /** Adds a new record to the front of the collection and persists it. */
    async function insert(item: T): Promise<T> {
        items = [item, ...items];
        await save(item);
        return item;
    }

    /**
     * Applies partial updates to a record, bumps its `updatedAt` and moves
     * it to the front. Returns the updated record, or undefined if not found.
     */
    async function update(
        id: string,
        updates: Partial<Omit<T, 'id' | 'createdAt'>>
    ): Promise<T | undefined> {
        const index = items.findIndex((item) => item.id === id);
        if (index === -1) return;

        const updated: T = {
            ...($state.snapshot(items[index]) as T),
            ...updates,
            updatedAt: new Date()
        };

        const next = [...items];
        next.splice(index, 1);
        next.unshift(updated);
        items = next;

        await save(updated);
        return updated;
    }

    /** Removes a record from the collection and from IndexedDB. */
    async function remove(id: string) {
        items = items.filter((item) => item.id !== id);

        if (!db) return;
        const transaction = db.transaction(storeName, 'readwrite');
        await promisify(transaction.objectStore(storeName).delete(id));
    }

    /**
     * Upserts records from a sync operation.
     * Preserves the original updatedAt (does not generate a new one).
     * Only applies items that are newer than what's already stored.
     */
    async function upsert(incoming: T[]) {
        if (!db || incoming.length === 0) return;

        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        for (const record of incoming) {
            const existing = items.find((item) => item.id === record.id);
            if (existing && existing.updatedAt >= record.updatedAt) continue;

            const merged =
                existing && mergeOnSync
                    ? mergeOnSync(record, existing)
                    : record;

            store.put($state.snapshot(merged) as T);

            const index = items.findIndex((item) => item.id === record.id);
            if (index >= 0) {
                items[index] = merged;
            } else {
                items = [merged, ...items];
            }
        }

        items = [...items].sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
        );

        return new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    return {
        get items() {
            return items;
        },
        get initialized() {
            return initialized;
        },
        init,
        insert,
        update,
        remove,
        upsert
    };
}
