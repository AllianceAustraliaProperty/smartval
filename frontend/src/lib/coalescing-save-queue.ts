/** Debounce snapshots, keep only the newest pending value, and never overlap writes. */
export class CoalescingSaveQueue<T> {
  private value: T | undefined;
  private revision = 0;
  private savedRevision = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | undefined;
  private listeners = new Set<() => void>();
  error: Error | null = null;

  constructor(private write: (value: T) => Promise<void>, private delay = 600) {}

  get latest() { return this.value; }
  get pending() { return this.savedRevision < this.revision; }
  get saving() { return !!this.running; }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify() { this.listeners.forEach(listener => listener()); }

  forgetSaved() {
    if (!this.pending && !this.running) this.value = undefined;
  }

  setSaved(value: T) {
    if (this.pending || this.running) throw new Error('Cannot replace pending photo edits');
    this.value = value;
    this.error = null;
    this.notify();
  }

  enqueue(value: T) {
    this.value = value;
    this.revision++;
    this.error = null;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush().catch(() => {}); }, this.delay);
    this.notify();
  }

  flush(): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.running) return this.running;
    if (!this.pending) return Promise.resolve();
    this.error = null;
    // Defer the loop one microtask so running is assigned before notifications.
    this.running = Promise.resolve().then(async () => {
      while (this.pending) {
        const revision = this.revision;
        const snapshot = this.value as T;
        await this.write(snapshot);
        this.savedRevision = revision;
      }
    }).catch(error => {
      this.error = error instanceof Error ? error : new Error('Unable to save photo changes');
      throw this.error;
    }).finally(() => {
      this.running = undefined;
      this.notify();
    });
    this.notify();
    return this.running;
  }
}
