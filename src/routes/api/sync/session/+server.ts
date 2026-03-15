import { createSession, pruneOldSessions } from '$lib/server/syncSessions';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
    pruneOldSessions();
    const token = createSession();
    return Response.json({ token });
};
