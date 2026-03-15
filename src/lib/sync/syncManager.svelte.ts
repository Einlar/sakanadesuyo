import { notebookStore } from '$lib/stores/notebookStore.svelte';
import { karaokeStore } from '$lib/stores/karaokeStore.svelte';
import { webrtcManager } from './webrtcManager.svelte';
import { serializeDocument, deserializeDocument, serializeSong, deserializeSong } from './serialization';
import { computeDiff } from './merger';
import { generateQRSvg } from './qrCode';
import type Peer from 'simple-peer';
import type { SyncManifest, SyncMessage, NotebookDocument, KaraokeSong } from './types';

function createSyncManager() {
    let qrSvg = $state<string | null>(null);
    let pairUrl = $state<string | null>(null);
    let progress = $state({ sent: 0, received: 0 });
    let syncResult = $state<{ docs: number; songs: number } | null>(null);
    let isDone = $state(false);

    // Staged buffers — nothing written to IDB until remote sends 'done'
    const pendingDocs = new Map<string, NotebookDocument>();
    const pendingSongs = new Map<string, KaraokeSong>();
    let remoteDone = false;
    let localDone = false;

    let peer: Peer.Instance | null = null;

    webrtcManager.setOnChannelOpen((p) => {
        peer = p;
        p.on('data', (data) => handleMessage(JSON.parse(data.toString()) as SyncMessage));
        beginSync();
    });

    function send(msg: SyncMessage) {
        peer?.send(JSON.stringify(msg));
    }

    function buildManifest(): SyncManifest {
        return {
            notebooks: notebookStore.documents.map((d) => ({
                id: d.id,
                updatedAt: d.updatedAt.toISOString()
            })),
            songs: karaokeStore.songs.map((s) => ({
                id: s.id,
                updatedAt: s.updatedAt.toISOString()
            }))
        };
    }

    function beginSync() {
        remoteDone = false;
        localDone = false;
        pendingDocs.clear();
        pendingSongs.clear();
        send({ type: 'manifest', data: buildManifest() });
    }

    async function sendMissingData(remoteManifest: SyncManifest) {
        const diff = computeDiff(remoteManifest, buildManifest());

        for (const id of diff.neededDocIds) {
            const doc = notebookStore.getDocument(id);
            if (doc) {
                send({ type: 'doc', data: serializeDocument(doc) });
                progress.sent++;
            }
        }

        for (const id of diff.neededSongIds) {
            const song = karaokeStore.getSong(id);
            if (song) {
                send({ type: 'song', data: serializeSong(song) });
                progress.sent++;
            }
        }

        localDone = true;
        send({ type: 'done' });
        if (remoteDone) await commit();
    }

    async function handleMessage(msg: SyncMessage) {
        if (msg.type === 'manifest') {
            await sendMissingData(msg.data);
        } else if (msg.type === 'doc') {
            pendingDocs.set(msg.data.id, deserializeDocument(msg.data));
            progress.received++;
        } else if (msg.type === 'song') {
            pendingSongs.set(msg.data.id, deserializeSong(msg.data));
            progress.received++;
        } else if (msg.type === 'done') {
            remoteDone = true;
            if (localDone) await commit();
        }
    }

    async function commit() {
        const docs = [...pendingDocs.values()];
        const songs = [...pendingSongs.values()];

        await notebookStore.upsertDocuments(docs);
        await karaokeStore.upsertSongs(songs);

        syncResult = { docs: docs.length, songs: songs.length };
        isDone = true;
        pendingDocs.clear();
        pendingSongs.clear();
    }

    async function startAsInitiator() {
        progress = { sent: 0, received: 0 };
        syncResult = null;
        await Promise.all([notebookStore.init(), karaokeStore.init()]);
        const token = await webrtcManager.startAsInitiator();
        const url = `${window.location.origin}/sync?token=${token}&role=join`;
        pairUrl = url;
        qrSvg = await generateQRSvg(url);
    }

    async function joinAsResponder(token: string) {
        progress = { sent: 0, received: 0 };
        syncResult = null;
        await Promise.all([notebookStore.init(), karaokeStore.init()]);
        webrtcManager.joinAsResponder(token);
    }

    function reset() {
        webrtcManager.reset();
        isDone = false;
        qrSvg = null;
        pairUrl = null;
        syncResult = null;
        progress = { sent: 0, received: 0 };
        pendingDocs.clear();
        pendingSongs.clear();
        remoteDone = false;
        localDone = false;
        peer = null;
    }

    return {
        get status() { return isDone ? 'done' : webrtcManager.status; },
        get errorMessage() { return webrtcManager.errorMessage; },
        get qrSvg() { return qrSvg; },
        get pairUrl() { return pairUrl; },
        get progress() { return progress; },
        get syncResult() { return syncResult; },
        startAsInitiator,
        joinAsResponder,
        reset
    };
}

export const syncManager = createSyncManager();
