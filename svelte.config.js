import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: adapter(),
        csp: {
            mode: 'auto',
            directives: {
                'default-src': ['self'],
                'script-src': ['self'],
                // unsafe-inline needed for Tailwind/Svelte scoped styles; Google Fonts injects its own stylesheet
                'style-src': [
                    'self',
                    'unsafe-inline',
                    'https://fonts.googleapis.com'
                ],
                // Actual font files are served from gstatic
                'font-src': ['self', 'https://fonts.gstatic.com'],
                // data: for OCR (ImageNode fetches images as data URLs); mxmcdn.net for Musixmatch album covers
                // blob: needed for cover art preview (object URL of a not-yet-uploaded file)
                'img-src': ['self', 'data:', 'blob:', 'https://s.mxmcdn.net'],
                // blob: needed for karaoke audio playback (Audio element src is an object URL)
                'media-src': ['self', 'blob:'],
                // All client fetches/SSE/WebRTC signaling are same-origin
                'connect-src': ['self'],
                'form-action': ['self'],
                'base-uri': ['self']
            }
        }
    }
};

export default config;
