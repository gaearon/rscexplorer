/**
 * Timeline - manages a sequence of Flight responses for debugging.
 *
 * Each entry owns its SteppableStream(s). The cursor controls playback.
 * Stepping releases data to streams; I/O is handled externally.
 *
 * Entry types:
 * - render: { type, stream } - initial render
 * - action: { type, name, args, stream } - action invoked from client or added manually
 */
export class Timeline {
  constructor() {
    this.entries = [];
    this.cursor = 0;
    this.listeners = new Set();
    this.snapshot = null;
  }

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  notify() {
    this.snapshot = null; // Invalidate cache
    this.listeners.forEach(fn => fn());
  }

  getChunkCount(entry) {
    return entry.stream?.rows?.length || 0;
  }

  getTotalChunks() {
    return this.entries.reduce((sum, e) => sum + this.getChunkCount(e), 0);
  }

  getPosition(globalChunk) {
    let remaining = globalChunk;
    for (let i = 0; i < this.entries.length; i++) {
      const count = this.getChunkCount(this.entries[i]);
      if (remaining < count) {
        return { entryIndex: i, localChunk: remaining };
      }
      remaining -= count;
    }
    return null;
  }

  getEntryStart(entryIndex) {
    let start = 0;
    for (let i = 0; i < entryIndex; i++) {
      start += this.getChunkCount(this.entries[i]);
    }
    return start;
  }

  canDeleteEntry(entryIndex) {
    if (entryIndex < 0 || entryIndex >= this.entries.length) return false;
    return this.cursor <= this.getEntryStart(entryIndex);
  }

  // For useSyncExternalStore compatibility - must return cached object
  getSnapshot = () => {
    if (this.snapshot) return this.snapshot;

    const totalChunks = this.getTotalChunks();
    this.snapshot = {
      entries: this.entries,
      cursor: this.cursor,
      totalChunks,
      isAtStart: this.cursor === 0,
      isAtEnd: this.cursor >= totalChunks,
    };
    return this.snapshot;
  };

  setRender(stream) {
    this.entries = [{ type: 'render', stream }];
    this.cursor = 0;
    this.notify();
  }

  addAction(name, args, stream) {
    this.entries = [...this.entries, { type: 'action', name, args, stream }];
    this.notify();
  }

  deleteEntry(entryIndex) {
    if (!this.canDeleteEntry(entryIndex)) return false;
    this.entries = this.entries.filter((_, i) => i !== entryIndex);
    this.notify();
    return true;
  }

  // Advance cursor and release chunk without notifying (internal helper)
  _releaseNext() {
    const pos = this.getPosition(this.cursor);
    if (!pos) return false;
    const entry = this.entries[pos.entryIndex];
    this.cursor++;
    entry.stream.release(pos.localChunk + 1);
    return true;
  }

  stepForward() {
    const total = this.getTotalChunks();
    if (this.cursor >= total) return;
    this._releaseNext();
    this.notify();
  }

  stepBackward() {
    if (this.cursor <= 0) return;
    this.seekTo(this.cursor - 1);
  }

  /**
   * Seek to a specific position in the timeline.
   * For backward seeks, this resets streams and replays to the target position.
   * Entries that start after the target position are removed (actions that haven't happened yet).
   */
  seekTo(targetCursor) {
    const total = this.getTotalChunks();
    const clampedTarget = Math.max(0, Math.min(targetCursor, total));

    if (clampedTarget === this.cursor) return;

    if (clampedTarget > this.cursor) {
      // Forward seek: release chunks until we reach target
      while (this.cursor < clampedTarget) {
        if (!this._releaseNext()) break;
      }
    } else {
      // Backward seek: keep entries whose start position <= target
      let entriesToKeep = 0;
      let entryStart = 0;
      for (let i = 0; i < this.entries.length; i++) {
        if (entryStart > clampedTarget) break; // This entry starts after target
        entriesToKeep++;
        entryStart += this.getChunkCount(this.entries[i]);
      }

      // Remove entries that start after the target position
      this.entries = this.entries.slice(0, entriesToKeep);

      // Reset streams for remaining entries
      for (const entry of this.entries) {
        entry.stream.reset();
      }
      this.cursor = 0;

      // Replay to target position
      while (this.cursor < clampedTarget) {
        if (!this._releaseNext()) break;
      }
    }

    this.notify();
  }

  skipToEntryEnd() {
    const pos = this.getPosition(this.cursor);
    if (!pos) return;

    const entryEnd = this.getEntryStart(pos.entryIndex) + this.getChunkCount(this.entries[pos.entryIndex]);
    while (this.cursor < entryEnd) {
      this.stepForward();
    }
  }

  clear() {
    this.entries = [];
    this.cursor = 0;
    this.notify();
  }
}
