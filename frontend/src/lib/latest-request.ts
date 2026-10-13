/** Abort obsolete fetches and guard results even if the transport ignores abort. */
export class LatestRequest {
  private controller: AbortController | undefined;
  private generation = 0;
  get busy() { return !!this.controller; }

  cancel() {
    this.generation++;
    this.controller?.abort();
    this.controller = undefined;
  }

  start() {
    this.cancel();
    const controller = new AbortController();
    const generation = this.generation;
    this.controller = controller;
    const current = () => this.generation === generation && !controller.signal.aborted;
    return {
      signal: controller.signal,
      current,
      finish: () => { if (current()) this.controller = undefined; },
    };
  }
}
