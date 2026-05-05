# NetReward (NRT) — Software Requirements Specification (SRS)

> **Version:** 2.1 | **Date:** 2026-05-01 | **Status:** Active Development

---

## 1. Introduction

### 1.1 Purpose
This SRS defines the complete software requirements for NetReward — a blockchain-powered data-rewards platform. It covers functional behavior, system interfaces, data models, security, and compliance requirements for all user types: User, SP, ISP, and Admin.

### 1.2 Current Implementation State
The frontend PWA shell is **complete**, including the Phase 8 Scan2Pay state machine and SP-side test generation tools. The **Data Persistence & Off-Ramp phase is also complete** — fiat withdrawals, support tickets, referrals, P2P disputes, and profile/settings management are all now database-driven with real Supabase hooks. The next phase focuses on the Tracking & Reward Engine (device registration, SDK pipeline, NRT reward calculation).

### 1.3 Tech Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend (Web/PWA) | Vite 8 + React 19 + TypeScript 6 | ✅ Active |
| Styling | Tailwind CSS v4 | ✅ Active |
| Animations | Framer Motion 12 | ✅ Active |
| State (client) | Zustand 5 | ✅ Active (mock) |
| State (server) | TanStack Query v5 | ✅ Installed |
| Auth | Supabase Auth + Admin Gate | ✅ Implemented |
| Database | PostgreSQL (Supabase) | ✅ Schema through migration 00032 |
| Blockchain | Solana (SPL Token / Token-2022) | ✅ Adapter installed |
| Real-time | Supabase Realtime + WebSocket | 🔜 Backend needed |
| API | Supabase Edge Functions (Deno) | ✅ Tracking API deployed (`supabase/functions/tracking/`) |
| Cache | Redis | 🔜 Backend needed |
| Mobile | React Native + Expo | 🔜 Phase 5 |
| Extension | Chrome Manifest V3 | 🔜 Phase 5 |

---

## 2. System Architecture

### 2.1 Current (Frontend-Only) Architecture
```
Browser (Vite PWA)
  └── React Router v7 (routes by role)
  └── Zustand Stores (mock data: admin, auth, p2p, sp, isp, wallet)
  └── Supabase Client (supabase.ts) — connected but not fully integrated
  └── Solana Wallet Adapter — lazy-loaded (error boundary wrapped)
  └── Framer Motion — UI animations
```

### 2.2 Target Full Architecture
```
Client Layer (PWA / Mobile / Extension)
    │ HTTPS / WSS
API Gateway (Cloudflare + Nginx)
    │
Application Layer
  ├── REST API (Node.js/Express)
  ├── WebSocket Server (Socket.IO)
  ├── Reward Engine Microservice
  ├── NHS Calculation Service
  └── Notification Service
    │
Data Layer
  ├── Supabase (PostgreSQL + Auth + RLS + Realtime)
  ├── Redis (cache + rate limiting + job queues)
  └── Supabase Storage (KYC docs, logos)
    │
Blockchain Layer
  ├── Solana RPC (token mint, transfers, escrow)
  └── Chainlink Oracles (price feeds)
```

---

## 3. User Roles & Process Flows

### 3.1 Role Definitions

| Role | Description | Access Level |
|------|-------------|-------------|
| `user` | General internet user earning NRT from data consumption | Mobile app, wallet, campaigns, P2P |
| `sp` | Service Provider (Netflix, Spotify, etc.) running reward campaigns | SP dashboard, campaign/service CRUD |
| `isp` | Internet Service Provider hosting NRT network | ISP dashboard, network/campaign CRUD |
| `admin` | Platform administrator | Full system access |

### 3.2 Authentication Flow

```
1. User visits app → Onboarding check (localStorage)
2. Not onboarded → 3-step onboarding → Auth screen
3. Auth screen → Login/Register + Role selection (user/sp/isp)
4. Submit → Supabase Auth → JWT issued → Role stored
5. Role determines access:
   - admin → Access ONLY via /admin/login gate
   - user/sp/isp → Access via /login gate
6. Home redirection based on role:
   - user → UserHome
   - sp   → SpDashboard (KYC required for full features)
   - isp  → IspDashboard (KYC required for full features)
7. KYC Gate for SP/ISP:
   - Status: pending → Show "Review in Progress"
   - Status: rejected → Show "Resubmit Required"
   - Status: none → Show "Setup/Verification Required"
8. Logout → LogoutConfirmModal → Redirect to appropriate gate (/ or /admin/login)
```

### 3.3 General User Flow
```
Register → Onboarding → Dashboard (stats, campaigns)
  ├── Campaigns → Browse → Join → Track earnings per device
  ├── Devices → Add device → View per-app data breakdown
  ├── Wallet → Balance → History → Deposit (P2P/Exchanger) → Withdraw
  │     └── Scan2Pay → Scan QR → Pay SP merchant in NRT
  ├── P2P → Browse offers → Buy/Sell flow → Escrow → Payment proof → Release
  │     ├── My Offers → Edit active listings, close offers
  │     └── Review System → Rate seller/buyer post-trade
  └── Settings → Profile → KYC → Security → Support
```

