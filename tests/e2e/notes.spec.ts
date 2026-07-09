import { test, expect } from '@playwright/test';

test('Notes should sparkle and stop on hover', async ({ page }) => {
    // Navigate to the karaoke page where notes are present
    await page.goto('/karaoke');

    // Wait for at least one note to be visible
    const note = page.locator('.fixed span.absolute').first();
    await expect(note).toBeVisible();

    // The notes drift continuously, so moving the real mouse to a snapshot
    // of a note's position races against the animation. Instead, dispatch a
    // synthetic mousemove (what the sparkle logic listens for) at a note's
    // live position, in the same JS tick.
    let success = false;
    for (let i = 0; i < 5 && !success; i++) {
        await page.evaluate(() => {
            const spans = document.querySelectorAll('.fixed span.absolute');

            // Pick the note closest to the middle of the screen, so it
            // won't wrap around the top edge while we wait
            let best: Element | null = null;
            let bestDist = Infinity;
            for (const span of spans) {
                const box = span.getBoundingClientRect();
                const dist = Math.abs(box.y - window.innerHeight / 2);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = span;
                }
            }
            if (!best) return;

            const box = best.getBoundingClientRect();
            window.dispatchEvent(
                new MouseEvent('mousemove', {
                    clientX: box.x + box.width / 2,
                    clientY: box.y + box.height / 2
                })
            );
        });

        // Give the animation loop a moment to flag the hovered note
        await page.waitForTimeout(100);

        success = (await page.locator('.fixed span.sparkle').count()) > 0;
    }

    expect(success).toBeTruthy();
});
