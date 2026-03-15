const SESSION_TTL_MS = 10 * 60 * 1000;

export interface SignalMessage {
    from: string;
    type: string;
    payload: unknown;
}

interface SyncSession {
    token: string;
    createdAt: number;
    peers: Map<string, ReadableStreamDefaultController<Uint8Array>>;
    pendingSignals: SignalMessage[];
}

const sessions = new Map<string, SyncSession>();

export function pruneOldSessions() {
    const now = Date.now();
    for (const [token, session] of sessions) {
        if (now - session.createdAt > SESSION_TTL_MS) {
            sessions.delete(token);
        }
    }
}

export function createSession(): string {
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    sessions.set(token, {
        token,
        createdAt: Date.now(),
        peers: new Map(),
        pendingSignals: []
    });
    return token;
}

export function getSession(token: string): SyncSession | undefined {
    return sessions.get(token);
}

export function sseEnqueue(
    controller: ReadableStreamDefaultController<Uint8Array>,
    data: unknown
) {
    const chunk = `data: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(chunk));
}
