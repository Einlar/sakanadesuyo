import { type Locator, type Page, expect } from '@playwright/test';

export class KaraokePage {
    readonly page: Page;
    readonly addSongButton: Locator;
    readonly addSongDialog: Locator;
    readonly songTitleInput: Locator;
    readonly artistInput: Locator;
    readonly searchButton: Locator;
    readonly addSongConfirmButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.addSongButton = page.getByTestId('add-song-btn-header');
        this.addSongDialog = page.getByTestId('add-song-dialog');
        this.songTitleInput = page.getByLabel('Song Title');
        this.artistInput = page.getByLabel('Artist');
        this.searchButton = page.getByRole('button', { name: 'Search Lyrics' });
        this.addSongConfirmButton = page.getByRole('button', {
            name: '✓ Add Song'
        });
    }

    async goto() {
        await this.page.goto('/karaoke');
    }

    async openAddSongDialog() {
        await this.addSongButton.click({ force: true });
        await expect(this.addSongDialog).toBeVisible();
        await expect(this.addSongDialog).toHaveAttribute('open');
    }

    async searchForLyrics(title: string, artist: string) {
        await this.songTitleInput.fill(title);
        await this.artistInput.fill(artist);
        await this.searchButton.click();
    }

    async searchForLyricsViaEnter(title: string, artist: string) {
        await this.songTitleInput.fill(title);
        await this.artistInput.fill(artist);
        await this.artistInput.press('Enter');
    }

    async verifyLyricsPreview(text: string) {
        await expect(this.page.locator('#lyrics-editor')).toHaveValue(
            new RegExp(text)
        );
    }

    async addSong() {
        await this.addSongConfirmButton.click();
        await expect(this.addSongDialog).toBeHidden();
    }

    async verifySongInList(title: string, artist: string) {
        // Wait for any dialogs to be fully hidden first to avoid ambiguity
        await expect(this.addSongDialog).toBeHidden();

        const card = this.page.locator(`button:has(h3:has-text("${title}"))`);
        await expect(card).toBeVisible();
        await expect(card).toContainText(artist);
    }

    async openSong(title: string) {
        // Ensure dialog is closed
        await expect(this.addSongDialog).toBeHidden();

        // Click the card containing the title
        await this.page.locator(`button:has(h3:has-text("${title}"))`).click();
    }
}
