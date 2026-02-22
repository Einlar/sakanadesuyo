import { test } from '@playwright/test';
import { KaraokePage } from '../pages/KaraokePage';
import { SongPage } from '../pages/SongPage';

test.describe('Karaoke', () => {
    test.beforeEach(async ({ page }) => {
        // Clear IndexedDB or setup if needed
    });

    test('add song and navigate to details', async ({ page }) => {
        const karaokePage = new KaraokePage(page);
        const songPage = new SongPage(page);

        await karaokePage.goto();

        // 1. Open Add Song Dialog
        await page.waitForTimeout(1000); // Wait for hydration if needed, though page object click might handle it
        await karaokePage.openAddSongDialog();

        // 2. Mock the external search API
        // We only mock this to avoid external dependencies and keep the test fast/deterministic.
        // The local furigana API will be tested for real.
        await page.route('/api/karaoke/lyrics*', async (route) => {
            const json = {
                data: {
                    lyrics: '夢ならばどれほどよかったでしょう\n未だにあなたのことを夢にみる',
                    artworkUrl: 'https://example.com/cover.jpg',
                    trackName: 'Lemon',
                    artistName: 'Kenshi Yonezu'
                }
            };
            await route.fulfill({ json });
        });

        await karaokePage.searchForLyrics('Lemon', 'Kenshi Yonezu');

        // 3. Verify preview
        await karaokePage.verifyLyricsPreview(
            '夢ならばどれほどよかったでしょう'
        );

        // 4. Add Song
        await karaokePage.addSong();

        // 5. Verify song in list
        await karaokePage.verifySongInList('Lemon', 'Kenshi Yonezu');

        // 6. Navigate to details
        await karaokePage.openSong('Lemon');

        // 7. Verify URL and content
        await songPage.verifyUrl(/\/karaoke\/lemon-kenshi-yonezu/);
        await songPage.verifyHeader('Lemon', 'Kenshi Yonezu');

        // Wait a bit for furigana processing to start and complete
        await page.waitForTimeout(2000);

        // 8. Check for furigana
        await songPage.verifyFuriganaVisible();

        // 9. Verify persistence on reload
        await page.reload();
        await songPage.verifyFuriganaVisible();
    });
    test('search song via enter key', async ({ page }) => {
        const karaokePage = new KaraokePage(page);

        await karaokePage.goto();
        await page.waitForTimeout(1000); // Wait for hydration
        await karaokePage.openAddSongDialog();

        // Mock the search API
        await page.route('/api/karaoke/lyrics*', async (route) => {
            const json = {
                data: {
                    lyrics: 'Test lyrics',
                    artworkUrl: 'https://example.com/cover.jpg',
                    trackName: 'Test Song',
                    artistName: 'Test Artist'
                }
            };
            await route.fulfill({ json });
        });

        await karaokePage.searchForLyricsViaEnter('Test Song', 'Test Artist');
        await karaokePage.verifyLyricsPreview('Test lyrics');
    });
});
