import type { SyncManifest } from './types';

/** Items the remote has that we're missing or have a stale version of */
export interface SyncDiff {
    neededDocIds: string[];
    neededSongIds: string[];
}

export function computeDiff(local: SyncManifest, remote: SyncManifest): SyncDiff {
    const localDocs = new Map(local.notebooks.map((n) => [n.id, n.updatedAt]));
    const localSongs = new Map(local.songs.map((s) => [s.id, s.updatedAt]));

    const neededDocIds = remote.notebooks
        .filter((n) => {
            const localDate = localDocs.get(n.id);
            return !localDate || n.updatedAt > localDate;
        })
        .map((n) => n.id);

    const neededSongIds = remote.songs
        .filter((s) => {
            const localDate = localSongs.get(s.id);
            return !localDate || s.updatedAt > localDate;
        })
        .map((s) => s.id);

    return { neededDocIds, neededSongIds };
}
