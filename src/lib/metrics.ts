import { Histogram } from 'prom-client';

// Define custom metrics for analysis
export const analyzeSentenceLength = new Histogram({
    name: 'analyze_sentence_length',
    help: 'Length of the analyzed sentence in characters',
    buckets: [10, 50, 100, 200, 300, 500]
});

export const analyzeItemsCount = new Histogram({
    name: 'analyze_items_count',
    help: 'Number of items generated from analysis',
    buckets: [5, 10, 20, 30, 50]
});
