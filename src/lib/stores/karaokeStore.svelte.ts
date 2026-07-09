import type { SentenceAnalysis } from '$lib/types';
import type { FuriganaSegment } from '$lib/types';
import { createIdbCollection, generateId } from './idbCollection.svelte';

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
    const collection = createIdbCollection<KaraokeSong>({
        dbName: 'wakarimasen-karaoke',
        dbVersion: 2, // Incremented for schema change
        storeName: 'songs',
        upgrade(db, transaction) {
            let store: IDBObjectStore;
            if (!db.objectStoreNames.contains('songs')) {
                store = db.createObjectStore('songs', { keyPath: 'id' });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
                store.createIndex('title', 'title', { unique: false });
            } else {
                store = transaction.objectStore('songs');
            }

            if (!store.indexNames.contains('slug')) {
                store.createIndex('slug', 'slug', { unique: true });
            }
        },
        // Preserve the local audioBlob when the synced copy has none
        mergeOnSync: (incoming, existing) => ({
            ...incoming,
            audioBlob: existing.audioBlob ?? incoming.audioBlob
        })
    });

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
        while (collection.items.some((s) => s.slug === slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        const song: KaraokeSong = {
            id: generateId('song'),
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

        return collection.insert(song);
    }

    /**
     * Update a song, addressed by ID or slug
     */
    async function updateSong(
        slugOrId: string,
        updates: Partial<Omit<KaraokeSong, 'id' | 'createdAt'>>
    ) {
        const song = collection.items.find(
            (s) => s.id === slugOrId || s.slug === slugOrId
        );
        if (!song) return;

        return collection.update(song.id, updates);
    }

    /**
     * Get a song by ID
     */
    function getSong(id: string): KaraokeSong | undefined {
        return collection.items.find((s) => s.id === id);
    }

    /**
     * Get a song by Slug
     */
    function getSongBySlug(slug: string): KaraokeSong | undefined {
        return collection.items.find((s) => s.slug === slug);
    }

    /**
     * Search songs by title or artist
     */
    function searchSongs(query: string): KaraokeSong[] {
        if (!query.trim()) return collection.items;

        const lowerQuery = query.toLowerCase();
        return collection.items.filter(
            (song) =>
                song.title.toLowerCase().includes(lowerQuery) ||
                song.artist.toLowerCase().includes(lowerQuery)
        );
    }

    return {
        get songs() {
            return collection.items;
        },
        get initialized() {
            return collection.initialized;
        },
        init: collection.init,
        addSong,
        updateSong,
        deleteSong: collection.remove,
        getSong,
        getSongBySlug,
        searchSongs,
        upsertSongs: collection.upsert
    };
}

export const karaokeStore = createKaraokeStore();
