declare module 'kuroshiro-analyzer-kuromoji' {
    class KuromojiAnalyzer {
        constructor(options?: { dictPath?: string });
        init(): Promise<void>;
    }

    export default KuromojiAnalyzer;
}
