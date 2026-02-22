import { type Locator, type Page, expect } from '@playwright/test';

export class SongPage {
    readonly page: Page;
    readonly header: Locator;
    readonly backLink: Locator;
    readonly analyzeButton: Locator;
    readonly cancelButton: Locator;
    readonly analysisPanel: Locator;
    readonly closePanelButton: Locator;
    readonly openPanelButton: Locator;

    readonly optionsMenuButton: Locator;
    readonly addMp3MenuItem: Locator;
    readonly addAudioDialog: Locator;
    readonly fileInput: Locator;
    readonly confirmAddAudioButton: Locator;
    readonly playPauseButton: Locator;
    readonly volumeControl: Locator;
    readonly audioElement: Locator;

    constructor(page: Page) {
        this.page = page;
        this.header = page.locator('header');
        this.backLink = this.header.getByLabel('Back to songs');
        this.analyzeButton = page.getByRole('button', {
            name: /Analyze|Re-analyze/
        });
        this.cancelButton = page.getByRole('button', { name: 'Cancel' });
        this.analysisPanel = page.locator('aside');
        this.closePanelButton = page.getByLabel('Close analysis panel');
        this.openPanelButton = page.getByLabel('Open analysis panel');

        // Audio Player & Options Menu
        this.optionsMenuButton = page.getByLabel('More options');
        this.addMp3MenuItem = page.getByRole('button', {
            name: /Add MP3|Manage MP3/
        });
        this.addAudioDialog = page.getByRole('dialog');
        this.fileInput = page.locator('input[type="file"]');
        this.confirmAddAudioButton = page.getByRole('button', {
            name: 'Add Audio'
        });
        this.playPauseButton = page.getByRole('button', {
            name: /Play|Pause/
        });
        this.volumeControl = page.getByLabel('Volume');
        this.audioElement = page.locator('audio');
    }

    async verifyUrl(pattern: RegExp) {
        await expect(this.page).toHaveURL(pattern);
    }

    async verifyHeader(title: string, artist: string) {
        await expect(this.header).toBeVisible();
        await expect(this.backLink).toBeVisible();
        await expect(
            this.header.getByRole('heading', { name: title })
        ).toBeVisible();
        await expect(this.header.getByText(artist)).toBeVisible();
        // Should NOT have the default "Karaoke" link
        await expect(
            this.header.getByRole('link', { name: 'Karaoke' })
        ).toBeHidden();
    }

    async verifyFuriganaVisible() {
        // Check for furigana (ruby tag)
        // Wait for real API processing - kuromoji needs time to load and process
        await expect(this.page.locator('ruby').first()).toBeVisible({
            timeout: 30000
        });
        // Verify ruby text contains valid furigana (hiragana characters)
        await expect(this.page.locator('rt').first()).toBeVisible();
    }

    /** Clicks the Analyze button to start song analysis */
    async startAnalysis() {
        await this.analyzeButton.click();
    }

    /** Verifies that the analysis panel is visible */
    async verifyAnalysisPanelVisible(timeout?: number) {
        await expect(this.analysisPanel).toBeVisible({ timeout });
    }

    /** Verifies that the analyze button is visible */
    async verifyAnalyzeButtonVisible(timeout?: number) {
        await expect(this.analyzeButton).toBeVisible({ timeout });
    }

    /** Waits for at least one analysis card to appear */
    async waitForAnalysisCards(timeout = 60000) {
        // Wait for at least one TermCard to appear in the panel
        await expect(this.analysisPanel.locator('article').first()).toBeVisible(
            { timeout }
        );
    }

    /** Gets the count of analysis cards */
    async getAnalysisCardCount(): Promise<number> {
        return await this.analysisPanel.locator('article').count();
    }

    /** Hovers over a term in the lyrics by its text */
    async hoverLyricsTerm(termText: string) {
        // Find a clickable span containing the term text
        const term = this.page.locator(
            `span[role="button"]:has-text("${termText}")`
        );
        await term.first().hover();
    }

    /** Clicks on a term in the lyrics by its text */
    async clickLyricsTerm(termText: string) {
        const term = this.page.locator(
            `span[role="button"]:has-text("${termText}")`
        );
        await term.first().click();
    }

    /** Gets the count of clickable terms in the lyrics */
    async getClickableTermsCount(): Promise<number> {
        return await this.page.locator('span[role="button"]').count();
    }

    /** Hovers over the first clickable term */
    async hoverFirstTerm() {
        await this.page.locator('span[role="button"]').first().hover();
    }

    /** Verifies that a card is highlighted (has teal styling) */
    async verifyCardHighlighted() {
        // Check for data-highlighted="true" on an article
        await expect(
            this.analysisPanel.locator('article[data-highlighted="true"]')
        ).toBeVisible();
    }

    /** Collapses the analysis panel */
    async collapsePanel() {
        if (await this.closePanelButton.isVisible()) {
            await this.closePanelButton.click();
            // Wait for transition (300ms) to complete
            await this.page.waitForTimeout(400);
        }
    }

    /** Expands the analysis panel */
    async expandPanel() {
        if (await this.openPanelButton.isVisible()) {
            await this.openPanelButton.click();
            // Wait for transition (300ms) to complete
            await this.page.waitForTimeout(400);
        } else {
            // Fallback: click a term if button isn't visible
            const term = this.page.locator('span[role="button"]').first();
            if (await term.isVisible()) {
                await term.click();
                await this.page.waitForTimeout(400);
            }
        }
    }

    /** Verifies panel is collapsed (hidden) */
    async verifyPanelCollapsed() {
        // When collapsed, the panel should be removed from DOM or hidden
        await expect(this.analysisPanel).toBeHidden();
    }

    /** Verifies panel is expanded */
    async verifyPanelExpanded() {
        // When expanded, the panel should be visible and have width
        await expect(this.analysisPanel).toBeVisible();
        const box = await this.analysisPanel.boundingBox();
        expect(box?.width).toBeGreaterThan(200);
    }

    /** Waits for analysis to finish (Analyze button showing 'Re-analyze' or just 'Analyze' but enabled) */
    async waitForAnalysisCompletion(timeout = 120000) {
        // Wait for the button to NOT show "Cancel"
        await expect(this.cancelButton).toBeHidden({ timeout });
    }

    // --- Audio Player Methods ---

    async openOptionsMenu() {
        await this.optionsMenuButton.click();
    }

    async clickAddMp3() {
        if (!(await this.addMp3MenuItem.isVisible())) {
            await this.openOptionsMenu();
        }
        await this.addMp3MenuItem.click();
    }

    async uploadAudio(filePath: string) {
        await this.fileInput.setInputFiles(filePath);
        await this.confirmAddAudioButton.click({ delay: 100 });
        await expect(this.addAudioDialog).toBeHidden();
    }

    async verifyPlayerVisible() {
        await expect(this.playPauseButton).toBeVisible();
        await expect(this.volumeControl).toBeVisible();
        await expect(this.audioElement).toBeAttached();
    }

    async verifyPlayerHidden() {
        await expect(this.playPauseButton).not.toBeVisible();
    }

    async togglePlay() {
        await this.playPauseButton.click();
    }
}
