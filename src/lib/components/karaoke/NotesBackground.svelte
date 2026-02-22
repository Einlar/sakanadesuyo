<script lang="ts">
    import { onMount } from 'svelte';

    interface Note {
        id: number;
        x: number;
        y: number;
        size: number;
        opacity: number;
        rotation: number;
        speed: number;
        symbol: string;
        isHovered: boolean;
    }

    const NOTE_SYMBOLS = ['♪', '♫', '♩', '♬', '𝄞'];
    const NOTE_COUNT = 15;

    let notes = $state<Note[]>([]);
    let mouseX = $state(-100); // Start off-screen
    let mouseY = $state(-100);
    let containerEl: HTMLDivElement;

    function createNote(id: number): Note {
        return {
            id,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 16 + Math.random() * 24,
            opacity: 0.15 + Math.random() * 0.2,
            rotation: Math.random() * 30 - 15,
            speed: 0.2 + Math.random() * 0.3,
            symbol: NOTE_SYMBOLS[
                Math.floor(Math.random() * NOTE_SYMBOLS.length)
            ],
            isHovered: false
        };
    }

    onMount(() => {
        notes = Array.from({ length: NOTE_COUNT }, (_, i) => createNote(i));

        let animationFrame: number;

        function animate() {
            if (!containerEl) {
                animationFrame = requestAnimationFrame(animate);
                return;
            }

            // Get container dimensions to calculate distance properly in pixels
            // or just use consistent percentage logic if sufficient.
            // Using percentages for logic is easier but aspect ratio warps distance.
            // Let's approximate distance in meaningful "screen %" units.
            // To be more robust, let's treat the threshold as a simple radius in % space,
            // adjusting X by aspect ratio if possible, but for background FX, simple % distance is fine.
            const aspect = containerEl.clientWidth / containerEl.clientHeight;
            const threshold = 5; // 5% of height radius roughly

            notes = notes.map((note) => {
                // Calculate distance to mouse
                // Normalize X distance by aspect ratio to make the "touch zone" circular
                // X difference in % * aspect ratio ~= Y difference in % scale
                const dx = (note.x - mouseX) * aspect;
                const dy = note.y - mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const isHovered = dist < threshold;

                if (isHovered) {
                    return { ...note, isHovered: true };
                }

                // Normal movement
                let newY = note.y - note.speed * 0.05;
                let newX = note.x;

                if (newY < -5) {
                    newY = 105;
                    newX = Math.random() * 100;
                }

                return { ...note, y: newY, x: newX, isHovered: false };
            });
            animationFrame = requestAnimationFrame(animate);
        }

        animationFrame = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrame);
        };
    });

    function handleMouseMove(e: MouseEvent) {
        if (!containerEl) return;
        const rect = containerEl.getBoundingClientRect();
        // Convert mouse position to percentages [0-100]
        mouseX = ((e.clientX - rect.left) / rect.width) * 100;
        mouseY = ((e.clientY - rect.top) / rect.height) * 100;
    }
</script>

<svelte:window onmousemove={handleMouseMove} />

<div
    bind:this={containerEl}
    class="pointer-events-none fixed inset-0 z-0 overflow-hidden"
>
    {#each notes as note (note.id)}
        <span
            class="absolute flex items-center justify-center transition-colors transition-opacity duration-300 ease-out will-change-transform select-none"
            class:sparkle={note.isHovered}
            style:left="{note.x}%"
            style:top="{note.y}%"
            style:font-size="{note.size}px"
            style:opacity={note.isHovered ? 1 : note.opacity}
            style:transform="rotate({note.rotation}deg)"
            style:color={note.isHovered
                ? 'var(--color-accent)'
                : 'var(--color-primary)'}
        >
            {note.symbol}
        </span>
    {/each}
</div>

<style>
    .sparkle {
        animation: sparkle-anim 0.5s ease-in-out infinite alternate;
        text-shadow: 0 0 10px var(--color-accent);
        z-index: 10;
    }

    @keyframes sparkle-anim {
        0% {
            transform: scale(1) rotate(0deg);
        }
        100% {
            transform: scale(1.2) rotate(10deg);
        }
    }
</style>
