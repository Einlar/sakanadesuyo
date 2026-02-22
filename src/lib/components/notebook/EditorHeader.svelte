<script lang="ts">
    import SidebarIcon from '$lib/components/icons/SidebarIcon.svelte';

    interface Props {
        title: string;
        updatedAt: Date;
        saveStatus: 'saved' | 'saving' | 'idle';
        onTitleUpdate: (title: string) => void;
        onToggleSidebar?: () => void;
        showSidebarToggle?: boolean;
    }

    let {
        title,
        updatedAt,
        saveStatus,
        onTitleUpdate,
        onToggleSidebar,
        showSidebarToggle
    }: Props = $props();
</script>

<header class="flex flex-col gap-1 px-8 pt-6 pb-2">
    <div class="flex items-center gap-2">
        {#if showSidebarToggle && onToggleSidebar}
            <button
                class="-ml-2 flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                onclick={onToggleSidebar}
                aria-label="Open sidebar"
            >
                <SidebarIcon class="h-6 w-6" />
            </button>
        {/if}
        <input
            type="text"
            class="w-full flex-1 border-none bg-transparent p-0 text-[1.75rem] font-semibold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            value={title}
            placeholder="Untitled"
            oninput={(e) => onTitleUpdate(e.currentTarget.value)}
        />
    </div>
    <div class="flex items-center gap-2">
        <span class="text-xs text-[var(--color-text-muted)]">
            Last edited: {updatedAt.toLocaleString()}
        </span>
        {#if saveStatus === 'saving'}
            <span
                class="text-xs font-medium text-[var(--color-text-muted)] opacity-70"
                >Unsaved changes</span
            >
        {:else if saveStatus === 'saved'}
            <span class="text-xs font-medium text-[var(--color-primary)]"
                >Saved</span
            >
        {/if}
    </div>
</header>
