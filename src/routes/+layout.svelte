<script lang="ts">
    import '@friendofsvelte/tipex/styles/index.css';
    import '../app.css';
    import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
    import { theme } from '$lib/stores/theme.svelte';

    $effect(() => {
        document.documentElement.classList.toggle(
            'dark',
            theme.current === 'dark'
        );
    });

    let { children } = $props();
</script>

{@render children()}
<ToastContainer />
