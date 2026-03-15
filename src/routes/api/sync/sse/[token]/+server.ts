import { getSession, pruneOldSessions, sseEnqueue } from '$lib/server/syncSessions';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    pruneOldSessions();

    const session = getSession(params.token);
    if (!session) error(404, 'Session not found');
    if (session.peers.size >= 2) error(409, 'Session full');

    const peerId = crypto.randomUUID();

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            session.peers.set(peerId, controller);

            // Send peer their assigned ID and current peer count
            sseEnqueue(controller, {
                type: 'connected',
                peerId,
                peerCount: session.peers.size
            });

            // Flush buffered signals meant for this peer
            for (const msg of session.pendingSignals) {
                if (msg.from !== peerId) {
                    sseEnqueue(controller, msg);
                }
            }
            session.pendingSignals = [];

            // Notify all existing peers that a new peer connected
            for (const [existingId, existingController] of session.peers) {
                if (existingId !== peerId) {
                    sseEnqueue(existingController, {
                        type: 'peer-joined',
                        peerCount: session.peers.size
                    });
                }
            }
        },
        cancel() {
            session.peers.delete(peerId);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    });
};