### 3.4 Service Provider (SP) Flow
```
Register as SP → KYC (business info + docs + logo)
  ├── Create Service (Registration)
  │     Fields: name, logo, category, description
  │             webUrl, webDomain (e.g. netflix.com)
  │             androidPlayStoreUrl, androidPackage (e.g. com.netflix.mediaclient)
  │             iosAppStoreUrl, iosBundleId (e.g. com.netflix.Netflix)
  │             webhookUrl (SP's endpoint for receiving NRT events)
  │     → Server generates: apiKey (sp_live_xxx), secretKey
  │     → Verification: ping webhook, check Play/App Store listings
  │     → Status: pending_verification → active
  │     → credentials card displayed once: apiKey + secretKey + webhookSecret
  ├── Integrate SDK into SP app (mandatory before campaign live)
  │     npm install @netreward/tracker
  │     nrt.init({ apiKey, campaignId })
  │     nrt.identifyUser({ nrtUserId })
  │     nrt.trackDataUsage({ bytes }) / nrt.trackSession({ ... })
  ├── Fund Campaign
  │     → SP deposits NRT into campaign escrow
  │     → Campaign goes 'active' once funded
  │     → Auto-pauses when budget exhausted
  ├── Create Campaign → Link service → Set budget, dates, demographics
  ├── Dashboard → Analytics:
  │     - NRT Distributed (total rewarded via SP's campaigns)
  │     - Active Campaigns
  │     - Users Reached (distinct)
  │     - Revenue (10% spShare auto-credited per reward event)
  │     - Charts: Campaigns / Checkout / Cashback (24H/7D/3M/All)
  ├── Receive Webhook Events from NetReward:
  │     POST to SP's webhookUrl: { event: 'reward.distributed', userId, nrtAmount }
  └── Wallet → Earnings (10% share) → Withdraw (NRT → fiat)
```

### 3.5 ISP Flow
```
Register as ISP → KYC (ISP info + license + docs)
  ├── Create Network (Registration)
  │     Fields: name, logo, category
  │             country (ISO 3166-1 alpha-2)
  │             asn (e.g. AS6453 — Tata Communications)
  │             ipRanges (CIDR blocks: ["197.210.0.0/16", ...])
  │             handshakeUrl (ISP's verification endpoint)
  │             webhookUrl (ISP receives data flow summaries)
  │     → Server generates: apiKey, secretKey
  │     → Handshake: NetReward POSTs challenge → ISP responds with ASN proof
  │     → BGP validation: ASN + IP ranges confirmed via RIPE/ARIN
  │     → Status: pending_verification → active
  │     → credentials card displayed once
  ├── Passive Revenue (no action needed after registration):
  │     - User device IP matched against registered ip_ranges
  │     - 5% ispShare auto-credited to ISP wallet per reward event
  ├── Active Integration (enterprise ISPs):
  │     POST /api/v1/tracking/isp-report
  │     { networkId, userId, dataBytes, appBreakdown[] }
  │     → ISP data cross-validates SDK reports (ISP = ground truth)
  ├── Create Campaign → Link network → Set budget, bonus reward rate
  │     → Users on ISP's network earn bonus NRT from ISP campaign
  ├── Dashboard → Analytics:
  │     - NRT Distributed (total over ISP's network)
  │     - Customers (distinct NRT subscribers)
  │     - Active Campaigns
  │     - Earnings / Balance (5% cashback)
  │     - Network signal quality (0–100%)
  │     - Charts: Campaigns / Cashback / Network (24H/7D/3M/All)
  └── Wallet → Earnings (5% cashback) → Withdraw (NRT → fiat)
```

### 3.6 Admin Flow
```
Admin login → Admin Dashboard (sidebar layout)
  ├── Users → View/Edit/Suspend all users (country filter)
  ├── KYC → Review queue → View documents → Approve/Reject
  ├── Transactions → All ledger entries (country/type/status filter)
  ├── P2P → Offers + Trades + Payment methods + Dispute resolution (chat)
  ├── Campaigns / Services / Networks / Devices → CRUD + filters
  ├── Wallets → Balance, freeze/unfreeze
  ├── Exchangers → CRUD with status + badges
  ├── Payment Gateway → Country-sorted CRUD
  ├── Referrals / Earnings / Checkout → View + filter
  ├── Config → Rewards & Fees (tabbed) / Token Config / API Endpoints
  ├── Support → Ticket management + admin replies
  ├── CRM → Notifications management
  └── System → Health / Rate Limits / Security / Maintenance / Emergency / Backup
```

### 3.7 Admin ↔ User Type Relationships

| Admin Action | Affects |
|-------------|---------|
| KYC approve/reject | Changes user KYC status, triggers role unlock |
| User suspend | Blocks login for all role types |
| Token freeze | Halts all NRT transactions globally |
| Reward rate update | Changes NRT earned per GB for all campaigns |
| Processing fee update | Applies to P2P, checkout, withdrawal, deposit |
| Gateway enable/disable | Affects deposit/withdrawal options by country |
| Campaign approve | Makes SP/ISP campaign visible to users |
| Dispute resolution | Releases or reverses P2P escrow |
| Exchanger verify | Adds exchanger to user-facing buy/sell screen |

---

## 4. Functional Requirements

### 4.1 Authentication (FR-AUTH)

**FR-AUTH-001 Registration**
- Input: email, password (≥8 chars), display name, role
- Supabase Auth creates user → public.users row created
- Role stored in `raw_user_meta_data` + `public.users.role`
- Output: JWT access + refresh token

**FR-AUTH-002 Login**
- Email + password via Supabase Auth
- Lockout: 5 failed → 15min, 10 failed → 1hr
- Output: JWT pair + role

**FR-AUTH-003 Session Management**
- Access token TTL: 15 min (Supabase default: 1hr → configure)
- Refresh token TTL: 7 days
- Auto-logout: 30 min inactivity
- Logout: confirmation modal → clear Zustand + localStorage

**FR-AUTH-004 KYC**
- Standard (User): government ID + selfie
- Business (SP): name, website, business email (must match domain), phone, address, logo, biz registration doc
- Business (ISP): all SP fields + ISP license document
- Status: pending → in_review → verified | rejected
- Admin reviews in KYC tab with full document preview

### 4.2 Wallet & Payments (FR-WAL)

**FR-WAL-001 Internal Ledger**
- NRT balance stored in `public.wallets.nrt_balance`
- All mutations via `public.transactions` ledger

**FR-WAL-002 Scan2Pay**
- User opens Scan2Pay → camera scans SP QR code
- QR decoded: merchant ID + amount
- Confirmation modal with NRT + fiat equivalent
- On confirm: deduct wallet, credit SP, create transaction record
- Settlement: Solana SPL transfer (on-chain) or internal ledger

