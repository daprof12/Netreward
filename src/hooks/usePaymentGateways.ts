/**
 * usePaymentGateways.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches enabled payment gateway configs from kv_settings.
 *
 * Only the `enabled` flag and `publicKey` (or equivalent client-side key) are
 * needed on the frontend. Secret keys remain server-side only.
 *
 * Usage:
 *   const { gateways, isLoading, getGatewaysForUser } = usePaymentGateways();
 *   const available = getGatewaysForUser('Nigeria'); // returns enabled gateways for Nigeria
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  GATEWAY_REGISTRY,
  type GatewayId,
  type GatewayDefinition,
  getGatewaysForCountry,
} from '@/lib/paymentGateways';

export interface LiveGateway extends GatewayDefinition {
  enabled: boolean;
  publicKey: string;      // client-safe key (varies by gateway: publicKey, clientKey, appId, etc.)
  environment: string;    // 'test' | 'sandbox' | 'live' | 'production'
  callbackUrl: string;
}

// Keys that are safe to expose to the frontend per gateway
const CLIENT_KEY_FIELD: Partial<Record<GatewayId, string>> = {
  paystack:    'publicKey',
  flutterwave: 'publicKey',
  stripe:      'publicKey',
  paypal:      'clientId',
  razorpay:    'keyId',
  xendit:      'publicKey',
  checkout_com:'publicKey',
  alipay:      'appId',
  toss:        'clientKey',
  paidy:       'publicKey',
  mercadopago: 'publicKey',
  interac:     'merchantId',
  mtn_momo:    'apiUser',   // non-sensitive identifier
};

export function usePaymentGateways() {
  // Fetch all non-OPay gateway configs from kv_settings in one query
  const kvKeys = GATEWAY_REGISTRY
    .filter(g => g.id !== 'opay')
    .map(g => g.kvKey);

  const { data, isLoading, error } = useQuery({
    queryKey: ['payment_gateways_config'],
    staleTime: 5 * 60 * 1000, // 5 min cache
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kv_settings')
        .select('key, value')
        .in('key', kvKeys);

      if (error) throw error;
      return data ?? [];
    },
  });

  // Also fetch OPay enabled status (OPay has separate kv keys)
  const { data: opayData } = useQuery({
    queryKey: ['opay_config_status'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('kv_settings')
        .select('key, value')
        .in('key', ['opay_merchant_id', 'opay_environment', 'opay_public_key', 'opay_enabled']);
      return data ?? [];
    },
  });

  // Build the live gateway list
  const gateways: LiveGateway[] = GATEWAY_REGISTRY.map(def => {
    if (def.id === 'opay') {
      // Special handling for OPay's legacy separate keys
      const mid = opayData?.find(r => r.key === 'opay_merchant_id')?.value ?? '';
      const pubKey = opayData?.find(r => r.key === 'opay_public_key')?.value ?? '';
      const env = opayData?.find(r => r.key === 'opay_environment')?.value ?? 'sandbox';
      const enabledStr = opayData?.find(r => r.key === 'opay_enabled')?.value;
      const isEnabled = enabledStr === 'true';
      return {
        ...def,
        enabled: isEnabled,
        publicKey: typeof pubKey === 'string' ? pubKey : JSON.stringify(pubKey),
        environment: typeof env === 'string' ? env : 'sandbox',
        callbackUrl: '',
      };
    }

    const row = data?.find(r => r.key === def.kvKey);
    if (!row) {
      return { ...def, enabled: false, publicKey: '', environment: 'test', callbackUrl: '' };
    }

    // config is stored as JSONB — could already be parsed or still a string
    const cfg: Record<string, any> =
      typeof row.value === 'string' ? JSON.parse(row.value) : (row.value ?? {});

    const clientKeyField = CLIENT_KEY_FIELD[def.id] ?? 'publicKey';
    const rawKey = cfg[clientKeyField] ?? '';

    return {
      ...def,
      enabled: cfg.enabled === true,
      publicKey: typeof rawKey === 'string' ? rawKey : String(rawKey),
      environment: cfg.environment ?? 'test',
      callbackUrl: cfg.callbackUrl ?? '',
    };
  });

  /**
   * Returns enabled gateways relevant to a given country, in priority order.
   * Falls back to Stripe + PayPal for unknown countries.
   */
  function getGatewaysForUser(country?: string | null): LiveGateway[] {
    const ids = getGatewaysForCountry(country || 'USA');
    const ordered = ids
      .map(id => gateways.find(g => g.id === id))
      .filter(Boolean) as LiveGateway[];

    // Filter to enabled only; if none are enabled show all matching ones (fallback UX)
    const enabled = ordered.filter(g => g.enabled);
    return enabled.length > 0 ? enabled : ordered;
  }

  return {
    gateways,          // all 14 gateways with live status
    isLoading,
    error,
    getGatewaysForUser,
  };
}
