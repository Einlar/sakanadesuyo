import { test as base } from '@playwright/test';
import defaultMockResponse from './analyze_response.json' with { type: 'json' };

export type TestOptions = {
    mockData: typeof defaultMockResponse;
};

export const test = base.extend<TestOptions>({
    mockData: [defaultMockResponse, { option: true }],

    context: async ({ context, mockData }, use) => {
        // Mock the streaming analyze API endpoint
        await context.route('**/api/analyze', async (route) => {
            // Return the analysis data as JSON (jsonriver can parse a complete JSON object)
            await route.fulfill({
                status: 200,
                contentType: 'text/event-stream',
                headers: {
                    'Cache-Control': 'no-cache',
                    Connection: 'keep-alive'
                },
                body: JSON.stringify(mockData.data)
            });
        });
        await use(context);
    }
});

export { expect } from '@playwright/test';