**FR-WAL-003 P2P Trading**
- Steps: Browse offers → Select → Enter amount → Escrow lock → Pay seller (off-chain) → Upload proof → Release
- Countdown timer: 15 min for NRT release; auto-dispute on timeout
- Dispute: buyer/seller reports → captured as system record → admin mediates in real-time chat
- Escrow: held in smart contract (simulated in mock store) until confirmed release or admin resolution
- Feedback: Post-trade rating and review system for seller trust metrics
- Management: User can edit or close their own active offers from 'My Offers' view

**FR-WAL-004 Deposit Methods**
- P2P marketplace (internal)
- Instant purchase (Paystack/Stripe)
- Verified exchanger (external link)
- Direct wallet address (Solana)

**FR-WAL-005 Withdrawal**
- Pre-conditions: KYC verified, min 10 NRT
- Fee: configurable (admin sets flat or %)
- Process: NRT burned on-chain → fiat sent via payment gateway

### 4.3 NHS Calculation (FR-NHS)

**Network Health Score** drives the NRT reward multiplier.

**Inputs & Weights:**
| Factor | Weight |
|--------|--------|
| ISP Data Flow | 20% |
| Market Demand (campaign budgets) | 20% |
| SP/ISP NRT Purchase Rate | 15% |
| User Engagement | 15% |
| Investor Backing | 10% |
| Online Payment Fee Volume | 10% |
| Data Consumption Rate | 10% |

**Formula:**
```
NHS = Σ(normalized_input[i] × weight[i])  // 0–100 scale
nhsMultiplier = 1 + tanh((NHS - 50) / 20) × 0.5  // 0.75 – 1.25×
NRT_Earned = dataGB × baseRate × nhsMultiplier × campaignBonus
```
Recalculated every 5 minutes via BullMQ cron job.

### 4.4 NRT Token Price Algorithm (FR-PRICE)

**Price Oracle Composite:**
```
NRT_Price = BasePrice × (1 + Σ(weight[i] × signal[i]))

Signals:
  campaignDemand     = new_campaign_budget_24h / avg_budget
  exchangerVolume    = p2p_volume_24h / baseline_volume
  dataConsumption    = data_consumed_24h / baseline_data
  p2pActivity        = trade_count_24h / baseline_trades
  investorFund       = treasury_inflow_24h / baseline_inflow

Weights: [30%, 25%, 20%, 15%, 10%]
```
Updated every 1 minute. Stored in Redis with 1-min TTL. Broadcast via WebSocket `token:price_update`.

---

## 5. Database Schema (Extended)

### 5.1 Current Tables (Supabase — Migrations 00000–00029)
```sql
public.users           -- core user profiles + role + phone + referral_code + referred_by
public.wallets         -- NRT balance + Solana address
public.sp_profiles     -- SP company info
public.isp_profiles    -- ISP name + NHS score
public.campaigns       -- campaign definitions
public.user_campaigns  -- user enrollments + data consumed
public.transactions    -- ledger of all wallet movements
public.services        -- SP service registrations
public.networks        -- ISP network registrations
public.kyc_submissions -- KYC document storage
public.support_tickets -- user support tickets (migration 00028)
public.ticket_messages -- support ticket replies (migration 00028)
public.referrals       -- referral tracking with NRT rewards (migration 00028)
public.p2p_disputes    -- P2P trade disputes (migration 00029)
public.dispute_messages-- dispute chat messages (migration 00029)
public.platform_banks  -- admin-managed banks per country (migration 00026)
public.user_payment_methods -- user linked bank accounts (migration 00026)
public.withdrawal_requests  -- fiat withdrawal pipeline (migration 00026)
public.devices         -- user device registration (migration 00020)
public.device_data_sessions -- per-device data tracking (migration 00020)
public.country_tax_rates    -- tax rates by country (migration 00010)
public.tax_deductions       -- tax deduction ledger (migration 00010)
public.campaign_daily_stats -- analytics aggregation (migration 00019)
public.isp_network_stats    -- ISP analytics (migration 00019)
public.notifications        -- system notifications (migration 00016)
public.notification_preferences -- user notification prefs (migration 00017)
public.activity_logs        -- audit logging (migration 00009)
```

#### Reward Engine Functions (migration 00030)
```sql
-- process_tracking_report(p_device_id, p_campaign_id, ...) → JSONB
-- claim_all_rewards(p_user_id) → JSONB
-- get_user_dashboard_stats(p_user_id) → JSONB
-- get_sp_dashboard_stats(p_sp_profile_id) → JSONB
-- get_isp_dashboard_stats(p_isp_profile_id) → JSONB
```

#### New columns (migrations 00030-00031)
```sql
wallets.unclaimed_nrt        -- pending reward balance
transactions.status           -- completed/pending/failed
transaction_type enum += 'referral_bonus', 'cashback'
```

