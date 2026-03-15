import type { SentenceAnalysis } from '$lib/types';
import type { FuriganaSegment } from '$lib/types';

/**
 * A sentence with optional analysis and timestamps
 */
export interface KaraokeSentence {
    /**
     * The text of the verse.
     */
    text: string;

    /**
     * Start time (in seconds) for lyrics syncing
     */
    startTime?: number;

    /**
     * Analysis computed by an LLM
     */
    analysis?: SentenceAnalysis;

    /**
     * Furigana computed by kuromoji
     */
    furigana?: FuriganaSegment[];
}

/**
 * A karaoke song with lyrics and optional audio
 */
export interface KaraokeSong {
    /**
     * A unique identifier for the song.
     */
    id: string;

    /**
     * A human-readable unique identifier for the song, used in the URL. Computed by combining title & artist.
     */
    slug: string;

    /**
     * The title of the song.
     */
    title: string;

    /**
     * The artist of the song.
     */
    artist: string;

    /**
     * The URL of the song's cover art.
     */
    coverUrl?: string;

    /**
     * The lyrics of the song.
     */
    lyrics: string;

    /**
     * The audio data of the song.
     */
    audioBlob?: Blob;

    /**
     * Verses of the song.
     */
    sentences: KaraokeSentence[];

    /**
     * Expected duration in seconds from synced lyrics
     */
    expectedDuration?: number;

    /**
     * Date when the song was created.
     */
    createdAt: Date;

    /**
     * Date when the song was last updated.
     */
    updatedAt: Date;
}

const DB_NAME = 'wakarimasen-karaoke';
const DB_VERSION = 2; // Incremented for schema change
const STORE_NAME = 'songs';

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
            const transaction = (event.target as IDBOpenDBRequest).transaction!;

            let store: IDBObjectStore;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id'
                });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
                store.createIndex('title', 'title', { unique: false });
            } else {
                store = transaction.objectStore(STORE_NAME);
            }

            if (!store.indexNames.contains('slug')) {
                store.createIndex('slug', 'slug', { unique: true });
            }
        };
    });
}

/**
 * Generates a unique ID for songs
 */
function generateId(): string {
    return `song_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Slugifies a string
 */
function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Creates the karaoke store with Svelte 5 runes
 */
function createKaraokeStore() {
    let songs = $state<KaraokeSong[]>([]);
    let initialized = $state(false);
    let db: IDBDatabase | null = null;

    /**
     * Initialize the store by loading songs from IndexedDB
     */
    async function init() {
        if (initialized) return;

        try {
            db = await openDB();
            await loadSongs();
            initialized = true;
        } catch (error) {
            console.error('Failed to initialize karaoke store:', error);
        }
    }

    /**
     * Load all songs from IndexedDB
     */
    async function loadSongs() {
        if (!db) return;

        return new Promise<void>((resolve, reject) => {
            const transaction = db!.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('updatedAt');
            const request = index.openCursor(null, 'prev'); // newest first

            const results: KaraokeSong[] = [];

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const song = cursor.value;
                    // Convert date strings back to Date objects
                    song.createdAt = new Date(song.createdAt);
                    song.updatedAt = new Date(song.updatedAt);
                    results.push(song);
                    cursor.continue();
                } else {
                    songs = results;
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a song to IndexedDB
     */
    async function saveSong(song: KaraokeSong) {
        if (!db) return;

        return new Promise<void>((resolve, reject) => {
            const transaction = db!.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put($state.snapshot(song));

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Add a new song
     */
    async function addSong(data: {
        title: string;
        artist: string;
        coverUrl?: string;
        lyrics: string;
    }): Promise<KaraokeSong> {
        const now = new Date();

        let baseSlug = slugify(`${data.title}-${data.artist}`);
        if (!baseSlug) baseSlug = 'song';

        // Ensure slug uniqueness
        let slug = baseSlug;
        let counter = 1;
        while (songs.some((s) => s.slug === slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        const song: KaraokeSong = {
            id: generateId(),
            slug,
            title: data.title,
            artist: data.artist,
            coverUrl: data.coverUrl,
            lyrics: data.lyrics,
            sentences: data.lyrics
                .split('\n')
                .filter((line) => line.trim())
                .map((text) => ({ text })),
            createdAt: now,
            updatedAt: now
        };

        songs = [song, ...songs];
        await saveSong(song);
        return song;
    }

    /**
     * Update a song
     */
    async function updateSong(
        slugOrId: string,
        updates: Partial<Omit<KaraokeSong, 'id' | 'createdAt'>>
    ) {
        const index = songs.findIndex(
            (s) => s.id === slugOrId || s.slug === slugOrId
        );
        if (index === -1) return;

        const updated: KaraokeSong = {
            ...songs[index],
            ...updates,
            updatedAt: new Date()
        };

        // Update local state and re-sort
        const newSongs = [...songs];
        newSongs.splice(index, 1);
        newSongs.unshift(updated);
        songs = newSongs;

        await saveSong(updated);
        return updated;
    }

    /**
     * Delete a song
     */
    async function deleteSong(id: string) {
        songs = songs.filter((s) => s.id !== id);

        if (!db) return;

        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(id);
    }

    /**
     * Get a song by ID
     */
    function getSong(id: string): KaraokeSong | undefined {
        return songs.find((s) => s.id === id);
    }

    /**
     * Get a song by Slug
     */
    function getSongBySlug(slug: string): KaraokeSong | undefined {
        return songs.find((s) => s.slug === slug);
    }

    /**
     * Upsert songs from a sync operation.
     * Preserves the original updatedAt (does not generate a new one).
     * Only applies items that are newer than what's already stored.
     */
    async function upsertSongs(incoming: KaraokeSong[]) {
        if (!db || incoming.length === 0) return;

        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        for (const song of incoming) {
            const existing = songs.find((s) => s.id === song.id);
            if (existing && existing.updatedAt >= song.updatedAt) continue;

            // Preserve existing audioBlob if incoming has none
            const merged = {
                ...song,
                audioBlob: existing?.audioBlob ?? song.audioBlob
            };

            const snapshot = $state.snapshot(merged) as KaraokeSong;
            store.put(snapshot);

            const idx = songs.findIndex((s) => s.id === song.id);
            if (idx >= 0) {
                songs[idx] = merged;
            } else {
                songs = [merged, ...songs];
            }
        }

        // Re-sort by updatedAt descending
        songs = [...songs].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        return new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Search songs by title or artist
     */
    function searchSongs(query: string): KaraokeSong[] {
        if (!query.trim()) return songs;

        const lowerQuery = query.toLowerCase();
        return songs.filter(
            (song) =>
                song.title.toLowerCase().includes(lowerQuery) ||
                song.artist.toLowerCase().includes(lowerQuery)
        );
    }

    return {
        get songs() {
            return songs;
        },
        get initialized() {
            return initialized;
        },
        init,
        addSong,
        updateSong,
        deleteSong,
        getSong,
        getSongBySlug,
        searchSongs,
        upsertSongs
    };
}

export const karaokeStore = createKaraokeStore();
