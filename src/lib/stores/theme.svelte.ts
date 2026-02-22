import { PersistentState } from '$lib/utils/storage.svelte';

type Theme = 'light' | 'dark';

function createThemeStore() {
    // Default to 'dark' as requested
    const state = new PersistentState<Theme>('theme', 'dark');

    return {
        get current() {
            return state.current;
        },
        set current(value: Theme) {
            state.current = value;
        },
        toggle() {
            state.current = state.current === 'dark' ? 'light' : 'dark';
        }
    };
}

export const theme = createThemeStore();
