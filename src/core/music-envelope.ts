/** Every song in the game eases in and out: it fades in whenever it starts or resumes, fades out
 * before its file ends or loops back, and fades out when the story or the title lets it go. */
export const FADE_IN = 2, FADE_OUT = 2.6;

/** Rides one audio element's volume on animation frames while it plays. `level` is its full volume and
 * `end` the point (seconds into the file) where the track ends or loops back. */
export class MusicEnvelope {
  private rise = 0;
  private fall = 1;
  private frame = 0;
  private last = 0;
  private leaving: (() => void) | null = null;
  constructor(private audio: HTMLAudioElement, private level: number, private end: () => number) {
    audio.addEventListener('playing', () => this.run());
  }
  /** Playback is starting (or starting again) from silence. */
  start() { this.rise = 0; this.fall = 1; this.leaving = null; this.apply(); this.run(); }
  /** Fades out, then calls `done` once the track is silent. */
  leave(done: () => void) { this.leaving = done; this.run(); }
  /** Called back before it went silent: fade in again from where the fade out had got to. */
  stay() { if (!this.leaving && this.fall >= 1) return; this.leaving = null; this.rise = Math.min(this.rise, this.fall); this.fall = 1; this.run(); }
  private run() { if (this.frame) return; this.last = performance.now(); this.frame = requestAnimationFrame(this.step); }
  private step = (now: number) => {
    this.frame = 0;
    const dt = Math.min(.25, Math.max(0, (now - this.last) / 1000)); this.last = now;
    if (!this.audio.paused) {
      this.rise = Math.min(1, this.rise + dt / FADE_IN);
      if (this.leaving) this.fall = Math.max(0, this.fall - dt / FADE_OUT);
    }
    this.apply();
    if (this.leaving && this.fall <= 0) { const done = this.leaving; this.leaving = null; done(); return; }
    if (!this.audio.paused) this.run();
  };
  private apply() {
    const end = this.end(), remaining = Number.isFinite(end) ? end - this.audio.currentTime : Infinity;
    const tail = Math.min(1, Math.max(0, remaining / FADE_OUT));
    this.audio.volume = this.level * this.rise * this.fall * tail;
  }
}
