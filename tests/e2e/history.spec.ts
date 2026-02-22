import { expect, test } from '../fixtures/baseTest';
import { HomePage } from '../pages/HomePage';

const oldSentence = '新しい文';

test.describe('History Feature', () => {
    test.beforeEach(async ({ page, mockData }) => {
        const initialHistory = [
            {
                id: 'existing-id',
                timestamp: Date.now(),
                sentence: oldSentence,
                context: 'Some context',
                data: mockData.data
            }
        ];

        await page.addInitScript((storageCallback) => {
            localStorage.setItem(
                'sakanadesuyo_history',
                JSON.stringify(storageCallback)
            );
        }, initialHistory);
    });

    test('should manage history items correctly', async ({
        page,
        mockData
    }) => {
        const home = new HomePage(page);
        await home.goto();

        // 1. Open history and verify existing item
        await home.openHistory();
        const items = await home.getHistoryItems();
        await expect(items).toHaveCount(1);
        await expect(items.first()).toHaveText(oldSentence);
        await home.closeHistory(); // Close it

        // 2. Make a new request
        const newSentence = mockData.displayedSentence;
        await home.enterSentence(newSentence);
        await home.analyze();
        await home.waitForAnalysisCompletion();

        // Wait for results to appear (term cards)
        const firstTermCard = home.getTermCard('そして');
        await expect(firstTermCard).toBeVisible({ timeout: 30000 }); // Longer timeout for initial analysis

        // Verify history has new item
        await home.openHistory();
        await expect(items).toHaveCount(2);

        // The list order is new to old ([newItem, ...this.items])
        await expect(items.nth(0)).toHaveText(newSentence);
        await expect(items.nth(1)).toHaveText(oldSentence);

        // 3. Switch to old item
        await home.clickHistoryItem(oldSentence);

        // Verify input is updated
        await expect(home.input).toHaveValue(oldSentence);

        // 4. Delete the NEW entry (which is now index 0)
        await home.openHistory();
        await home.deleteHistoryItem(0);
        await expect(items).toHaveCount(1);
        await expect(items.first()).toHaveText(oldSentence);

        // 5. Clear all history
        await home.clearHistory();
        await expect(page.getByText('No history yet')).toBeVisible();
        await expect(items).toHaveCount(0);
    });
});