### 5.2 Required New Tables
```sql
-- KYC Documents
CREATE TABLE kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  id_type TEXT, id_number TEXT,
  front_url TEXT, back_url TEXT, selfie_url TEXT,
  business_name TEXT, website TEXT, business_email TEXT,
  phone TEXT, address TEXT, logo_url TEXT,
  biz_reg_url TEXT, isp_license_url TEXT,
  status TEXT DEFAULT 'pending', -- pending|in_review|verified|rejected
  reviewed_by UUID REFERENCES public.users(id),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Devices
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, type TEXT NOT NULL,
  mac_address TEXT, fingerprint TEXT,
  is_active BOOLEAN DEFAULT true, last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- KYC Submissions
CREATE TABLE kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  target_role TEXT NOT NULL, -- user|sp|isp
  selfie_url TEXT NOT NULL,
  id_doc_url TEXT NOT NULL,
  business_name TEXT,
  website TEXT,
  business_email TEXT,
  phone_number TEXT,
  business_address TEXT,
  biz_reg_url TEXT,
  logo_url TEXT,
  isp_license_url TEXT,
  status TEXT DEFAULT 'pending', -- pending|approved|rejected
  admin_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Data Usage Logs
CREATE TABLE data_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id),
  user_id UUID REFERENCES public.users(id),
  campaign_id UUID REFERENCES public.campaigns(id),
  app_name TEXT, app_icon_url TEXT,
  data_foreground BIGINT DEFAULT 0,
  data_background BIGINT DEFAULT 0,
  nrt_earned NUMERIC(18,9) DEFAULT 0,
  isp_name TEXT, duration_seconds INT,
  claimed_status TEXT DEFAULT 'unclaimed',
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- P2P Offers
CREATE TABLE p2p_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  type TEXT NOT NULL CHECK (type IN ('buy','sell')),
  nrt_amount NUMERIC(18,6) NOT NULL,
  price_per_nrt NUMERIC(10,6) NOT NULL,
  min_limit NUMERIC(18,6), max_limit NUMERIC(18,6),
  payment_methods TEXT[],
  status TEXT DEFAULT 'active',
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- P2P Trades
CREATE TABLE p2p_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES p2p_offers(id),
  buyer_id UUID REFERENCES public.users(id),
  seller_id UUID REFERENCES public.users(id),
  nrt_amount NUMERIC(18,6) NOT NULL,
  fiat_amount NUMERIC(10,2),
  payment_method TEXT,
  status TEXT DEFAULT 'pending', -- pending|paid|completed|disputed|cancelled
  proof_url TEXT,
  escrow_signature TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- P2P Disputes
CREATE TABLE p2p_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES p2p_trades(id),
  raised_by UUID REFERENCES public.users(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open|resolved|escalated
  admin_id UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dispute Messages
CREATE TABLE dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES p2p_disputes(id),
  sender_id UUID REFERENCES public.users(id),
  message TEXT NOT NULL,
  target TEXT DEFAULT 'both', -- buyer|seller|both
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Accounts
CREATE TABLE payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  type TEXT, -- bank|mobile_money|fintech
  provider TEXT, account_name TEXT, account_number TEXT,
  country TEXT, is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Support Tickets
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  subject TEXT NOT NULL, category TEXT, priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket Messages
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id),
  sender_id UUID REFERENCES public.users(id),
  message TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
);

-- NHS History
CREATE TABLE nhs_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score NUMERIC(5,2) NOT NULL,
  inputs JSONB NOT NULL,
  nrt_per_gb NUMERIC(18,8),
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- Activity Logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL, resource TEXT,
  details JSONB, ip_address INET, user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id), -- null = broadcast
  title TEXT NOT NULL, body TEXT, type TEXT,
  channels TEXT[], is_read BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMPTZ, sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- App Settings
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Exchangers
CREATE TABLE exchangers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, email TEXT, country TEXT,
  volume_24h NUMERIC(18,2), rating NUMERIC(3,2),
  trading_limit NUMERIC(18,2),
  status TEXT DEFAULT 'pending',
  url TEXT, logo TEXT, description TEXT,
  badge TEXT, badge_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Gateways
CREATE TABLE payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, type TEXT, country TEXT,
  status TEXT DEFAULT 'coming_soon',
  fees TEXT, description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Referrals
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES public.users(id),
  referred_id UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'pending',
  nrt_reward NUMERIC(18,6) DEFAULT 0,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. API Specification

### 6.1 REST Endpoints

#### Authentication
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/verify-2fa
```

#### Users & KYC
```
GET    /api/v1/users/me
PUT    /api/v1/users/me
POST   /api/v1/users/me/kyc              # Submit KYC docs
GET    /api/v1/users/me/kyc              # Get KYC status
GET    /api/v1/users/me/devices
POST   /api/v1/users/me/devices
DELETE /api/v1/users/me/devices/:id
GET    /api/v1/users/me/referrals
```

#### Dashboard
```
GET    /api/v1/dashboard/stats           # Role-aware stats
GET    /api/v1/dashboard/earnings        # Earnings list
GET    /api/v1/dashboard/charts          # Chart data (time filter)
```

#### Campaigns
```
GET    /api/v1/campaigns                 # List (filters: status, country, type)
GET    /api/v1/campaigns/:id
POST   /api/v1/campaigns                 # Create (SP/ISP)
PUT    /api/v1/campaigns/:id
DELETE /api/v1/campaigns/:id
POST   /api/v1/campaigns/:id/join
GET    /api/v1/campaigns/:id/analytics
```

#### Wallet
```
GET    /api/v1/wallet/balance
GET    /api/v1/wallet/transactions
POST   /api/v1/wallet/withdraw
POST   /api/v1/wallet/deposit
POST   /api/v1/wallet/pay               # Scan2Pay
GET    /api/v1/wallet/address           # Solana address
```

#### P2P
```
GET    /api/v1/p2p/offers               # List offers (type, country, amount)
POST   /api/v1/p2p/offers               # Create offer
PUT    /api/v1/p2p/offers/:id
DELETE /api/v1/p2p/offers/:id
POST   /api/v1/p2p/trades               # Initiate trade from offer
GET    /api/v1/p2p/trades/:id
POST   /api/v1/p2p/trades/:id/confirm-payment
POST   /api/v1/p2p/trades/:id/release
POST   /api/v1/p2p/trades/:id/dispute
GET    /api/v1/p2p/payment-accounts
POST   /api/v1/p2p/payment-accounts
DELETE /api/v1/p2p/payment-accounts/:id
```

#### Services (SP)
```
GET    /api/v1/services
POST   /api/v1/services                 # Register service
PUT    /api/v1/services/:id
GET    /api/v1/services/:id/tracking    # SDK integration info
```

