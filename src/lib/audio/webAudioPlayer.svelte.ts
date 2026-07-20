/**
 * Sample-accurate audio player built on the Web Audio API.
 *
 * The native `<audio>` element seeks by *estimating* a byte offset from the
 * average bitrate, which is inaccurate for VBR files (e.g. most MP3s): after a
 * seek the reported `currentTime` drifts from the audio you actually hear,
 * desyncing the lyrics. Decoding the whole file into an `AudioBuffer` and
 * playing it through an `AudioBufferSourceNode` makes seeking sample-accurate,
 * so `currentTime` always matches what is heard.
 *
 * The engine owns a single `AudioContext` for its lifetime. `duration` and
 * `ready` are reactive ($state); `currentTime` is a live getter meant to be
 * polled from a requestAnimationFrame loop (it derives from the non-reactive
 * `AudioContext.currentTime` clock).
 */
export class WebAudioPlayer {
    #ctx: AudioContext;
    #gain: GainNode;
    #buffer: AudioBuffer | null = null;
    #source: AudioBufferSourceNode | null = null;

    /** AudioContext clock time when the current playing segment started. */
    #startedAt = 0;
    /** Buffer position (seconds) where the current segment started, or the
     *  paused position when not playing. */
    #offset = 0;
    #playing = false;

    /** Duration of the decoded buffer in seconds. */
    duration = $state(0);
    /** True once a buffer has been decoded and is ready to play. */
    ready = $state(false);

    /** Called when playback reaches the end of the buffer on its own. */
    onended: (() => void) | null = null;

    constructor(volume = 1) {
        this.#ctx = new AudioContext();
        this.#gain = this.#ctx.createGain();
        this.#gain.gain.value = volume;
        this.#gain.connect(this.#ctx.destination);
    }

    /** Decodes `blob` into a playable buffer. Reads bytes directly from the
     *  Blob (no fetch), so it needs no `connect-src` CSP allowance. */
    async load(blob: Blob): Promise<void> {
        this.#stopSource();
        this.#playing = false;
        this.ready = false;
        this.#offset = 0;

        const bytes = await blob.arrayBuffer();
        const buffer = await this.#ctx.decodeAudioData(bytes);

        this.#buffer = buffer;
        this.duration = buffer.duration;
        this.ready = true;
    }

    /** Current playback position in seconds. Non-reactive; poll via rAF. */
    get currentTime(): number {
        if (!this.#buffer) return 0;
        if (!this.#playing) return this.#offset;
        const t = this.#offset + (this.#ctx.currentTime - this.#startedAt);
        return Math.min(t, this.#buffer.duration);
    }

    get paused(): boolean {
        return !this.#playing;
    }

    play(): void {
        if (!this.#buffer || this.#playing) return;
        // Browsers start the context suspended until a user gesture; play() is
        // always reached via a click/dblclick, so resuming here is allowed.
        if (this.#ctx.state === 'suspended') this.#ctx.resume();
        this.#startSource(this.#offset);
    }

    pause(): void {
        if (!this.#playing) return;
        const pos = this.currentTime;
        this.#stopSource();
        this.#offset = pos;
    }

    /** Seeks to `time` seconds, preserving play/pause state. */
    seek(time: number): void {
        if (!this.#buffer) return;
        const clamped = Math.max(0, Math.min(time, this.#buffer.duration));
        if (this.#playing) {
            this.#stopSource();
            this.#startSource(clamped);
        } else {
            this.#offset = clamped;
        }
    }

    setVolume(volume: number): void {
        this.#gain.gain.value = volume;
    }

    destroy(): void {
        this.#stopSource();
        this.onended = null;
        void this.#ctx.close();
    }

    #startSource(offset: number): void {
        if (!this.#buffer) return;
        const source = this.#ctx.createBufferSource();
        source.buffer = this.#buffer;
        source.connect(this.#gain);
        source.onended = () => this.#handleEnded(source);
        source.start(0, offset);

        this.#source = source;
        this.#offset = offset;
        this.#startedAt = this.#ctx.currentTime;
        this.#playing = true;
    }

    #stopSource(): void {
        if (!this.#source) return;
        // Detach the handler first so stopping doesn't fire our end callback.
        this.#source.onended = null;
        try {
            this.#source.stop();
        } catch {
            // Already stopped/never started — safe to ignore.
        }
        this.#source.disconnect();
        this.#source = null;
        this.#playing = false;
    }

    #handleEnded(source: AudioBufferSourceNode): void {
        // Ignore stale callbacks from sources we replaced on seek/pause.
        if (source !== this.#source) return;
        this.#source = null;
        this.#playing = false;
        this.#offset = 0;
        this.onended?.();
    }
}
