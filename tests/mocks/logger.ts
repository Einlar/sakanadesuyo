import { mock } from "bun:test";
export const analyzeLogger = {
    info: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
    warn: mock(() => {})
};
export const streamLogger = analyzeLogger;
