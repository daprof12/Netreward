-- Migration: Multi-Gateway Payment Support
-- Adds gateway config blobs to kv_settings and seeds payment_gateways rows
-- for all supported gateways across global regions.
-- Created: 2026-05-13

-- ============================================================
-- 1. Seed gateway config blobs into kv_settings
--    Each blob: { enabled, environment, publicKey, secretKey,
--                 webhookSecret, callbackUrl, supportedCurrencies }
--    Defaults: enabled = false (admin must activate each one)
--    OPay remains separately managed via existing keys.
-- ============================================================

INSERT INTO public.kv_settings (key, value, category) VALUES
-- ── Africa ──────────────────────────────────────────────────
('paystack_config', '{
  "enabled": false,
  "environment": "test",
  "publicKey": "",
  "secretKey": "",
  "webhookSecret": "",
  "callbackUrl": "",
  "supportedCurrencies": ["NGN", "GHS", "ZAR", "KES"],
  "countries": ["Nigeria", "Ghana", "South Africa", "Kenya"]
}', 'payments'),

('flutterwave_config', '{
  "enabled": false,
  "environment": "test",
  "publicKey": "",
  "secretKey": "",
  "webhookSecret": "",
  "callbackUrl": "",
  "supportedCurrencies": ["NGN", "GHS", "KES", "UGX", "TZS", "ZAR", "XOF", "XAF"],
  "countries": ["Nigeria", "Ghana", "Kenya", "Uganda", "Tanzania", "South Africa", "Senegal", "Cameroon", "38 more"]
}', 'payments'),

('mtn_momo_config', '{
  "enabled": false,
  "environment": "sandbox",
  "subscriptionKey": "",
  "apiUser": "",
  "apiKey": "",
  "callbackUrl": "",
  "targetEnvironment": "mtnghana",
  "supportedCurrencies": ["GHS", "UGX", "XOF", "RWF", "XAF"],
  "countries": ["Ghana", "Uganda", "Ivory Coast", "Rwanda", "Cameroon"]
}', 'payments'),

-- ── Global / USA / UK / Canada / EU / Australia ──────────────
('stripe_config', '{
  "enabled": false,
  "environment": "test",
  "publicKey": "",
  "secretKey": "",
  "webhookSecret": "",
  "callbackUrl": "",
  "supportedCurrencies": ["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "CHF", "NOK", "SEK", "DKK"],
  "countries": ["USA", "UK", "Canada", "EU", "Australia", "Singapore", "Switzerland", "Norway", "Sweden"]
}', 'payments'),

('paypal_config', '{
  "enabled": false,
  "environment": "sandbox",
  "clientId": "",
  "clientSecret": "",
  "webhookId": "",
  "callbackUrl": "",
  "supportedCurrencies": ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "BRL", "MXN"],
  "countries": ["USA", "UK", "Canada", "EU", "Australia", "Japan", "Brazil", "Mexico", "Global"]
}', 'payments'),

-- ── India ──────────────────────────────────────────────────
('razorpay_config', '{
  "enabled": false,
  "environment": "test",
  "keyId": "",
  "keySecret": "",
  "webhookSecret": "",
  "callbackUrl": "",
  "supportedCurrencies": ["INR"],
  "countries": ["India"]
}', 'payments'),

-- ── Southeast Asia ─────────────────────────────────────────
('xendit_config', '{
  "enabled": false,
  "environment": "test",
  "publicKey": "",
  "secretKey": "",
  "webhookToken": "",
  "callbackUrl": "",
  "supportedCurrencies": ["IDR", "PHP", "MYR", "THB", "VND"],
  "countries": ["Indonesia", "Philippines", "Malaysia", "Thailand", "Vietnam"]
}', 'payments'),

-- ── UAE / MENA ─────────────────────────────────────────────
('checkout_com_config', '{
  "enabled": false,
  "environment": "sandbox",
  "publicKey": "",
  "secretKey": "",
  "webhookSecret": "",
  "callbackUrl": "",
  "supportedCurrencies": ["AED", "SAR", "QAR", "KWD", "BHD", "OMR", "EGP", "JOD", "USD"],
  "countries": ["UAE", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "Egypt", "Jordan"]
}', 'payments'),

-- ── China ─────────────────────────────────────────────────
('alipay_config', '{
  "enabled": false,
  "environment": "sandbox",
  "appId": "",
  "privateKey": "",
  "publicKey": "",
  "callbackUrl": "",
  "supportedCurrencies": ["CNY", "HKD", "USD", "EUR", "GBP", "JPY", "SGD"],
  "countries": ["China", "Hong Kong", "Macau", "Singapore", "Cross-border"]
}', 'payments'),

