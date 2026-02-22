import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration: number;
}

export const toasts = writable<Toast[]>([]);

export const addToast = (
    message: string,
    type: ToastType = 'info',
    duration = 3000
) => {
    const id = crypto.randomUUID();
    const toast: Toast = { id, message, type, duration };

    toasts.update((all) => [...all, toast]);

    if (duration > 0) {
        setTimeout(() => {
            removeToast(id);
        }, duration);
    }
};

export const removeToast = (id: string) => {
    toasts.update((all) => all.filter((t) => t.id !== id));
};
