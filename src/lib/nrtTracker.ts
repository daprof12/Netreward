/**
 * NRT Tracker Service — Musiq Platform Integration
 *
 * Singleton wrapper around @daprof12/tracker.
 * Translates music-streaming concepts (track duration, bitrate) into
 * the NetReward tracking primitives (deviceId, campaignId, bytes).
 *
 * Package: https://www.npmjs.com/package/@daprof12/tracker
 * Install: npm install @daprof12/tracker
 */

import { NetRewardTracker } from '@daprof12/tracker';

// ── Constants ─────────────────────────────────────────────────────────────────

/** 320 kbps in bytes-per-second (standard music streaming quality) */
const BYTES_PER_SEC_320KBPS = 40_000; // 320_000 bits / 8

/** Fraction of traffic that is upstream (headers, heartbeats, control) */
const UPSTREAM_FRACTION = 0.05;

// ── Singleton instance ────────────────────────────────────────────────────────

let _tracker: NetRewardTracker | null = null;

function getTracker(): NetRewardTracker {
  if (!_tracker) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    // Use a placeholder for apiSecret since the proxy handles HMAC signing
    // The SDK requires these fields, so we pass dummy values
    _tracker = new NetRewardTracker({
      apiKey: 'proxy-auth',
      apiSecret: 'proxy-secret',
      // Send events to the secure proxy instead of direct to tracking
      endpoint: `${supabaseUrl}/functions/v1/sp-tracking-proxy`,
      flushIntervalMs: 60_000,
      maxBatchSize: 50,
      // Pass the current user's JWT so the proxy can authenticate the request
      customHeaders: () => {
        const authStore = localStorage.getItem('auth-storage');
        if (!authStore) return {};
        try {
          const parsed = JSON.parse(authStore);
          const token = parsed?.state?.session?.access_token;
          return token ? { 'Authorization': `Bearer ${token}` } : {};
        } catch (e) {
          return {};
        }
      }
    });
  }
  return _tracker;
}

// ── No-op fallback (env vars missing / disabled in dev) ───────────────────────

function createNoopTracker(): NetRewardTracker {
  // Cast as any — we only need the public API surface for the noop path
  return {
    startSession: () => {},
    endSession: () => {},
    reportUsage: () => {},
    destroy: () => {},
    pendingEvents: 0,
    startSimulation: () => {},
    stopSimulation: () => {},
  } as unknown as NetRewardTracker;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call this when a user starts playing a track.
 *
 * @param userId       The NetReward / Musiq user identifier
 * @param deviceId     A stable device identifier (stored on the user's device)
 * @param campaignId   The active NetReward campaign ID for this SP
 */
export function trackPlayStart(userId: string, deviceId: string, campaignId: string): void {
  getTracker().startSession(deviceId, campaignId);
  console.log(`[NrtTracker] Play started — user:${userId} device:${deviceId} campaign:${campaignId}`);
}

/**
 * Call this when a track ends, pauses, or a new track is loaded.
 * Duration is used to estimate bytes consumed at 320 kbps.
 *
 * @param trackDurationSecs  How many seconds were actually played (not total track length)
 * @param bitrate            Optional override (bps). Defaults to 320 000.
 */
export function trackPlayEnd(trackDurationSecs: number, bitrate = 320_000): void {
  const bytesPerSec = bitrate / 8;
  const bytesDown = Math.floor(trackDurationSecs * bytesPerSec);
  const bytesUp = Math.floor(bytesDown * UPSTREAM_FRACTION);

  getTracker().reportUsage(bytesUp, bytesDown);
  getTracker().endSession();
  console.log(
    `[NrtTracker] Play ended — ${trackDurationSecs}s played ≈ ${(bytesDown / 1e6).toFixed(2)} MB down`,
  );
}

/**
 * One-shot helper: track a complete session inline.
 * Use when you already know the full duration (e.g. after a track completes).
 */
export function trackStreamingSession(
  userId: string,
  deviceId: string,
  campaignId: string,
  trackDurationSecs: number,
  bitrate = 320_000,
): void {
  trackPlayStart(userId, deviceId, campaignId);
  trackPlayEnd(trackDurationSecs, bitrate);
}

/**
 * Clean up the tracker singleton on app unmount.
 * Flushes any remaining buffered events before teardown.
 */
export function destroyTracker(): void {
  _tracker?.destroy();
  _tracker = null;
}

/** Returns number of events currently buffered (useful for debug UI). */
export function getPendingEventCount(): number {
  return _tracker?.pendingEvents ?? 0;
}

export default { trackPlayStart, trackPlayEnd, trackStreamingSession, destroyTracker, getPendingEventCount };