#### Support
```
GET    /api/v1/support/tickets
POST   /api/v1/support/tickets
GET    /api/v1/support/tickets/:id
POST   /api/v1/support/tickets/:id/messages
PUT    /api/v1/support/tickets/:id/status
```

#### Token & NHS
```
GET    /api/v1/token/info
GET    /api/v1/token/price              # Current NRT price
GET    /api/v1/nhs/current
GET    /api/v1/nhs/history
```

#### Admin
```
GET    /api/v1/admin/users
PUT    /api/v1/admin/users/:id
DELETE /api/v1/admin/users/:id
GET    /api/v1/admin/kyc                # Pending KYC list
PUT    /api/v1/admin/kyc/:id            # Approve/reject
GET    /api/v1/admin/transactions
GET    /api/v1/admin/campaigns
GET    /api/v1/admin/p2p/offers
GET    /api/v1/admin/p2p/trades
GET    /api/v1/admin/p2p/disputes
PUT    /api/v1/admin/p2p/disputes/:id
POST   /api/v1/admin/p2p/disputes/:id/messages
GET    /api/v1/admin/wallets
PUT    /api/v1/admin/wallets/:id        # Freeze/unfreeze
GET    /api/v1/admin/exchangers
POST   /api/v1/admin/exchangers
PUT    /api/v1/admin/exchangers/:id
DELETE /api/v1/admin/exchangers/:id
GET    /api/v1/admin/gateways
POST   /api/v1/admin/gateways
PUT    /api/v1/admin/gateways/:id
DELETE /api/v1/admin/gateways/:id
GET    /api/v1/admin/settings
PUT    /api/v1/admin/settings/rewards   # NRT rate, cashback %
PUT    /api/v1/admin/settings/fees      # Processing fees
PUT    /api/v1/admin/settings/token     # Token config + freeze
POST   /api/v1/admin/notifications      # Send notification
GET    /api/v1/admin/security/logs
POST   /api/v1/admin/maintenance        # Toggle maintenance
```

### 6.2 WebSocket Events

```typescript
// Client → Server
'subscribe:dashboard'        // Real-time stats
'subscribe:earnings'         // New earnings stream
'subscribe:nhs'              // NHS score updates
'subscribe:token_price'      // NRT price updates
'subscribe:p2p_trade'        // P2P trade status
'subscribe:notifications'    // User notifications

// Server → Client
'dashboard:stats_update'     // Updated stats object
'earnings:new'               // { nrt, app, campaign, timestamp }
'nhs:update'                 // { score, multiplier, timestamp }
'token:price_update'         // { price, change24h, timestamp }
'p2p:trade_status'           // { tradeId, status, message }
'notification:new'           // { title, body, type }
'device:status_change'       // { deviceId, isActive }
```

### 6.3 Scan2Pay Flow (Full State Machine)

#### Transaction States
```
INITIATED → VALIDATING → PROCESSING → CONFIRMING → SUCCESS
                ↓              ↓
             FAILED         FAILED
               ↓
            CANCELLED (user cancels before confirm)
               ↓
            TIMEOUT (QR expired > 5 min or payment window elapsed)
            REFUNDED (on-chain success but SP credit failed → auto-refund)
```

#### Detailed Step Flow

```
Step 1 — QR Generation (SP side)
  SP app calls: POST /api/v1/scan2pay/generate
  Body: { merchantId, amountNRT, description, expiresIn: 300 }  // 5-min TTL
  Returns: { qrPayload, qrImageUrl, ref, expiresAt }
  QR payload: JWT-signed { merchantId, amount, ref, exp }

Step 2 — Scan & Decode (User side)
  ScanToPay.tsx → camera → jsQR decode → verify JWT signature
  → GET /api/v1/scan2pay/decode?token=<payload>
  Server validates: signature ✓, not expired ✓, merchant active ✓
  Returns: { merchant, amount, logoUrl, description, ref }
  Failure: { code: 'QR_EXPIRED' | 'INVALID_QR' | 'MERCHANT_INACTIVE' }
  UI: show FAILED screen with error message

Step 3 — User Confirmation
  User sees: merchant name, amount NRT, fiat equivalent, description
  → Confirm button OR Cancel button
  Cancel → status: CANCELLED → return to wallet (no charge)
  Confirm → Step 4

Step 4 — Payment Processing
  POST /api/v1/wallet/pay
  Body: { merchantId, amountNRT, ref, pin (hashed), deviceId }
  Server checks (VALIDATING state):
    □ PIN correct
    □ Balance ≥ amountNRT + fee
    □ Ref not already used (idempotency key)
    □ Merchant wallet active
    □ Token not frozen
  Any failure → status: FAILED, reason returned, balance unchanged

  Deduct & Credit (PROCESSING state):
    BEGIN DB TRANSACTION
      UPDATE wallets SET nrt_balance -= amount WHERE user_id = ?
      UPDATE wallets SET nrt_balance += amount WHERE user_id = merchant_id
      INSERT INTO transactions (type='scan2pay', status='processing') ...
    COMMIT → status: PROCESSING

Step 5 — On-Chain Confirmation (CONFIRMING state)
  If amount > on_chain_threshold (admin-configured, default 50 NRT):
    → Blockchain service: SPL token transfer user_wallet → merchant_wallet
    → Wait for Solana confirmation (1-2 blocks, ~800ms)
    → success: update tx.blockchain_signature, status → SUCCESS
    → rpc_error: trigger REFUND flow (reverse DB debit/credit)
  If amount ≤ threshold:
    → Internal ledger only, skip on-chain
    → status → SUCCESS immediately

Step 6 — Response States

SUCCESS:
  { status: 'success', txId, amountNRT, merchantName,
    onChainSig?, timestamp, receiptUrl }
  UI: success screen with checkmark animation + "View Receipt" button

FAILED (validation):
  { status: 'failed', code: 'INSUFFICIENT_BALANCE'|'INVALID_PIN'|
    'MERCHANT_INACTIVE'|'TOKEN_FROZEN'|'DUPLICATE_REF'|'KYC_REQUIRED',
    message: human-readable, balanceNRT: current }
  UI: red error screen with specific message + "Try Again" button

FAILED (on-chain):
  { status: 'failed', code: 'BLOCKCHAIN_ERROR', message,
    refundStatus: 'auto_refunded' }
  UI: error screen "Payment failed — your NRT has been refunded"

PENDING (rare edge case — Solana RPC timeout):
  { status: 'pending', txId, message: 'Confirming on blockchain...' }
  UI: spinner with "Please wait, confirming payment..."
  Webhook: when confirmed → push notification to user + SP

CANCELLED:
  { status: 'cancelled', message: 'Payment cancelled by user' }
  UI: back to scan screen or previous page

TIMEOUT:
  { status: 'timeout', code: 'QR_EXPIRED' | 'SESSION_EXPIRED' }
  UI: "QR code has expired, ask merchant to regenerate"

REFUNDED:
  { status: 'refunded', message: 'Transaction failed on-chain, NRT returned to wallet' }
  UI: info screen with direct link to wallet history
```

