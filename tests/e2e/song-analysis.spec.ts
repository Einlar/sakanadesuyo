import { test, expect } from '@playwright/test';
import { KaraokePage } from '../pages/KaraokePage';
import { SongPage } from '../pages/SongPage';

test.describe('Song Analysis', () => {
    test('analyze song and interact with cards', async ({ page }) => {
        const karaokePage = new KaraokePage(page);
        const songPage = new SongPage(page);

        await karaokePage.goto();

        // Wait for page to be ready
        await page.waitForTimeout(1000);

        // Open Add Song Dialog
        await karaokePage.openAddSongDialog();

        // Mock the search API with a simple short song (2 lines for quick testing)
        await page.route('/api/karaoke/lyrics*', async (route) => {
            const json = {
                data: {
                    lyrics: 'おはよう\nこんにちは',
                    artworkUrl: 'https://example.com/cover.jpg',
                    trackName: 'Test Song',
                    artistName: 'Test Artist'
                }
            };
            await route.fulfill({ json });
        });

        await karaokePage.searchForLyrics('Test Song', 'Test Artist');
        await karaokePage.verifyLyricsPreview('おはよう');
        await karaokePage.addSong();
        await karaokePage.verifySongInList('Test Song', 'Test Artist');

        // Navigate to the song page
        await karaokePage.openSong('Test Song');
        await songPage.verifyUrl(/\/karaoke\/test-song-test-artist/);

        // Verify Analyze button exists (this confirms page loaded correctly)
        await songPage.verifyAnalyzeButtonVisible(10000);

        // Start analysis
        await songPage.startAnalysis();

        // Verify panel appears
        await songPage.verifyAnalysisPanelVisible();

        // Wait for analysis cards to appear (may take some time with real API)
        // Using a longer timeout for the real LLM API call
        await songPage.waitForAnalysisCards(120000);

        // Verify we have some cards
        const cardCount = await songPage.getAnalysisCardCount();
        expect(cardCount).toBeGreaterThan(0);

        // Test hover interaction - hover over a term in lyrics
        // The lyrics should have clickable terms after analysis
        const termCount = await songPage.getClickableTermsCount();
        expect(termCount).toBeGreaterThan(0);

        // Hover on first term
        await songPage.hoverFirstTerm();

        // Verify a card gets highlighted
        await songPage.verifyCardHighlighted();

        // Test panel collapse/expand
        // Use the toggle button in the header (TopNav)
        await songPage.collapsePanel();

        await songPage.verifyPanelCollapsed();

        await songPage.expandPanel();

        await songPage.verifyPanelExpanded();

        // Wait for analysis to complete and save to store
        await songPage.waitForAnalysisCompletion();

        // Reload page and verify analysis persists
        await page.reload();

        // Wait for page to load and analysis to be restored (store needs to initialize)
        // await songPage.verifyAnalyzeButtonVisible(10000);

        // Wait for analysis panel to appear (needs store init + effect to run)
        await songPage.verifyAnalysisPanelVisible(10000);

        const cardCountAfterReload = await songPage.getAnalysisCardCount();
        // After reload, we should have at least the same number of cards
        // (could be more if analysis completed in the background)
        expect(cardCountAfterReload).toBeGreaterThanOrEqual(cardCount);
    });
});
