import type { NotebookDocument } from '$lib/stores/notebookStore.svelte';
import type { KaraokeSong } from '$lib/stores/karaokeStore.svelte';

export type SyncStatus =
    | 'idle'
    | 'creating-session'
    | 'waiting-for-peer'
    | 'connecting'
    | 'syncing'
    | 'done'
    | 'error';

// Wire format (dates as ISO strings, no audioBlob)
export interface SerializedDocument {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export type SerializedSong = Omit<KaraokeSong, 'audioBlob' | 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
};

export interface SyncManifest {
    notebooks: Array<{ id: string; updatedAt: string }>;
    songs: Array<{ id: string; updatedAt: string }>;
}

export type SyncMessage =
    | { type: 'manifest'; data: SyncManifest }
    | { type: 'doc'; data: SerializedDocument }
    | { type: 'song'; data: SerializedSong }
    | { type: 'done' };

export type { NotebookDocument, KaraokeSong };
