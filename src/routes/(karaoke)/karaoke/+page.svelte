<script lang="ts">
    import SongList from '$lib/components/karaoke/SongList.svelte';
    import TopNav from '$lib/components/karaoke/TopNav.svelte';
    import { karaokeStore } from '$lib/stores/karaokeStore.svelte';
    import { goto } from '$app/navigation';
</script>

<svelte:head>
    <title>Karaoke | sakanadesuyo</title>
</svelte:head>

<TopNav />
<SongList onSelectSong={(song) => goto(`/karaoke/${song.slug}`)} />
