import { getSession, sseEnqueue } from '$lib/server/syncSessions';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();
    const { token, from, type, payload } = body;

    const session = getSession(token);
    if (!session) error(404, 'Session not found');

    const msg = { from, type, payload };
    let delivered = false;

    for (const [peerId, controller] of session.peers) {
        if (peerId !== from) {
            sseEnqueue(controller, msg);
            delivered = true;
        }
    }

    if (!delivered) {
        session.pendingSignals.push(msg);
    }

    return new Response(null, { status: 204 });
};