#### Idempotency & Safety
- Each QR `ref` is a UUID used as idempotency key (stored in Redis 24hr)
- Duplicate `ref` within 24hr → reject with `DUPLICATE_REF`
- DB transaction wraps debit + credit atomically → no partial state
- On-chain failure always triggers automatic refund to user wallet
- All scan2pay transactions logged in `transactions` table with `scan2pay_ref` field

#### WebSocket Events (Real-time status push)
```
Server → Client:
  'scan2pay:status' → { txId, status, timestamp }
  'scan2pay:confirmed' → { txId, onChainSig, merchantName, amountNRT }
  'scan2pay:failed' → { txId, code, message, refundStatus? }
```

### 6.4 SP Platform Checkout Integration

To enable swift checkouts on SP platforms (Web, Android, iOS), NetReward provides multiple integration paths tailored to the environment.

#### 6.4.1 Web/Desktop Integration (QR Code Flow)
1.  **Session Initiation**: SP backend calls `POST /api/v1/scan2pay/generate` with order details.
2.  **Display QR**: SP frontend displays the returned `qrImageUrl` or uses `qrPayload` to render a custom QR code.
3.  **Polling/WebSocket**: SP frontend subscribes to `scan2pay:status` for that `ref` or polls the status endpoint.
4.  **Completion**: When the user pays via the NetReward app, the SP frontend receives the `SUCCESS` state and redirects the user to the order confirmation page.

#### 6.4.2 Mobile Integration (Deep-Linking Flow)
For SP mobile apps, users can "Pay with NRT" without needing to scan a physical screen.
1.  **Deep-Link Creation**: SP app generates a NetReward deep-link:
    `netreward://checkout?payload=<JWT_signed_checkout_data>`
2.  **App Switch**: User taps "Pay with NRT" → SP app opens NetReward app via deep-link.
3.  **Authentication**: NetReward app opens directly to the confirmation screen for that specific payload.
4.  **Redirect Back**: Upon payment success/failure, NetReward app deep-links back to the SP app:
    `sp-app://nrt-payment-callback?status=success&txId=...&ref=...`

#### 6.4.3 Payment Success Webhooks
Crucial for backend-to-backend confirmation and service unlocking.
```json
// POST https://sp-webhook-url/payments
{
  "event": "payment.scan2pay.success",
  "data": {
    "txId": "txn_892347",
    "ref": "order_uuid_123",
    "merchantId": "sp_uuid_456",
    "userId": "user_uuid_789",
    "amountNRT": "12.5",
    "currency": "NRT",
    "timestamp": "2026-04-28T16:40:00Z",
    "onChainSig": "sol_sig_abc..."
  },
  "signature": "hmac_sha256_hash"
}
```
*Verification*: SP must verify the `signature` using their `webhookSecret` provided during service registration.

#### 6.4.4 Frontend Implementation Status

**SP Settings → Payment API Hub (✅ Implemented)**
- **Not Integrated State**: 3-step setup wizard:
  1. Configure webhook endpoint URL
  2. Test connection (simulated ping with loading state)
  3. Generate API keys + webhook secret (displayed with copy-to-clipboard)
- **Integrated State**: Dashboard showing API key, webhook secret, webhook URL, total volume (NRT), and transaction count.
- State persisted via `PaymentIntegration` in `useSpStore` (Zustand + localStorage).

**Admin → Payment Gateway → Checkout Integrations Tab (✅ Implemented)**
- Third tab in `AdminPayments.tsx` showing all SPs with active Payment API integrations.
- Stats cards: Active Integrations count, Total Volume (NRT), Total Transactions.
- Filters: Search, Country, Status (active/pending/suspended), Category.
- Actions: Suspend/reactivate, delete integration.
- Data model: `CheckoutIntegration` in `useAdminStore`.

---

## 6.5 SP Data Usage Monitoring Architecture

### The Core Problem
When a user installs the NetReward app, we need to accurately measure how much data they consumed specifically on **SP-registered apps or platforms** tied to active campaigns — even when the NetReward app is:
- Minimized to background
- Screen off
- Running alongside other apps
- App killed (Android only, via background service)

### Monitoring Approach by Platform

#### Android — Preferred Platform (Full Access)
```
Method 1: UsageStatsManager API
  - Permission: PACKAGE_USAGE_STATS (special, must be granted in settings)
  - Gives per-app foreground time, last used timestamp
  - Polled every 5 minutes by our background service

Method 2: TrafficStats API  
  - No special permission required
  - Provides per-UID (app) network bytes: rx + tx (foreground + background)
  - Snapshot: TrafficStats.getUidRxBytes(uid) + getUidTxBytes(uid)
  - Our service polls every 30 seconds, calculates delta

Method 3: NetworkStatsManager (Android 6+)
  - Requires READ_NETWORK_USAGE_HISTORY permission
  - Gives historical per-app data usage over any time range
  - Most accurate: used for end-of-session reconciliation
```