-- ── South Korea ────────────────────────────────────────────
('toss_config', '{
  "enabled": false,
  "environment": "test",
  "clientKey": "",
  "secretKey": "",
  "callbackUrl": "",
  "supportedCurrencies": ["KRW"],
  "countries": ["South Korea"]
}', 'payments'),

-- ── Japan ─────────────────────────────────────────────────
('paidy_config', '{
  "enabled": false,
  "environment": "test",
  "publicKey": "",
  "secretKey": "",
  "callbackUrl": "",
  "supportedCurrencies": ["JPY"],
  "countries": ["Japan"]
}', 'payments'),

-- ── Brazil / Argentina / LATAM ────────────────────────────
('mercadopago_config', '{
  "enabled": false,
  "environment": "test",
  "accessToken": "",
  "publicKey": "",
  "webhookSecret": "",
  "callbackUrl": "",
  "supportedCurrencies": ["BRL", "ARS", "MXN", "CLP", "COP", "PEN", "UYU"],
  "countries": ["Brazil", "Argentina", "Mexico", "Colombia", "Chile", "Peru", "Uruguay"]
}', 'payments'),

-- ── Canada (Interac) ───────────────────────────────────────
('interac_config', '{
  "enabled": false,
  "environment": "test",
  "merchantId": "",
  "apiKey": "",
  "callbackUrl": "",
  "supportedCurrencies": ["CAD"],
  "countries": ["Canada"]
}', 'payments')

ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. Seed payment_gateways table rows for each gateway
--    (powers the existing gateways list UI in AdminPayments)
-- ============================================================

INSERT INTO public.payment_gateways (name, gateway_type, status, fees, description, country) VALUES
-- Africa
('Paystack',      'Fiat On-Ramp', 'coming_soon', '1.5% + ₦100 cap',    'Leading African payment gateway. Cards, bank transfer, USSD, mobile money.',          'Nigeria / Ghana / SA / Kenya'),
('Flutterwave',   'Fiat On-Ramp', 'coming_soon', '1.4%',                'Pan-African gateway supporting 35+ countries and 30+ currencies via hosted checkout.', 'Africa (35+ countries)'),
('MTN MoMo',      'Mobile Money', 'coming_soon', '0.5%',                'MTN Mobile Money — async USSD RequestToPay for West & East Africa.',                  'Ghana / Uganda / Ivory Coast'),
-- Global
('Stripe',        'Fiat On-Ramp', 'coming_soon', '2.9% + $0.30',        'Global card payments. Supports 135+ currencies. Hosted Checkout Session.',             'USA / UK / Canada / EU / AU'),
('PayPal',        'Fiat On-Ramp', 'coming_soon', '3.49% + fixed fee',   'World''s largest digital wallet. Available in 200+ countries.',                        'Global'),
-- Asia
('Razorpay',      'Fiat On-Ramp', 'coming_soon', '2%',                  'India''s leading payment gateway. Cards, UPI, net banking, wallets.',                  'India'),
('Xendit',        'Fiat On-Ramp', 'coming_soon', '2%',                  'Southeast Asia''s top gateway. VA, QRIS, GCash, e-wallets.',                           'Indonesia / Philippines / Malaysia'),
('Alipay+',       'Fiat On-Ramp', 'coming_soon', '0.55%',               'China cross-border payments via Alipay Global and Alipay+ network.',                   'China / Hong Kong / Singapore'),
('Toss Payments', 'Fiat On-Ramp', 'coming_soon', '3.3%',                'South Korea''s leading fintech. Cards, KakaoPay, Naver Pay, bank transfer.',           'South Korea'),
('Paidy',         'Fiat On-Ramp', 'coming_soon', '3%',                  'Japan''s leading BNPL and checkout solution for JPY payments.',                         'Japan'),
-- MENA
('Checkout.com',  'Fiat On-Ramp', 'coming_soon', '2.9%',                'MENA & global gateway. Accepts local payment methods for UAE, KSA, Qatar etc.',        'UAE / Saudi Arabia / MENA'),
-- LATAM
('Mercado Pago',  'Fiat On-Ramp', 'coming_soon', '4.99%',               'Latin America''s dominant payment platform. PIX, cards, OXXO, PSE.',                   'Brazil / Argentina / LATAM'),
-- Canada
('Interac',       'Fiat On-Ramp', 'coming_soon', '$1.50 flat',          'Canada''s national e-Transfer network. Instant CAD bank transfers.',                    'Canada')

ON CONFLICT DO NOTHING;
