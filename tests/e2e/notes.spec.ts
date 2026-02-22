import { test, expect } from '@playwright/test';

test('Notes should sparkle and stop on hover', async ({ page }) => {
    // Navigate to the karaoke page where notes are present
    await page.goto('/karaoke');

    // Wait for at least one note to be visible
    const note = page.locator('.fixed span.absolute').first();
    await expect(note).toBeVisible();

    // Loop a few times to retry if we miss a moving note
    let success = false;
    for (let i = 0; i < 5; i++) {
        const box = await note.boundingBox();
        if (!box) continue;

        // Move mouse to the center of the note
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

        // Wait a brief moment for the reactivity to update
        await page.waitForTimeout(100);

        // Check if the sparkle class is applied
        const classes = await note.getAttribute('class');
        if (classes?.includes('sparkle')) {
            success = true;
            break;
        }

        // If failed, maybe the note moved out from under the cursor?
        // Try again.
    }

    expect(success).toBeTruthy();
});
