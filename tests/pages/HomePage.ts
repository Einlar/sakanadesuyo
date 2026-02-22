import { type Locator, type Page, expect } from '@playwright/test';

export class HomePage {
    readonly page: Page;
    readonly input: Locator;
    readonly analyzeButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.input = page.getByPlaceholder('日本語の文を入力してください...');
        this.analyzeButton = page.getByRole('button', { name: /Analyze/ });
    }

    async goto() {
        await this.page.goto('/');
    }

    async enterSentence(text: string) {
        await this.input.fill(text);
    }

    async analyze() {
        await this.analyzeButton.click();
    }

    async waitForAnalysisCompletion() {
        // With mocked responses, "Analyzing..." may appear and disappear too quickly.
        // Wait for either state, then ensure we end up at the ready "Analyze" button.
        const analyzingButton = this.page.getByRole('button', {
            name: 'Analyzing...'
        });
        const readyButton = this.page.getByRole('button', {
            name: 'Analyze',
            exact: true
        });

        // Wait briefly for either state to appear (analyzing or already done)
        await expect(analyzingButton.or(readyButton)).toBeVisible();

        // Then ensure analysis completes by waiting for the ready button
        await expect(readyButton).toBeVisible({ timeout: 30000 });
    }

    getSentenceSegment(text: string) {
        // Locating the span in the SentenceDisplay area.
        // We assume it's a span with the text, likely inside the display section.
        return this.page
            .locator('main > section span')
            .filter({ hasText: text })
            .first();
    }

    getTermCard(kanji: string) {
        // Locating the article that contains the kanji in the AnalysisGrid area.
        // The AnalysisGrid is in the second section or distinct from the display.
        // We look for an article that has the kanji as a heading or main text.
        return this.page.locator('article').filter({ hasText: kanji }).first();
    }

    // History Sidebar
    async openHistory() {
        const openButton = this.page.getByRole('button', {
            name: 'Open history'
        });
        if (await openButton.isVisible()) {
            await openButton.click();
            // Wait for the sidebar to open and the close button to appear
            await expect(
                this.page.getByRole('button', { name: 'Close history' })
            ).toBeVisible();
        }
    }

    async closeHistory() {
        const closeButton = this.page.getByRole('button', {
            name: 'Close history'
        });
        if (await closeButton.isVisible()) {
            await closeButton.click();
            // Wait for the sidebar to close and the open button to appear
            await expect(
                this.page.getByRole('button', { name: 'Open history' })
            ).toBeVisible();
        }
    }

    async getHistoryItems() {
        return this.page.locator('[data-testid="history-item"] > p');
    }

    async clickHistoryItem(text: string) {
        await this.page
            .locator('[data-testid="history-item"]', { hasText: text })
            .click();
    }

    async deleteHistoryItem(index: number) {
        const item = this.page
            .locator('[data-testid="history-item"]')
            .nth(index);
        await item.hover(); // Make delete button visible
        await item.locator('button[title="Delete"]').click();
    }

    async clearHistory() {
        // Handle confirm dialog
        this.page.once('dialog', (dialog) => dialog.accept());
        await this.page
            .getByRole('button', { name: 'Clear All History' })
            .click();
    }
}
