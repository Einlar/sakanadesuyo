import { test, expect, type Page } from '@playwright/test';

// Seed a notebook doc directly into IndexedDB on the given page
async function seedNotebookDoc(page: Page, doc: { id: string; title: string; content: string }) {
    await page.evaluate(async (doc) => {
        await new Promise<void>((resolve, reject) => {
            const req = indexedDB.open('wakarimasen-notebook', 1);
            req.onupgradeneeded = () => {
                const store = req.result.createObjectStore('documents', { keyPath: 'id' });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            };
            req.onsuccess = () => {
                const db = req.result;
                const now = new Date().toISOString();
                const tx = db.transaction('documents', 'readwrite');
                tx.objectStore('documents').put({ ...doc, createdAt: now, updatedAt: now });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            };
            req.onerror = () => reject(req.error);
        });
    }, doc);
}

// Seed a karaoke song directly into IndexedDB on the given page
async function seedKaraokeSong(page: Page, song: { id: string; title: string; artist: string; lyrics: string }) {
    await page.evaluate(async (song) => {
        await new Promise<void>((resolve, reject) => {
            const req = indexedDB.open('wakarimasen-karaoke', 2);
            req.onupgradeneeded = () => {
                const store = req.result.createObjectStore('songs', { keyPath: 'id' });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            };
            req.onsuccess = () => {
                const db = req.result;
                const now = new Date().toISOString();
                const tx = db.transaction('songs', 'readwrite');
                tx.objectStore('songs').put({
                    ...song,
                    audioBlob: undefined,
                    volume: 1,
                    startOffset: 0,
                    duration: null,
                    createdAt: now,
                    updatedAt: now
                });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            };
            req.onerror = () => reject(req.error);
        });
    }, song);
}

// Read all docs from IndexedDB on the given page
function readNotebookDocs(page: Page) {
    return page.evaluate(async () => {
        return new Promise<{ id: string; title: string }[]>((resolve, reject) => {
            const req = indexedDB.open('wakarimasen-notebook', 1);
            req.onsuccess = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('documents')) return resolve([]);
                const tx = db.transaction('documents', 'readonly');
                const all = tx.objectStore('documents').getAll();
                all.onsuccess = () => resolve(all.result as { id: string; title: string }[]);
                all.onerror = () => reject(all.error);
            };
            req.onerror = () => reject(req.error);
        });
    });
}

// Read all songs from IndexedDB on the given page
function readKaraokeSongs(page: Page) {
    return page.evaluate(async () => {
        return new Promise<{ id: string; title: string }[]>((resolve, reject) => {
            const req = indexedDB.open('wakarimasen-karaoke', 2);
            req.onsuccess = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('songs')) return resolve([]);
                const tx = db.transaction('songs', 'readonly');
                const all = tx.objectStore('songs').getAll();
                all.onsuccess = () => resolve(all.result as { id: string; title: string }[]);
                all.onerror = () => reject(all.error);
            };
            req.onerror = () => reject(req.error);
        });
    });
}

test('sync transfers notebook docs and karaoke songs between two devices', async ({ browser }) => {
    test.setTimeout(60_000);
    // Two separate browser contexts simulate two devices
    const initiatorCtx = await browser.newContext();
    const joinerCtx = await browser.newContext();

    const initiator = await initiatorCtx.newPage();
    const joiner = await joinerCtx.newPage();

    // ------------------------------------------------------------------
    // Seed data into initiator's IndexedDB before navigating to the app
    // ------------------------------------------------------------------
    await initiator.goto('/sync'); // triggers IDB init
    await initiator.waitForLoadState('domcontentloaded');

    await seedNotebookDoc(initiator, {
        id: 'doc-test-1',
        title: 'Test Note',
        content: '# Hello\nThis is a test note.'
    });
    await seedNotebookDoc(initiator, {
        id: 'doc-test-2',
        title: 'Another Note',
        content: 'Some content here.'
    });
    await seedKaraokeSong(initiator, {
        id: 'song-test-1',
        title: 'Test Song',
        artist: 'Test Artist',
        lyrics: '[00:00.00] Hello world\n[00:02.00] Goodbye world'
    });

    // ------------------------------------------------------------------
    // Start a sync session on the initiator
    // ------------------------------------------------------------------
    await initiator.reload();
    await initiator.waitForSelector('button:has-text("Start Sync Session")');
    await initiator.click('button:has-text("Start Sync Session")');

    const pairUrlInput = initiator.locator('input[type="text"]');
    await expect(pairUrlInput).toBeVisible({ timeout: 10_000 });
    const pairUrl = await pairUrlInput.inputValue();
    expect(pairUrl).toContain('/sync?token=');

    // ------------------------------------------------------------------
    // Joiner navigates to the pair URL
    // ------------------------------------------------------------------
    await joiner.goto(pairUrl);
    await joiner.waitForLoadState('domcontentloaded');

    // ------------------------------------------------------------------
    // Both sides should reach "Sync complete"
    // ------------------------------------------------------------------
    await expect(initiator.getByText('Sync complete')).toBeVisible({ timeout: 30_000 });
    await expect(joiner.getByText('Sync complete')).toBeVisible({ timeout: 30_000 });

    // ------------------------------------------------------------------
    // Verify synced counts shown in UI.
    // syncResult counts what each side *received*: initiator sent everything
    // and received nothing (joiner was empty), so its count is 0.
    // ------------------------------------------------------------------
    await expect(initiator.locator('p').filter({ hasText: 'transferred' })).toContainText('0 notes');
    await expect(joiner.locator('p').filter({ hasText: 'transferred' })).toContainText('2 notes');
    await expect(joiner.locator('p').filter({ hasText: 'transferred' })).toContainText('1 song');

    // ------------------------------------------------------------------
    // Verify data landed in joiner's IndexedDB
    // ------------------------------------------------------------------
    const joinerDocs = await readNotebookDocs(joiner);
    expect(joinerDocs.map((d) => d.id)).toEqual(expect.arrayContaining(['doc-test-1', 'doc-test-2']));
    expect(joinerDocs.find((d) => d.id === 'doc-test-1')?.title).toBe('Test Note');

    const joinerSongs = await readKaraokeSongs(joiner);
    expect(joinerSongs.map((s) => s.id)).toContain('song-test-1');
    expect(joinerSongs.find((s) => s.id === 'song-test-1')?.title).toBe('Test Song');

    await initiatorCtx.close();
    await joinerCtx.close();
});
