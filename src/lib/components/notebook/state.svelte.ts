import { PersistentState } from '$lib/utils/storage.svelte';

export const settings = new PersistentState(
    'sakana-settings',
    {
        jpFontSize: 1.2
    },
    'localStorage'
);
