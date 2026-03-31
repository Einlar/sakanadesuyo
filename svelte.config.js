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
                'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
                // Actual font files are served from gstatic
                'font-src': ['self', 'https://fonts.gstatic.com'],
                // data: needed for OCR (ImageNode fetches images as data URLs)
                // data: for OCR; mxmcdn.net for Musixmatch album covers
                'img-src': ['self', 'data:', 'https://s.mxmcdn.net'],
                // All client fetches/SSE/WebRTC signaling are same-origin
                'connect-src': ['self'],
                'form-action': ['self'],
                'base-uri': ['self']
            }
        }
    }
};

export default config;
