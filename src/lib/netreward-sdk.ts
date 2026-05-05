/**
 * NetReward SP SDK — Client-side tracking library
 * 
 * Service Providers integrate this into their apps to report
 * user data consumption to the NetReward Reward Engine.
 * 
 * Usage:
 *   import { NetRewardSDK } from '@netreward/sdk';
 * 
 *   const sdk = new NetRewardSDK({
 *     apiKey: 'sp_live_xxxx',
 *     secretKey: 'sk_xxxx',
 *     endpoint: 'https://<project>.supabase.co/functions/v1/tracking',
 *   });
 * 
 *   // Track a single session
 *   await sdk.trackSession({
 *     deviceId: 'device-uuid',
 *     campaignId: 'campaign-uuid',
 *     sessionId: 'unique-session-id',
 *     bytesUp: 1024000,
 *     bytesDown: 50240000,
 *     durationSeconds: 300,
 *   });
 * 
 *   // Or batch multiple events
 *   await sdk.trackBatch([...events]);
 * 
 *   // Auto-flush buffered events every 30s
 *   sdk.startAutoFlush(30000);
 *   sdk.stopAutoFlush();
 */

export interface NetRewardConfig {
  /** SP API key from the dashboard (services.api_key) */
  apiKey: string;
  /** SP secret key for HMAC signing (services.secret_key) */
  secretKey: string;
  /** Tracking API endpoint URL */
  endpoint: string;
  /** Provider type: 'sp' or 'isp' (default: 'sp') */
  providerType?: 'sp' | 'isp';
  /** Max events to buffer before auto-flush (default: 50) */
  maxBufferSize?: number;
  /** Retry failed requests up to N times (default: 3) */
  maxRetries?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

export interface TrackingEvent {
  deviceId: string;
  campaignId: string;
  sessionId: string;
  bytesUp?: number;
  bytesDown?: number;
  durationSeconds?: number;
  sessionStart?: string;
  sessionEnd?: string;
}

export interface TrackingResult {
  session_id: string;
  status: 'success' | 'error' | 'skipped' | 'duplicate';
  message?: string;
  nrt_rewarded?: number;
  user_share?: number;
  sp_share?: number;
  isp_share?: number;
  remaining_budget?: number;
}

export interface BatchResponse {
  success: boolean;
  provider_type: string;
  total: number;
  processed: number;
  errors: number;
  results: TrackingResult[];
}

/** Compute HMAC-SHA256 hex digest using Web Crypto API */
async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export class NetRewardSDK {
  private config: Required<NetRewardConfig>;
  private buffer: TrackingEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;

  constructor(config: NetRewardConfig) {
    this.config = {
      providerType: 'sp',
      maxBufferSize: 50,
      maxRetries: 3,
      debug: false,
      ...config,
    };
  }

  private log(...args: unknown[]) {
    if (this.config.debug) {
      console.log('[NetReward SDK]', ...args);
    }
  }

  /**
   * Track a single data session event.
   * The event is buffered and sent when the buffer is full or on flush.
   */
  bufferEvent(event: TrackingEvent): void {
    this.buffer.push(event);
    this.log(`Buffered event ${event.sessionId} (${this.buffer.length}/${this.config.maxBufferSize})`);

    if (this.buffer.length >= this.config.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Track a single session immediately (no buffering).
   */
  async trackSession(event: TrackingEvent): Promise<TrackingResult> {
    const response = await this.trackBatch([event]);
    return response.results[0];
  }

  /**
   * Send a batch of tracking events to the API.
   */
  async trackBatch(events: TrackingEvent[]): Promise<BatchResponse> {
    const payload = {
      events: events.map((e) => ({
        device_id: e.deviceId,
        campaign_id: e.campaignId,
        session_id: e.sessionId,
        bytes_up: e.bytesUp ?? 0,
        bytes_down: e.bytesDown ?? 0,
        duration_seconds: e.durationSeconds ?? 60,
        session_start: e.sessionStart,
        session_end: e.sessionEnd,
      })),
    };

    const bodyText = JSON.stringify(payload);
    const signature = await hmacSha256(this.config.secretKey, bodyText);

    const headerKey = this.config.providerType === 'isp' ? 'x-isp-api-key' : 'x-sp-api-key';

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.log(`Sending batch of ${events.length} events (attempt ${attempt}/${this.config.maxRetries})`);

        const res = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [headerKey]: this.config.apiKey,
            'x-hmac-sig': signature,
          },
          body: bodyText,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        this.log(`Batch processed: ${data.processed} success, ${data.errors} errors`);
        return data as BatchResponse;
      } catch (err) {
        lastError = err as Error;
        this.log(`Attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < this.config.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s...
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw new Error(`Failed after ${this.config.maxRetries} retries: ${lastError?.message}`);
  }

  /**
   * Flush all buffered events to the API.
   */
  async flush(): Promise<BatchResponse | null> {
    if (this.isFlushing || this.buffer.length === 0) return null;

    this.isFlushing = true;
    const events = [...this.buffer];
    this.buffer = [];

    try {
      const result = await this.trackBatch(events);
      this.isFlushing = false;
      return result;
    } catch (err) {
      // Put failed events back in the buffer
      this.buffer.unshift(...events);
      this.isFlushing = false;
      throw err;
    }
  }

  /**
   * Start auto-flushing the buffer at a given interval (ms).
   */
  startAutoFlush(intervalMs = 30000): void {
    this.stopAutoFlush();
    this.flushTimer = setInterval(() => {
      this.flush().catch((err) => {
        this.log('Auto-flush error:', err.message);
      });
    }, intervalMs);
    this.log(`Auto-flush started (every ${intervalMs}ms)`);
  }

  /**
   * Stop auto-flushing.
   */
  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
      this.log('Auto-flush stopped');
    }
  }

  /**
   * Get the number of buffered events.
   */
  get pendingEvents(): number {
    return this.buffer.length;
  }

  /**
   * Destroy the SDK instance, flushing any pending events.
   */
  async destroy(): Promise<void> {
    this.stopAutoFlush();
    if (this.buffer.length > 0) {
      await this.flush();
    }
  }
}

export default NetRewardSDK;
