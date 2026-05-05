import { generateHmacSignature } from './crypto';
import { EventQueue, TrackingEvent } from './queue';

export interface TrackerConfig {
  apiKey: string;
  apiSecret: string;
  endpoint?: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
}

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
  private simInterval: any = null;

  constructor(config: TrackerConfig) {
    this.config = {
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      endpoint: config.endpoint || 'https://api.netreward.online/v1/tracking/batch', // Will be overridden in usage
      flushIntervalMs: config.flushIntervalMs || 60000, // 60s
      maxBatchSize: config.maxBatchSize || 50,
    };

    this.queue = new EventQueue(
      this.config.flushIntervalMs,
      this.config.maxBatchSize,
      this.flushToServer.bind(this)
    );
    
    this.queue.start();
  }

  /**
   * Starts a new tracking session for a user device on a specific campaign.
   */
  public startSession(deviceId: string, campaignId: string) {
    if (this.currentSession) {
      this.endSession();
    }

    this.currentSession = {
      deviceId,
      campaignId,
      sessionId: crypto.randomUUID(),
      startTime: Date.now(),
      bytesUp: 0,
      bytesDown: 0,
    };
    
    console.log(`[NetRewardTracker] Started session ${this.currentSession.sessionId} for device ${deviceId}`);
  }

  /**
   * Reports network usage bytes for the active session.
   */
  public reportUsage(bytesUp: number, bytesDown: number) {
    if (!this.currentSession) {
      console.warn('[NetRewardTracker] Cannot report usage: No active session.');
      return;
    }

    this.currentSession.bytesUp += bytesUp;
    this.currentSession.bytesDown += bytesDown;
  }

  /**
   * Ends the current tracking session and queues the final data report.
   */
  public endSession() {
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
    this.currentSession = null;
  }

  /**
   * Shuts down the tracker, flushing any remaining events in the queue.
   */
  public destroy() {
    this.endSession();
    this.stopSimulation();
    this.queue.stop();
  }

  /**
   * Internal method that securely signs the payload and sends it to the Edge Function.
   */
  private async flushToServer(events: TrackingEvent[]) {
    const payload = JSON.stringify({ events });
    const signature = await generateHmacSignature(payload, this.config.apiSecret);

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sp-api-key': this.config.apiKey,
        'x-hmac-sig': signature,
      },
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
  }

  // ==========================================
  // Development / Simulation Utilities
  // ==========================================

  /**
   * Enables auto-simulation of data traffic for testing purposes.
   * Reports data every `tickIntervalMs`.
   */
  public startSimulation(gbPerHour: number = 1.0, tickIntervalMs: number = 5000) {
    if (this.simInterval) return;
    
    // Calculate bytes per tick
    const bytesPerHour = gbPerHour * 1000000000;
    const ticksPerHour = (60 * 60 * 1000) / tickIntervalMs;
    const bytesPerTick = Math.floor(bytesPerHour / ticksPerHour);

    this.simInterval = setInterval(() => {
      if (this.currentSession) {
        // Randomly split between up/down
        const upPct = Math.random() * 0.4 + 0.1; // 10-50% up
        const downPct = 1.0 - upPct;
        
        this.reportUsage(
          Math.floor(bytesPerTick * upPct),
          Math.floor(bytesPerTick * downPct)
        );
      }
    }, tickIntervalMs);
    
    console.log(`[NetRewardTracker] Simulation started: ${gbPerHour} GB/hr`);
  }

  public stopSimulation() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
  }
}
