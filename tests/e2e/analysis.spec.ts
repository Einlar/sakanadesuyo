import { test, expect } from '../fixtures/baseTest';
import { HomePage } from '../pages/HomePage';

test('analyze japanese sentence and verify interactions', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    const sentence = 'そして次の曲が始まる';
    await home.enterSentence(sentence);
    await home.analyze();

    // Wait for results to appear (term cards)
    const firstTermCard = home.getTermCard('そして');
    await expect(firstTermCard).toBeVisible({ timeout: 30000 }); // Longer timeout for initial analysis

    // 1. Verify hover over sentence word highlights term card
    const sentenceWord = home.getSentenceSegment('そして');
    await sentenceWord.hover();

    // Verify term card gets highlighted
    // Based on code: data-highlighted={isHighlighted}
    await expect(firstTermCard).toHaveAttribute('data-highlighted', 'true');

    // Verify other cards are NOT highlighted
    const nextTermCard = home.getTermCard('次');
    if (await nextTermCard.isVisible()) {
        await expect(nextTermCard).toHaveAttribute('data-highlighted', 'false');
    }

    // Move mouse away
    await page.mouse.move(0, 0);
    await expect(firstTermCard).toHaveAttribute('data-highlighted', 'false');

    // 2. Verify hover over term card highlights sentence word
    await firstTermCard.hover();

    // Verify sentence word gets highlighted
    // Based on code: class:border-teal-500={hoveredIndex === segment.index}
    await expect(sentenceWord).toHaveClass(/border-teal-500/);
    await expect(sentenceWord).toHaveClass(/text-teal-600/);
});
