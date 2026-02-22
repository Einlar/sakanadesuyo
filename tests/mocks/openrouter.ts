import { mock } from 'bun:test';
export const analyzeSentence = mock(() =>
    Promise.resolve(new ReadableStream())
);
export const analyzeSongLines = mock(() =>
    Promise.resolve(new ReadableStream())
);