**Android Background Service Architecture:**
```
NetReward Tracking Service (Foreground Service)
  ├── Runs as persistent foreground service (shows notification: "NRT Tracking Active")
  ├── Uses WorkManager for periodic tasks (battery-aware scheduling)
  ├── Polling interval: 30s (active campaign) / 5min (no active campaign)
  ├── On each poll:
  │     1. Get list of active SP app UIDs (from campaign registry)
  │     2. Query TrafficStats.getUidRxBytes(uid) for each
  │     3. Calculate delta since last snapshot
  │     4. Match against active campaigns for that SP app
  │     5. Batch report to server every 60 seconds
  └── On app kill (doze mode):
        JobScheduler reschedules WorkManager task on next wake
```

#### iOS — Limited Background Access
```
Apple restricts background network monitoring strictly.

Method 1: NENetworkExtension (Network Extension)
  - Full per-app traffic monitoring
  - Requires Apple entitlement approval (Enterprise/Partner program)
  - Creates a local VPN/packet tunnel for traffic inspection
  - Best accuracy but most complex

Method 2: BackgroundTasks Framework
  - BGAppRefreshTask — runs up to 30 seconds in background
  - BGProcessingTask — runs longer when device plugged in
  - We sync usage data during these windows

Method 3: SDK Integration (Preferred for iOS)
  - SP apps integrate our lightweight NetReward SDK
  - SDK reports data usage from within the SP app directly
  - Most reliable on iOS (avoids Apple background restrictions)
```

**iOS Approach:**
```
Primary: SP SDK Integration (see SDK below)
Fallback: Network Extension (for approved enterprise SPs)
Sync: When user opens NetReward app → sync accumulated data
```

#### Web/PWA — Browser Extension
```
Chrome Extension (Manifest V3):
  ├── background/service-worker.ts
  │     - Listens to chrome.webRequest.onCompleted events
  │     - Filters by SP-registered domains (from campaign registry)
  │     - Accumulates bytes transferred per domain
  │     - Syncs to backend every 60 seconds
  └── Permissions: "webRequest", "tabs", "storage", "alarms"

Data captured per request:
  { domain, bytesTransferred, timestamp, tabId, campaignId }
```

### SP Tracker SDK (Key Architecture)

The most reliable method for any platform. All registered SPs must integrate the NetReward Tracker SDK into their app.

```
SDK Languages: JavaScript (NPM), Android (AAR), iOS (Swift Package)

SDK Responsibilities:
  1. Initialize with: API key (from SP service registration), campaign IDs
  2. Auto-detect: session start/end, pages visited, streams started
  3. Report: data consumed (from app's own network stack), duration, user ID
  4. Privacy: no content capture, only byte counts + session metadata
  5. Offline buffer: stores events locally if offline, syncs on reconnect
  6. Tamper-proof: HMAC-signed reports, server validates signature

SDK Integration (JavaScript):
  import { NetRewardTracker } from '@netreward/tracker';
  const tracker = new NetRewardTracker({
    apiKey: 'sp_live_xxxxx',
    campaignId: 'camp_123',
    userId: currentUser.nrtId  // passed by user after login link
  });
  tracker.trackDataUsage(bytes);   // called by SP app after each request
  tracker.trackSession({ start, end, appName });

SDK Report payload (signed + sent to NetReward):
  {
    spId, campaignId, userId, sessionId,
    dataBytes: { foreground: N, background: N },
    duration: seconds,
    timestamp, hmacSig
  }
```

### Server-Side Validation & Anti-Fraud

```
All data reports validated before NRT is awarded:

1. Signature Verification
   - HMAC-SHA256 of payload using SP's secret key
   - Reject unsigned or tampered reports

2. Deduplication
   - Redis set: sessionId → processed (24hr TTL)
   - Duplicate sessionId → reject

3. Anomaly Detection
   - Flag: > 100GB in single session
   - Flag: data reported when device was offline
   - Flag: multiple sessions from same device simultaneously
   - Flag: data rate > physical network capacity

4. Cross-Reference (Android)
   - Compare SP SDK report vs. NetReward background service reading
   - If delta > 20% → hold reward for manual review

5. Campaign Budget Check
   - Before awarding: verify campaign.budget_remaining >= reward_amount
   - Atomic decrement to prevent over-spend

6. ISP Correlation
   - ISP partners provide anonymized data flow reports
   - Used to validate overall data volume claims
```

### Data Flow: From Device to NRT Reward

```
[User Device]
  SP App (with SDK) or Browser Extension or Android TrafficStats
    ↓ Signed data reports (HTTPS + HMAC)
[NetReward API: /api/v1/tracking/report]
    ↓ Validate signature, deduplicate, anomaly check
[Reward Engine]
    ↓ NRT = dataGB × baseRate × nhsMultiplier × campaignBonus
    ↓ Split: 85% user / 10% SP / 5% ISP
[DB: data_usage_logs + transactions]
    ↓ Campaign budget decremented
[WebSocket: earnings:new event]
    ↓
[User sees NRT appear in dashboard in real-time]
    ↓ (on claim or auto-distribute)
[Solana: SPL transfer to user wallet]
```

### Tracking API Endpoints

```
POST /api/v1/tracking/report
  Headers: X-SP-API-Key, X-HMAC-Signature
  Body: { spId, campaignId, userId, dataBytes, duration, sessionId, timestamp }
  Response: { accepted, pendingNRT, sessionRef }

POST /api/v1/tracking/batch
  Body: { reports: [...] }  // SDK batches up to 100 events
  Response: { processed, rejected: [{ sessionId, reason }] }

GET /api/v1/tracking/status/:sessionId
  Response: { status: 'processing'|'rewarded'|'rejected', nrtAwarded?, reason? }
```

