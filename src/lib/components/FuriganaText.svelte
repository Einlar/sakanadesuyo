<script lang="ts">
    import type { FuriganaSegment } from '$lib/types';
    import { settings } from '$lib/stores/settings.svelte';

    interface Props {
        segments: FuriganaSegment[];
        textStyle?: string;
        rubyStyle?: string;
    }

    let {
        segments,
        textStyle = '',
        rubyStyle = 'text-xs text-[var(--color-text-muted)] opacity-70'
    }: Props = $props();
</script>

{#each segments as segment}
    {#if segment.furigana && settings.showFurigana}
        <ruby class={segment.className}>
            {segment.base}<rt class={rubyStyle}>{segment.furigana}</rt>
        </ruby>
    {:else}
        {@const combinedClass = segment.className ?? textStyle}
        {#if combinedClass}
            <span class={combinedClass}>{segment.base}</span>
        {:else}
            {segment.base}
        {/if}
    {/if}
{/each}
