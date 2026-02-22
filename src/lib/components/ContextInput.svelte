<script lang="ts">
    interface Props {
        value: string;
        onchange: (value: string) => void;
        onsubmit?: () => void;
        disabled?: boolean;
    }

    let { value, onchange, onsubmit, disabled = false }: Props = $props();
    let isFocused = $state(false);

    function handleInput(e: Event) {
        const target = e.target as HTMLTextAreaElement;
        onchange(target.value);
        adjustHeight(target);
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            onsubmit?.();
        }
    }

    function adjustHeight(el: HTMLTextAreaElement) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    }

    function onFocus(e: FocusEvent) {
        isFocused = true;
        // Small delay to ensure height calculation is correct after transition/render
        setTimeout(() => adjustHeight(e.target as HTMLTextAreaElement), 0);
    }
</script>

<div class="relative w-full">
    <textarea
        name="context"
        {value}
        oninput={handleInput}
        onkeydown={handleKeyDown}
        onfocus={onFocus}
        onblur={() => (isFocused = false)}
        {disabled}
        placeholder={'Add optional context...'}
        aria-label="Context (optional)"
        rows="1"
        class="w-full resize-none overflow-hidden rounded-lg border px-4 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] transition-colors transition-opacity transition-shadow duration-300 outline-none
            {isFocused
            ? 'border-[var(--color-primary)] bg-[var(--color-surface)] py-[9px] opacity-100 shadow-sm'
            : 'h-[40px] border-transparent bg-transparent py-[9px] opacity-70 hover:bg-[var(--color-surface)] hover:opacity-100'}"
        style={!isFocused && !value ? 'height: 40px;' : 'min-height: 40px;'}
    ></textarea>
</div>
