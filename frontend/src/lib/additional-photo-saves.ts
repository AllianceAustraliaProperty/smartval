import { API_BASE_URL } from './api-config';
import { CoalescingSaveQueue } from './coalescing-save-queue';

type Photo = Record<string, any>;
const sessions = new Map<string, AdditionalPhotoSaves>();
let unloadListenerInstalled = false;

/** Shared across section unmounts so a navigation cannot discard the last edit. */
export class AdditionalPhotoSaves {
  readonly queue: CoalescingSaveQueue<Photo[]>;
  private operation: Promise<unknown> | undefined;
  private listeners = new Set<() => void>();
  private writes = 0;

  constructor(reportId: string) {
    this.queue = new CoalescingSaveQueue(async photos => {
      const response = await fetch(`${API_BASE_URL}/additional-photos/update/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos }),
      });
      if (!response.ok) throw new Error('Photo changes could not be saved. Please retry.');
    });
    this.queue.subscribe(() => this.notify());
  }

  get busy() { return !!this.operation; }
  get pending() { return this.busy || this.queue.pending; }
  get observed() { return this.listeners.size > 0; }
  get unsaved() { return this.queue.pending || this.writes > 0; }

  private notify() { this.listeners.forEach(listener => listener()); }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  async flush() {
    await this.operation;
    await this.queue.flush();
  }

  /** Structural edits and full-report saves must follow pending metadata writes. */
  run<T>(action: () => Promise<T>, writes = true): Promise<T> {
    if (writes) this.writes++;
    const previous = this.operation;
    const operation = (async () => {
      await previous;
      await this.queue.flush();
      return action();
    })();
    this.operation = operation;
    this.notify();
    return operation.finally(() => {
      if (writes) this.writes--;
      if (this.operation === operation) this.operation = undefined;
      this.notify();
    });
  }
}

export function getAdditionalPhotoSaves(reportId: string) {
  let session = sessions.get(reportId);
  if (!session) {
    // Retain failed/pending edits, but bound inactive successfully saved sessions.
    if (sessions.size >= 32) {
      for (const [id, old] of sessions) {
        if (!old.pending && !old.observed) sessions.delete(id);
      }
    }
    session = new AdditionalPhotoSaves(reportId);
    sessions.set(reportId, session);
  }
  if (typeof window !== 'undefined' && !unloadListenerInstalled) {
    window.addEventListener('beforeunload', event => {
      if ([...sessions.values()].some(s => s.unsaved)) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
    unloadListenerInstalled = true;
  }
  return session;
}

export async function flushAdditionalPhotoSaves(reportId: string) {
  await sessions.get(reportId)?.flush();
}

export async function saveReportAfterPhotos<T extends { additionalPhotos?: any[] }>(
  reportId: string, data: T, save: (data: T) => Promise<void>,
) {
  const session = sessions.get(reportId);
  if (!session || (!session.observed && !session.pending)) return save(data);
  return session.run(() => save(session.queue.latest
    ? { ...data, additionalPhotos: session.queue.latest }
    : data));
}
