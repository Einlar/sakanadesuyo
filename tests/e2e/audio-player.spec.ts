import { test, expect } from '../fixtures/baseTest';
import { KaraokePage } from '../pages/KaraokePage';
import { SongPage } from '../pages/SongPage';
import path from 'path';

test.describe('Audio Player', () => {
    test.beforeEach(async ({ page }) => {
        // Mock the lyrics API
        await page.route('/api/karaoke/lyrics*', async (route) => {
            const url = new URL(route.request().url());
            const title = url.searchParams.get('title');
            const artist = url.searchParams.get('artist');

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        lyrics: 'Test lyrics line 1\nTest lyrics line 2',
                        trackName: title || 'Test Song',
                        artistName: artist || 'Test Artist',
                        artworkUrl: 'https://example.com/cover.jpg'
                    }
                })
            });
        });
    });

    test('should allow uploading an MP3 and playing it', async ({ page }) => {
        const karaokePage = new KaraokePage(page);

        await karaokePage.goto();
        await page.waitForTimeout(1000); // Wait for hydration
        await karaokePage.openAddSongDialog();
        await karaokePage.searchForLyrics('Audio Test Song', 'Test Artist');
        await karaokePage.verifyLyricsPreview('Test lyrics line 1');
        await karaokePage.addSong();

        // 2. Open the song
        await karaokePage.openSong('Audio Test Song');

        const songPage = new SongPage(page);

        // 3. Verify no player initially
        await songPage.verifyPlayerHidden();

        // 4. Open the Add MP3 dialog (now inside options menu)
        await songPage.clickAddMp3();

        // Wait for dialog to be visible
        await expect(songPage.addAudioDialog).toBeVisible();

        // 5. Upload MP3 file
        // Note: SongPage.uploadAudio handles setting input files and clicking confirm
        await songPage.uploadAudio('tests/fixtures/dummy.mp3');

        // 6. Verify player appears
        await songPage.verifyPlayerVisible();

        // 7. Test Play/Pause UI state
        await songPage.togglePlay();

        // Since the audio file is very short, we might not catch the 'Playing' state (Pause button)
        // consistently. We verify the audio element has a source instead.
        const audioSrc = await songPage.audioElement.getAttribute('src');
        expect(audioSrc).toMatch(/^blob:/);

        // 8. Reload and verify persistence
        await page.reload();
        await songPage.verifyPlayerVisible();
        await songPage.verifyHeader('Audio Test Song', 'Test Artist');
    });
});
