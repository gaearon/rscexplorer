import type { SteppableStream, Thenable } from "./steppable-stream.ts";

type InternalEntry =
  | { type: "render"; stream: SteppableStream }
  | { type: "action"; name: string; args: string; stream: SteppableStream };

export type EntryView = {
  type: "render" | "action";
  name?: string;
  args?: string;
  rows: string[];
  flightPromise: Thenable<unknown> | undefined;
  chunkStart: number;
  chunkCount: number;
  canDelete: boolean;
  isActive: boolean;
  isDone: boolean;
};

export interface TimelineSnapshot {
  entries: EntryView[];
  cursor: number;
  totalChunks: number;
  isAtStart: boolean;
  isAtEnd: boolean;
}

type Listener = () => void;

export class Timeline {
  private entries: InternalEntry[] = [];
  private cursor = 0;
  private listeners = new Set<Listener>();
  private cachedSnapshot: TimelineSnapshot | null = null;

  private notify(): void {
    this.cachedSnapshot = null;
    for (const fn of this.listeners) {
      fn();
    }
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): TimelineSnapshot => {
    if (this.cachedSnapshot) {
      return this.cachedSnapshot;
    }

    let chunkStart = 0;
    const entries: EntryView[] = this.entries.map((entry) => {
      const chunkCount = entry.stream.rows.length;
      const chunkEnd = chunkStart + chunkCount;
      const base = {
        rows: entry.stream.rows,
        flightPromise: entry.stream.flightPromise,
        chunkStart,
        chunkCount,
        canDelete: this.cursor <= chunkStart,
        isActive: this.cursor >= chunkStart && this.cursor < chunkEnd,
        isDone: this.cursor >= chunkEnd,
      };
      chunkStart = chunkEnd;
      if (entry.type === "action") {
        return { type: "action" as const, name: entry.name, args: entry.args, ...base };
      }
      return { type: "render" as const, ...base };
    });

    this.cachedSnapshot = {
      entries,
      cursor: this.cursor,
      totalChunks: chunkStart,
      isAtStart: this.cursor === 0,
      isAtEnd: this.cursor >= chunkStart,
    };
    return this.cachedSnapshot;
  };

  setRender(stream: SteppableStream): void {
    this.entries = [{ type: "render", stream }];
    this.cursor = 0;
    this.notify();
  }

  addAction(name: string, args: string, stream: SteppableStream): void {
    this.entries = [...this.entries, { type: "action", name, args, stream }];
    this.notify();
  }

  deleteEntry(entryIndex: number): void {
    let chunkStart = 0;
    for (let i = 0; i < entryIndex; i++) {
      chunkStart += this.entries[i]!.stream.rows.length;
    }
    if (this.cursor > chunkStart) {
      return;
    }
    this.entries = this.entries.filter((_, i) => i !== entryIndex);
    this.notify();
  }

  stepForward(): void {
    let remaining = this.cursor;
    for (const entry of this.entries) {
      const count = entry.stream.rows.length;
      if (remaining < count) {
        entry.stream.release(remaining + 1);
        this.cursor++;
        this.notify();
        return;
      }
      remaining -= count;
    }
  }

  skipToEntryEnd(): void {
    let remaining = this.cursor;
    for (const entry of this.entries) {
      const count = entry.stream.rows.length;
      if (remaining < count) {
        for (let local = remaining; local < count; local++) {
          entry.stream.release(local + 1);
        }
        this.cursor += count - remaining;
        this.notify();
        return;
      }
      remaining -= count;
    }
  }

  clear(): void {
    this.entries = [];
    this.cursor = 0;
    this.notify();
  }
}
