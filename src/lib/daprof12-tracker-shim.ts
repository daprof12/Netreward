/**
 * @daprof12/tracker — Local Shim
 *
 * This file is a drop-in replacement for the @daprof12/tracker npm package,
 * which is hosted on GitHub Package Registry and requires a Personal Access Token.
 *
 * HOW TO SWITCH TO THE REAL PACKAGE (when your PAT is ready):
 *   1. Add to .npmrc:  @daprof12:registry=https://npm.pkg.github.com
 *                      //npm.pkg.github.com/:_authToken=YOUR_PAT
 *   2. Run:            npm install @daprof12/tracker
 *   3. In nrtTracker.ts, change:
 *        import { NetRewardTracker, TrackerConfig } from './daprof12-tracker-shim';
 *      to:
 *        import { NetRewardTracker, TrackerConfig } from '@daprof12/tracker';
 *   4. Delete this file.
 *
 * This shim is a faithful copy of packages/tracker/src — same class name,
 * same constructor signature, same public method signatures.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrackerConfig {
  /** SP API key from the NetReward dashboard (x-sp-api-key header) */
  apiKey: string;
  /** SP secret key for HMAC-SHA256 request signing */
  apiSecret: string;
  /** Tracking endpoint — should point to your /functions/v1/tracking Edge Function */
  endpoint?: string;
  /** How often the event queue auto-flushes to the server, in ms (default: 60 000) */
  flushIntervalMs?: number;
  /** Max events per batch before a forced flush (default: 50) */
  maxBatchSize?: number;
}

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

// ─── HMAC helper (Web Crypto API — works in browsers & Vite) ──────────────────

async function generateHmacSignature(payload: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── EventQueue ───────────────────────────────────────────────────────────────

class EventQueue {
  private queue: TrackingEvent[] = [];
  private flushIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly flushIntervalMs: number,
    private readonly maxBatchSize: number,
    private readonly onFlush: (events: TrackingEvent[]) => Promise<void>,
  ) {}

  start() {
    if (this.flushIntervalId) return;
    this.flushIntervalId = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  stop() {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }
    this.flush(); // final drain
  }

  addEvent(event: TrackingEvent) {
    this.queue.push(event);
    if (this.queue.length >= this.maxBatchSize) this.flush();
  }

  async flush() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.maxBatchSize);
    try {
      await this.onFlush(batch);
    } catch (err) {
      // Re-queue on failure so events aren't lost
      this.queue.unshift(...batch);
      console.error('[NetRewardTracker] Flush failed, events re-queued:', err);
    }
  }

  get pendingCount(): number {
    return this.queue.length;
  }
}

// ─── NetRewardTracker ─────────────────────────────────────────────────────────

export class NetRewardTracker {
  private config: Required<TrackerConfig>;
  private queue: EventQueue;
  private currentSession: {
    deviceId: string;
    campaignId: string;
    sessionId: string;
    startTime: number;
    bytesUp: number;
    bytesDown: number;
  } | null = null;
  private simInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: TrackerConfig) {
    this.config = {
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      endpoint: config.endpoint ?? 'https://api.netreward.online/v1/tracking/batch',
      flushIntervalMs: config.flushIntervalMs ?? 60_000,
      maxBatchSize: config.maxBatchSize ?? 50,
    };

    this.queue = new EventQueue(
      this.config.flushIntervalMs,
      this.config.maxBatchSize,
      this.flushToServer.bind(this),
    );

    this.queue.start();
  }

  /**
   * Begin tracking a new user session on a specific campaign.
   * Call this when the user starts playing a track / consuming data.
   */
  public startSession(deviceId: string, campaignId: string): void {
    if (this.currentSession) this.endSession(); // auto-close any open session

    this.currentSession = {
      deviceId,
      campaignId,
      sessionId: crypto.randomUUID(),
      startTime: Date.now(),
      bytesUp: 0,
      bytesDown: 0,
    };

    console.log(
      `[NetRewardTracker] Session started — ${this.currentSession.sessionId} (device: ${deviceId})`,
    );
  }

  /**
   * Accumulate byte-level usage for the active session.
   * For streaming, call this periodically or derive from duration × bitrate.
   */
  public reportUsage(bytesUp: number, bytesDown: number): void {
    if (!this.currentSession) {
      console.warn('[NetRewardTracker] reportUsage called with no active session.');
      return;
    }
    this.currentSession.bytesUp += bytesUp;
    this.currentSession.bytesDown += bytesDown;
  }

  /**
   * End the current session and queue the event for delivery.
   * Call this when the user stops/pauses/changes track.
   */
  public endSession(): void {
    if (!this.currentSession) return;

    const endTime = Date.now();
    const durationSeconds = Math.max(1, Math.floor((endTime - this.currentSession.startTime) / 1000));

    const event: TrackingEvent = {
      device_id: this.currentSession.deviceId,
      campaign_id: this.currentSession.campaignId,
      session_id: this.currentSession.sessionId,
      bytes_up: this.currentSession.bytesUp,
      bytes_down: this.currentSession.bytesDown,
      duration_seconds: durationSeconds,
      session_start: new Date(this.currentSession.startTime).toISOString(),
      session_end: new Date(endTime).toISOString(),
    };

    this.queue.addEvent(event);
    console.log(
      `[NetRewardTracker] Session ended — ${event.session_id} | ${durationSeconds}s | ↓${event.bytes_down}B`,
    );
    this.currentSession = null;
  }

  /**
   * Flush remaining events and tear down the tracker.
   * Call this in a cleanup / unmount hook.
   */
  public destroy(): void {
    this.endSession();
    this.stopSimulation();
    this.queue.stop();
  }

  /** Number of events buffered and not yet sent to the server. */
  public get pendingEvents(): number {
    return this.queue.pendingCount;
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private async flushToServer(events: TrackingEvent[]): Promise<void> {
    const payload = JSON.stringify({ events });
    const signature = await generateHmacSignature(payload, this.config.apiSecret);

    const res = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sp-api-key': this.config.apiKey,
        'x-hmac-sig': signature,
      },
      body: payload,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Tracking endpoint returned ${res.status}: ${body}`);
    }
  }

  // ── Dev / Simulation helpers ───────────────────────────────────────────────

  /**
   * Simulate data traffic for testing without real playback.
   * @param gbPerHour  Simulated throughput (default 1 GB/hr ≈ 320kbps audio)
   * @param tickIntervalMs  How often to call reportUsage internally (default 5 000 ms)
   */
  public startSimulation(gbPerHour = 1.0, tickIntervalMs = 5_000): void {
    if (this.simInterval) return;
    const bytesPerTick = Math.floor((gbPerHour * 1e9) / ((3_600_000) / tickIntervalMs));

    this.simInterval = setInterval(() => {
      if (!this.currentSession) return;
      const upFraction = Math.random() * 0.4 + 0.1; // 10–50 % up
      this.reportUsage(
        Math.floor(bytesPerTick * upFraction),
        Math.floor(bytesPerTick * (1 - upFraction)),
      );
    }, tickIntervalMs);

    console.log(`[NetRewardTracker] Simulation started at ${gbPerHour} GB/hr`);
  }

  public stopSimulation(): void {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
  }
}

export default NetRewardTracker;
