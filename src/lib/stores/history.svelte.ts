import type { SentenceAnalysis } from '../types';

export interface HistoryItem {
    id: string;
    timestamp: number;
    sentence: string;
    context: string;
    data: SentenceAnalysis;
}

const STORAGE_KEY = 'sakanadesuyo_history';

class HistoryStore {
    items = $state<HistoryItem[]>([]);

    constructor() {
        // Initialize is handled via init() to avoid SSR issues if called too early,
        // though usually stores are fine. Explicit init is safer for browser-only LS access.
    }

    init() {
        if (typeof localStorage !== 'undefined') {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    this.items = JSON.parse(stored);
                }
            } catch (e) {
                console.error('Failed to load history:', e);
            }
        }
    }

    save() {
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
            } catch (e) {
                console.error('Failed to save history:', e);
            }
        }
    }

    add(sentence: string, context: string, data: SentenceAnalysis) {
        const newItem: HistoryItem = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            sentence,
            context,
            data
        };
        // Add to beginning of list
        this.items = [newItem, ...this.items];
        this.save();
    }

    remove(id: string) {
        this.items = this.items.filter((item) => item.id !== id);
        this.save();
    }

    clear() {
        this.items = [];
        this.save();
    }
}

export const history = new HistoryStore();