### Campaign-App Registry

```sql
-- Tracks which app packages/domains are tied to which campaign
CREATE TABLE campaign_app_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  sp_id UUID REFERENCES public.users(id),
  android_package TEXT,    -- e.g. com.netflix.mediaclient
  ios_bundle_id TEXT,      -- e.g. com.netflix.Netflix
  web_domain TEXT,         -- e.g. netflix.com
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Android service and browser extension use this registry to know which apps to monitor.

---

## 7. Security Requirements

### 7.1 Authentication Security
- Passwords: bcrypt cost 12, Supabase managed
- JWT: short-lived access + rotating refresh
- Rate limiting: 5 attempts/15min per IP (Redis)
- Progressive lockout

### 7.2 API Security
- All HTTPS (TLS 1.3)
- CORS: whitelist known origins
- Input validation: Zod on all endpoints
- SQL injection: parameterized queries via Supabase client
- Content-Security-Policy headers

### 7.3 Data Security
- PII encrypted at rest (Supabase AES-256)
- RLS policies on all user-facing tables
- KYC documents in private Supabase Storage bucket
- Audit logging for all admin mutations

### 7.4 Blockchain Security
- Treasury: 3-of-5 multi-sig (Squads Protocol)
- Transaction signing: client-side only, private keys never touch backend
- Smart contract audit before mainnet
- Circuit breaker: admin token freeze halts all on-chain operations

### 7.5 Emergency Procedures
1. **Token Freeze** → Admin toggle → disables all deposits/withdrawals/P2P
2. **Maintenance Mode** → Admin toggle → shows maintenance banner globally
3. **IP Block** → Auto-block after 5 failed attempts, manual admin override
4. **User Suspend** → Admin action → blocks login, freezes wallet
5. **Dispute Escalation** → Admin mediates, can force-release escrow

---

## 8. Performance Requirements

| Metric | Target |
|--------|--------|
| API response (p95) | < 200ms |
| WebSocket latency | < 50ms |
| PWA first content paint | < 1.5s |
| PWA time to interactive | < 3s |
| DB query time | < 50ms |
| NHS recalculation | Every 5 min |
| NRT price update | Every 1 min |
| Concurrent users | 1M |
| Data events/sec | 10,000 |

### App Loading Performance Strategy
- Code splitting: React.lazy() for all admin pages and heavy flows
- Route-based chunking via Vite dynamic imports
- Service Worker caching for static assets (PWA)
- React Query for server state with stale-while-revalidate
- Skeleton loading states on all data-fetching components
- Image lazy loading + WebP format

---

## 9. Compliance

| Standard | Requirement |
|----------|-------------|
| GDPR | Data export, right to erasure, consent, DPO |
| CCPA | Opt-out, disclosure |
| AML/KYC | ID verification for withdrawals |
| PCI DSS | Delegated to Paystack/Flutterwave |
| OFAC | Geo-blocking for sanctioned countries |

---

## 10. Third-Party Integrations

| Service | Purpose | Priority | Status |
|---------|---------|----------|--------|
| Supabase | Auth, DB, Realtime, Storage | P0 | ✅ Client installed |
| Solana RPC | Token, transfers, escrow | P0 | ✅ Adapter installed |
| Chainlink | NRT price oracle | P1 | 🔜 |
| Paystack | Fiat payments (Africa) | P0 | 🔜 |
| Flutterwave | Fiat payments (Africa) | P0 | 🔜 |
| Stripe | Fiat payments (Global) | P1 | 🔜 |
| Jumio / Onfido | KYC document verification | P1 | 🔜 |
| SendGrid | Email notifications | P0 | 🔜 |
| Twilio | SMS notifications | P1 | 🔜 |
| Firebase | Push notifications | P0 | 🔜 |
| Squads Protocol | Multi-sig treasury | P0 | 🔜 |
| Raydium / Orca | DEX liquidity pool | P1 | 🔜 |
| Sentry | Error monitoring | P0 | 🔜 |
| Cloudflare | CDN, DDoS | P0 | 🔜 |

---

## 11. Phase 12 Core Backend: Tracking & Reward Engine

### 11.1 Devices Schema
- **`devices`**: `id`, `user_id`, `device_name`, `device_type`, `os`, `mac_address`, `ip_address`, `status`, `country`, `isp_name`, `signal_strength`, `created_at`, `updated_at`.
- **`device_data_sessions`**: `id`, `device_id`, `campaign_id`, `session_id` (unique), `bytes_up`, `bytes_down`, `duration_seconds`, `session_start`, `session_end`, `verified`, `nrt_awarded`, `created_at`.

### 11.2 Tracking Process
1. **SDK / Background Agent** records session byte deltas.
2. Reports to API (`POST /api/v1/tracking/batch`) every 60s. Payload contains `session_id`, `device_id`, `campaign_id`, `bytes_up`, `bytes_down`.
3. Validations: Campaign active, Budget remaining, HMAC Signature verified, `session_id` deduplication.
4. **ISP Location-based Tracking**: For ISP networks, data matching user IP location is tracked toward the ISP without requiring SDK. Name collisions (e.g., MTN Nigeria vs MTN Ghana) handled by location matching.

### 11.3 Reward Engine Process (process_tracking_report RPC)
1. **Calculate Earnings**: `NRT = (total_bytes / 1e9) * reward_rate_per_gb * NHS_Multiplier`.
2. **Distribution**:
   - User wallet `unclaimed_nrt` gets 85%.
   - SP wallet gets 10% (`spShare`).
   - ISP wallet gets 5% (`ispShare`).
3. **Ledger Updates**:
   - `campaigns.budget_spent` is incremented.
   - SP's NRT balance is decremented if campaign escrow applies.
   - `device_data_sessions.nrt_awarded` is recorded.
4. Anomaly flags generated if rules breached (e.g., volume > physical network limit).
