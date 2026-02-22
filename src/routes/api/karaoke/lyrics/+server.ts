import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const LRCLIB_BASE_URL = 'https://lrclib.net/api';
const MUSIXMATCH_API_BASE = 'https://lyrics.lewdhutao.my.eu.org';

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
 * Fetches artwork URL from Musixmatch proxy API.
 * Returns undefined if artwork cannot be fetched.
 */
const fetchArtworkUrl = async (
    title: string,
    artist?: string
): Promise<string | undefined> => {
    try {
        const params = new URLSearchParams({ title });
        if (artist) params.set('artist', artist);

        const response = await fetch(
            `${MUSIXMATCH_API_BASE}/v2/musixmatch/lyrics?${params}`,
            {
                headers: { 'User-Agent': 'sakanadesuyo/1.0' }
            }
        );

        if (!response.ok) return undefined;

        const data = await response.json();
        return data?.data?.artworkUrl || undefined;
    } catch {
        return undefined;
    }
};

/**
 * GET /api/karaoke/lyrics?title=X&artist=Y
 *
 * Fetches lyrics from LRCLIB API (synced + plain), and artwork from Musixmatch.
 */
export const GET: RequestHandler = async ({ url }) => {
    const title = url.searchParams.get('title');
    const artist = url.searchParams.get('artist');

    if (!title) {
        throw error(400, 'Title is required');
    }

    try {
        // Fetch LRCLIB and artwork in parallel
        const lrclibUrl = new URL(`${LRCLIB_BASE_URL}/get`);
        lrclibUrl.searchParams.set('track_name', title);
        if (artist) {
            lrclibUrl.searchParams.set('artist_name', artist);
        }

        const [lrclibResponse, artworkUrl] = await Promise.all([
            fetch(lrclibUrl.toString(), {
                headers: {
                    'User-Agent':
                        'sakanadesuyo/1.0 (https://github.com/fmanzali/sakanadesuyo)'
                }
            }),
            fetchArtworkUrl(title, artist || undefined)
        ]);

        if (!lrclibResponse.ok) {
            if (lrclibResponse.status === 404) {
                throw error(404, 'Lyrics not found');
            }
            const text = await lrclibResponse.text();
            console.error('LRCLIB API error:', lrclibResponse.status, text);
            throw error(
                lrclibResponse.status,
                'Failed to fetch lyrics from LRCLIB'
            );
        }

        const data: LrclibTrack = await lrclibResponse.json();

        return json({
            data: {
                lyrics: data.plainLyrics || '',
                syncedLyrics: data.syncedLyrics || null,
                trackName: data.trackName,
                artistName: data.artistName,
                albumName: data.albumName,
                duration: data.duration,
                instrumental: data.instrumental,
                artworkUrl
            }
        });
    } catch (e) {
        console.error('Lyrics proxy error:', e);
        if (e && typeof e === 'object' && 'status' in e) {
            throw e;
        }
        throw error(502, 'Failed to connect to lyrics API');
    }
};
