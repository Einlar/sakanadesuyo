<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/state';
    import { replaceState } from '$app/navigation';
    import { syncManager } from '$lib/sync/syncManager.svelte';
    import QRDisplay from '$lib/components/sync/QRDisplay.svelte';
    import SyncProgress from '$lib/components/sync/SyncProgress.svelte';
    import LoaderIcon from '$lib/components/icons/LoaderIcon.svelte';
    import SyncIcon from '$lib/components/icons/SyncIcon.svelte';

    onMount(() => {
        const token = page.url.searchParams.get('token');
        const role = page.url.searchParams.get('role');
        if (token && role === 'join') {
            void syncManager.joinAsResponder(token);
            try { replaceState('/sync', {}); } catch { /* router not ready */ }
        }
    });
</script>

<svelte:head>
    <title>Sync | sakanadesuyo</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
    <div
        class="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-lg"
    >
        <!-- Header -->
        <div class="mb-6 flex items-center gap-3">
            <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10"
            >
                <SyncIcon class="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <div>
                <h1 class="text-lg font-semibold text-[var(--color-text)]">Sync Data</h1>
                <p class="text-sm text-[var(--color-text-muted)]">Transfer between devices</p>
            </div>
        </div>

        <!-- State: idle -->
        {#if syncManager.status === 'idle'}
            <p class="mb-4 text-sm text-[var(--color-text-muted)]">
                Sync your notes and songs to another device. No data is stored on the server.
            </p>
            <p class="mb-6 text-xs text-[var(--color-text-muted)] opacity-60">
                This feature is experimental and may not work reliably in all environments.
            </p>
            <div class="flex flex-col gap-3">
                <button
                    onclick={() => syncManager.startAsInitiator()}
                    class="w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 active:scale-95 dark:text-[var(--color-bg)]"
                >
                    Start Sync Session
                </button>
            </div>

        <!-- State: creating-session -->
        {:else if syncManager.status === 'creating-session'}
            <div class="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                <LoaderIcon class="h-4 w-4 animate-spin" />
                <span>Creating session…</span>
            </div>

        <!-- State: waiting-for-peer -->
        {:else if syncManager.status === 'waiting-for-peer'}
            <p class="mb-4 text-sm text-[var(--color-text-muted)]">
                Scan this QR code on your other device, or share the link:
            </p>
            {#if syncManager.qrSvg && syncManager.pairUrl}
                <QRDisplay qrSvg={syncManager.qrSvg} pairUrl={syncManager.pairUrl} />
            {/if}
            <div class="mt-5 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <LoaderIcon class="h-4 w-4 animate-spin" />
                <span>Waiting for other device…</span>
            </div>
            <button
                onclick={() => syncManager.reset()}
                class="mt-4 w-full rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
                Cancel
            </button>

        <!-- State: connecting -->
        {:else if syncManager.status === 'connecting'}
            <div class="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                <LoaderIcon class="h-4 w-4 animate-spin" />
                <span>Establishing connection…</span>
            </div>

        <!-- State: syncing -->
        {:else if syncManager.status === 'syncing'}
            <p class="mb-4 text-sm font-medium text-[var(--color-text)]">Syncing…</p>
            <SyncProgress sent={syncManager.progress.sent} received={syncManager.progress.received} />

        <!-- State: done -->
        {:else if syncManager.status === 'done'}
            <div class="flex flex-col items-center gap-4 text-center">
                <div
                    class="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500"
                >
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <p class="text-base font-semibold text-[var(--color-text)]">Sync complete</p>
                {#if syncManager.syncResult}
                    <p class="text-sm text-[var(--color-text-muted)]">
                        {syncManager.syncResult.docs} note{syncManager.syncResult.docs !== 1 ? 's' : ''},
                        {syncManager.syncResult.songs} song{syncManager.syncResult.songs !== 1 ? 's' : ''} transferred
                    </p>
                {/if}
                <div class="flex w-full gap-2">
                    <a
                        href="/notebook"
                        class="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-2 text-center text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)]"
                    >
                        Notebook
                    </a>
                    <a
                        href="/karaoke"
                        class="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-2 text-center text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)]"
                    >
                        Karaoke
                    </a>
                </div>
                <button
                    onclick={() => syncManager.reset()}
                    class="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                >
                    Sync Again
                </button>
            </div>

        <!-- State: error -->
        {:else if syncManager.status === 'error'}
            <div class="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {syncManager.errorMessage ?? 'An unknown error occurred'}
            </div>
            <button
                onclick={() => syncManager.reset()}
                class="w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
            >
                Try Again
            </button>
        {/if}
    </div>
</div>
