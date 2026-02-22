<script lang="ts">
    import {
        settings,
        AVAILABLE_MODELS,
        type ModelInfo
    } from '$lib/stores/settings.svelte';

    function formatCostLabel(model: ModelInfo): string {
        const cost = settings.estimateCost(model.id);
        return `${model.name} (~${settings.formatCost(cost)}/sentence)`;
    }
</script>

<div class="space-y-2">
    <label
        for="model-select"
        class="block text-sm font-medium text-[var(--color-text)]"
    >
        Analysis Model
    </label>
    <select
        id="model-select"
        bind:value={settings.model}
        class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
    >
        {#each AVAILABLE_MODELS as model (model.id)}
            <option value={model.id}>
                {formatCostLabel(model)}
            </option>
        {/each}
    </select>
    <p class="text-xs text-[var(--color-text-muted)]">
        Cost estimates based on ~1000 input and ~1500 output tokens per
        analysis.
    </p>
</div>
