import Peer from 'simple-peer';
import type { SyncStatus } from './types';

const STUN_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
];
const CONNECTION_TIMEOUT_MS = 30_000;

function createWebRTCManager() {
    let status = $state<SyncStatus>('idle');
    let errorMessage = $state<string | null>(null);

    let peer: Peer.Instance | null = null;
    let sse: EventSource | null = null;
    let token: string | null = null;
    let peerId: string | null = null;
    let connectionTimer: ReturnType<typeof setTimeout> | null = null;
    let gatheredCandidateTypes = new Set<string>();

    let onChannelOpen: ((peer: Peer.Instance) => void) | null = null;

    function setError(msg: string) {
        errorMessage = msg;
        status = 'error';
        cleanup();
    }

    function cleanup() {
        sse?.close();
        sse = null;
        peer?.destroy();
        peer = null;
        if (connectionTimer) {
            clearTimeout(connectionTimer);
            connectionTimer = null;
        }
    }

    // If only 'host' candidates were gathered, STUN is unreachable — WebRTC is likely blocked.
    function withBlockedHint(msg: string): string {
        const hasPublicCandidate = gatheredCandidateTypes.has('srflx') || gatheredCandidateTypes.has('relay');
        return hasPublicCandidate
            ? msg
            : `${msg} WebRTC traffic may be blocked by a firewall or strict NAT on this network.`;
    }

    async function postSignal(data: Peer.SignalData) {
        await fetch('/api/sync/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, from: peerId, type: 'signal', payload: data })
        });
    }

    function createPeer(initiator: boolean) {
        gatheredCandidateTypes.clear();

        peer = new Peer({
            initiator,
            trickle: true,
            config: { iceServers: STUN_SERVERS }
        });

        peer.on('signal', (data) => {
            if (data.type === 'candidate' && data.candidate?.candidate) {
                const match = /typ (\w+)/.exec(data.candidate.candidate);
                if (match) gatheredCandidateTypes.add(match[1]);
            }
            postSignal(data);
        });

        connectionTimer = setTimeout(() => {
            if (status === 'connecting') {
                setError(withBlockedHint('Connection timed out.'));
            }
        }, CONNECTION_TIMEOUT_MS);

        peer.on('connect', () => {
            if (connectionTimer) clearTimeout(connectionTimer);
            status = 'syncing';
            onChannelOpen?.(peer!);
        });
        peer.on('error', (err) => {
            const isIceFail = /ice/i.test(err.message);
            setError(isIceFail ? withBlockedHint(err.message) : err.message);
        });
        peer.on('close', () => {
            if (status === 'syncing') setError('Connection closed');
        });
    }

    function openSSE(t: string) {
        token = t;
        sse = new EventSource(`/api/sync/sse/${t}`);
        sse.onerror = () => setError('Connection to server lost');

        sse.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            handleSSEMessage(msg);
        };
    }

    function handleSSEMessage(msg: { type: string; peerId?: string; peerCount?: number; payload?: Peer.SignalData }) {
        if (msg.type === 'connected') {
            peerId = msg.peerId ?? null;
        }
        if (msg.type === 'peer-joined' && (msg.peerCount ?? 0) === 2 && !peer) {
            // I was first to connect — I initiate the offer
            status = 'connecting';
            createPeer(true);
        } else if (msg.type === 'connected' && (msg.peerCount ?? 0) === 2 && !peer) {
            // I joined second — wait for the initiator's offer
            status = 'connecting';
            createPeer(false);
        } else if (msg.type === 'signal' && msg.payload) {
            peer?.signal(msg.payload);
        }
    }

    async function startAsInitiator(): Promise<string> {
        status = 'creating-session';
        errorMessage = null;

        const res = await fetch('/api/sync/session', { method: 'POST' });
        const { token: t } = await res.json();

        status = 'waiting-for-peer';
        openSSE(t);
        return t;
    }

    function joinAsResponder(t: string) {
        status = 'connecting';
        errorMessage = null;
        openSSE(t);
    }

    function reset() {
        cleanup();
        status = 'idle';
        errorMessage = null;
        token = null;
        peerId = null;
        gatheredCandidateTypes.clear();
    }

    return {
        get status() { return status; },
        get errorMessage() { return errorMessage; },
        startAsInitiator,
        joinAsResponder,
        reset,
        setOnChannelOpen(cb: (peer: Peer.Instance) => void) {
            onChannelOpen = cb;
        }
    };
}

export const webrtcManager = createWebRTCManager();
