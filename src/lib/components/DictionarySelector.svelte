<script lang="ts">
    import { settings } from '$lib/stores/settings.svelte';
</script>

<div class="space-y-2">
    <label
        for="dictionary-select"
        class="block text-sm font-medium text-[var(--color-text)]"
    >
        Dictionary
    </label>
    <select
        id="dictionary-select"
        bind:value={settings.dictionaryProvider}
        class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
    >
        <option value="jisho">Jisho</option>
        <option value="jpdb">JPDB</option>
    </select>
</div>
