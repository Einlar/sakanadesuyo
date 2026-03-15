import { DEFAULT_ANALYSIS_MODEL } from '$lib/constants';
import modelsData from '$lib/data/models.json';
import { PersistentState } from '$lib/utils/storage.svelte';

export interface ModelInfo {
    id: string;
    name: string;
    inputCostPerMillion: number;
    outputCostPerMillion: number;
}

export const AVAILABLE_MODELS: ModelInfo[] = modelsData;

// Average tokens for sentence analysis: ~1000 input, ~1500 output
const AVG_INPUT_TOKENS = 1000;
const AVG_OUTPUT_TOKENS = 1500;

function createSettingsStore() {
    const modelState = new PersistentState<string>(
        'analysis_model',
        DEFAULT_ANALYSIS_MODEL
    );

    const showFuriganaState = new PersistentState<boolean>(
        'show_furigana',
        true
    );

    const dictionaryProviderState = new PersistentState<'jisho' | 'jpdb'>(
        'dictionary_provider',
        'jisho'
    );

    return {
        get model() {
            return modelState.current;
        },
        set model(value: string) {
            modelState.current = value;
        },
        get showFurigana() {
            return showFuriganaState.current;
        },
        set showFurigana(value: boolean) {
            showFuriganaState.current = value;
        },
        get dictionaryProvider() {
            return dictionaryProviderState.current;
        },
        set dictionaryProvider(value: 'jisho' | 'jpdb') {
            dictionaryProviderState.current = value;
        },
        /** Toggles the furigana visibility setting. */
        toggleFurigana() {
            showFuriganaState.current = !showFuriganaState.current;
        },
        getModelInfo(id: string): ModelInfo | undefined {
            return AVAILABLE_MODELS.find((m) => m.id === id);
        },
        /**
         * Calculate estimated cost for a sentence analysis
         * Based on ~1000 input tokens and ~1500 output tokens
         */
        estimateCost(modelId: string): number {
            const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
            if (!model) return 0;
            const inputCost =
                (AVG_INPUT_TOKENS / 1_000_000) * model.inputCostPerMillion;
            const outputCost =
                (AVG_OUTPUT_TOKENS / 1_000_000) * model.outputCostPerMillion;
            return inputCost + outputCost;
        },
        /**
         * Format cost as a string (e.g., "$0.023")
         */
        formatCost(cost: number): string {
            if (cost < 0.001) {
                return `$${cost.toFixed(5)}`;
            }
            return `$${cost.toFixed(4)}`;
        }
    };
}

export const settings = createSettingsStore();
