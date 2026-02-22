import { mock } from "bun:test";
export const limiter = {
    isLimited: mock(() => Promise.resolve(false))
};
