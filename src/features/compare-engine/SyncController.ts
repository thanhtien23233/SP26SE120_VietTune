export class SyncController {
  private rafId: number | null = null;
  private listeners = new Set<(t: number) => void>();
  private getTime: (() => number) | null = null;
  private getPlaying: (() => boolean) | null = null;

  start(getTime: () => number, getPlaying: () => boolean) {
    this.getTime = getTime;
    this.getPlaying = getPlaying;
    this.stop();
    const tick = () => {
      if (!this.getTime || !this.getPlaying) return;
      const t = this.getTime();
      this.listeners.forEach((listener) => listener(t));
      if (this.getPlaying()) {
        this.rafId = window.requestAnimationFrame(tick);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = window.requestAnimationFrame(tick);
  }

  emitOnce() {
    if (!this.getTime) return;
    const t = this.getTime();
    this.listeners.forEach((listener) => listener(t));
  }

  onTimeUpdate(cb: (t: number) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  stop() {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

