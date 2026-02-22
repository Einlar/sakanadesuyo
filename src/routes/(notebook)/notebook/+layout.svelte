<script lang="ts">
    let { children } = $props();
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossorigin="anonymous"
    />
    <link
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
        crossorigin="anonymous"
    />
    <title>Notebook | 魚ですよ</title>
</svelte:head>

{@render children()}
