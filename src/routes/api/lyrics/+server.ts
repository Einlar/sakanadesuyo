import { json, type RequestHandler } from '@sveltejs/kit';

const LRCLIB_BASE_URL = 'https://lrclib.net/api';

export interface LrclibTrack {
    id: number;
    name: string;
    trackName: string;
    artistName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    plainLyrics: string | null;
    syncedLyrics: string | null;
}

/**
 * GET /api/lyrics?track_name=X&artist_name=Y
 *
 * Fetches lyrics from LRCLIB API.
 */
export const GET: RequestHandler = async ({ url }) => {
    const trackName = url.searchParams.get('track_name');
    const artistName = url.searchParams.get('artist_name');

    if (!trackName || !artistName) {
        return json(
            { error: 'Missing track_name or artist_name parameter' },
            { status: 400 }
        );
    }

    try {
        const lrclibUrl = new URL(`${LRCLIB_BASE_URL}/get`);
        lrclibUrl.searchParams.set('track_name', trackName);
        lrclibUrl.searchParams.set('artist_name', artistName);

        const response = await fetch(lrclibUrl.toString(), {
            headers: {
                'User-Agent':
                    'sakanadesuyo/1.0 (https://github.com/einlar/sakanadesuyo)'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return json({ error: 'Lyrics not found' }, { status: 404 });
            }
            return json(
                { error: `LRCLIB API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data: LrclibTrack = await response.json();

        return json({
            id: data.id,
            trackName: data.trackName,
            artistName: data.artistName,
            albumName: data.albumName,
            duration: data.duration,
            instrumental: data.instrumental,
            plainLyrics: data.plainLyrics,
            syncedLyrics: data.syncedLyrics
        });
    } catch (error) {
        console.error('LRCLIB fetch error:', error);
        return json({ error: 'Failed to fetch lyrics' }, { status: 500 });
    }
};
