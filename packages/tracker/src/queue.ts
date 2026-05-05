export interface TrackingEvent {
  device_id: string;
  campaign_id: string;
  session_id: string;
  bytes_up: number;
  bytes_down: number;
  duration_seconds: number;
  session_start: string;
  session_end: string;
}

export class EventQueue {
  private queue: TrackingEvent[] = [];
  private flushIntervalId: any = null;

  constructor(
    private readonly flushIntervalMs: number,
    private readonly maxBatchSize: number,
    private readonly onFlush: (events: TrackingEvent[]) => Promise<void>
  ) {}

  public start() {
    if (this.flushIntervalId) return;
    this.flushIntervalId = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  public stop() {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }
    // Final flush on stop
    this.flush();
  }

  public addEvent(event: TrackingEvent) {
    this.queue.push(event);
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  public async flush() {
    if (this.queue.length === 0) return;

    // Take up to maxBatchSize events from the front of the queue
    const batch = this.queue.splice(0, this.maxBatchSize);
    
    try {
      await this.onFlush(batch);
    } catch (err) {
      // If flush fails, push the events back to the front of the queue
      this.queue.unshift(...batch);
      console.error('[NetRewardTracker] Failed to flush events:', err);
    }
  }

  public get pendingCount(): number {
    return this.queue.length;
  }
}
