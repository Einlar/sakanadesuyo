import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export function load() {
    if (env.PUBLIC_ENABLE_SYNC !== 'true') {
        redirect(307, '/');
    }
}
