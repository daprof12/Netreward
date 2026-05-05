# NetReward (NRT) — Product Requirements Document (PRD)

> **Version:** 2.1 | **Date:** 2026-05-01 | **Status:** Active Development

---

## 1. Executive Summary

NetReward (NRT) is a **blockchain-powered data-rewards ecosystem** that compensates internet users with NRT tokens for everyday data consumption. The platform connects **Users**, **Service Providers (SP)**, and **Internet Service Providers (ISP)** in a transparent, privacy-first token economy on Solana.

**Tagline:** *"Your Data, Your Rewards, Your Power"*

### Delivery Platforms

| Platform | Technology | Status |
|----------|-----------|--------|
| Progressive Web App | Vite + React 19 + TypeScript 6 | ✅ Active (Frontend Shell Complete) |
| Android & iOS | React Native (Expo) | 🔜 Phase 5 |
| Chrome Extension | Manifest V3 + React | 🔜 Phase 5 |
| Desktop (macOS/Win/Linux) | Electron wrapper | 🔜 Phase 5 |

---

## 2. Vision & Goals

### 2.1 Business Goals

| ID | Goal | KPI | Year-1 Target |
|----|------|-----|---------------|
| BG-1 | User acquisition | MAU | 100,000 |
| BG-2 | Revenue | Platform revenue | $2M |
| BG-3 | SP onboarding | Integrated SPs | 50 |
| BG-4 | ISP onboarding | Partner ISPs | 10 |
| BG-5 | Token health | NHS score avg | ≥ 60/100 |
| BG-6 | Retention | 30-day retention | ≥ 70% |

### 2.2 Product Goals
- PG-1: Telegram-Wallet-inspired UI with premium glassmorphic micro-interactions ✅ **Implemented**
- PG-2: Theme switching (dark/light/system) and language switching (10+ languages)
- PG-3: Seamless cross-platform experience (mobile, web, desktop, extension)
- PG-4: Real-time data tracking and NRT earnings visualization ✅ **Frontend complete, backend pending**
- PG-5: Gamified experience with achievements, streaks, progress systems
- PG-6: Privacy-first: no credit card exposure, blockchain transparency

---

## 3. User Personas

### Sarah — General User (Age 22, Student)
- 50 GB/month usage (Netflix, TikTok, Instagram)
- Pays $45/month, gets nothing back
- Wants passive NRT earnings to pay for subscriptions

### James — SP Marketing Manager (Age 34)
- Needs targeted campaigns rewarding users on his platform
- Wants campaign analytics, demographics, ROI dashboards

### Amara — ISP Product Lead (Age 40)
- 45% annual churn, needs differentiation
- Wants reward distribution tools and network analytics

### Dev — Platform Admin (Age 29)
- Monitors ecosystem health, manages NRT economics
- Needs full CRUD, token config, user management

---

## 4. Feature Requirements — General Users

### 4.1 Authentication & Onboarding

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| U-AUTH-01 | Email + password registration with role selection (User/SP/ISP) | P0 | ✅ Done |
| U-AUTH-02 | Social login (Google, GitHub) | P0 | ✅ UI Done, backend pending |
| U-AUTH-03 | 3-screen onboarding tutorial with skip | P0 | ✅ Done |
| U-AUTH-04 | Dynamic KYC verification (Face ID liveness, selfie, business docs for SP/ISP) | P0 | ✅ Done |
| U-AUTH-05 | TOTP-based 2FA | P1 | 🔜 Backend needed |
| U-AUTH-06 | JWT session management with Supabase | P0 | ✅ Structure in place |
| U-AUTH-07 | Logout confirmation modal (all dashboards) | P0 | ✅ Done |
| U-AUTH-08 | Biometric login (Face ID, fingerprint) | P1 | 🔜 Mobile phase |

### 4.2 Dashboard

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| U-DASH-01 | Stats: Wallet Balance, Total NRT Earned, Data Consumed, NRT Value, Devices | P0 | ✅ Done |
| U-DASH-02 | Campaign carousel with "View More" → campaign list | P0 | ✅ Done |
| U-DASH-03 | Active earnings list with "More" → earnings page | P0 | ✅ Done |
| U-DASH-04 | Live earnings counter (animated odometer) | P1 | ✅ Done |
| U-DASH-05 | Achievement badges (streaks, milestones) | P2 | 🔜 Planned |

### 4.3 Campaigns

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| U-CAMP-01 | Campaign list with filters: status, budget, type, category, location | P0 | ✅ Done |
| U-CAMP-02 | Campaign detail with join button, progress bar, reward estimate | P0 | ✅ Done |
| U-CAMP-03 | One-tap join with confirmation | P0 | ✅ Done |

### 4.4 My Devices

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| U-DEV-01 | Device list: name, battery, MAC, stats summary | P0 | ✅ UI Done, backend pending |
| U-DEV-02 | Data usage chart (24h / All-time toggle) | P0 | ✅ UI Done, backend pending |
| U-DEV-03 | Add device (QR code or manual) | P0 | ✅ UI Done, backend pending |
| U-DEV-04 | Disconnect device | P0 | ✅ UI Done, backend pending |
| U-DEV-05 | Device detail: per-app breakdown | P0 | ✅ UI Done, backend pending |
| U-DEV-06 | Device registration persisted to DB | P0 | 🔜 Backend needed |

### 4.5 Wallet

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| U-WAL-01 | Balance with fiat equivalent | P0 | ✅ Done |
| U-WAL-02 | Transaction history (earnings, referrals, subscriptions, deposits, withdrawals) | P0 | ✅ Done (DB-driven, all tx types) |
| U-WAL-03 | Withdraw to bank (NRT → fiat) | P1 | ✅ Done (DB pipeline + UI) |
| U-WAL-04 | Pay for services with NRT | P1 | ✅ UI Done |
| U-WAL-05 | Phantom / MetaMask connect (Solana adapter) | P1 | ✅ Adapter integrated |
| U-WAL-06 | Scan2Pay — QR code to pay SP merchants (full state machine: SUCCESS / FAILED / PENDING / CANCELLED / TIMEOUT / REFUNDED) | P1 | ✅ UI Done, backend pending |
| U-WAL-07 | P2P NRT trading (buy/sell with escrow) | P1 | ✅ Full flow done |
| U-WAL-08 | Deposit via instant purchase / verified exchanger | P1 | ✅ Done |

### 4.6 P2P Marketplace

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| U-P2P-01 | Browse buy/sell offers with filters | P1 | ✅ Done |
| U-P2P-02 | Create offer (buy/sell, amount, price, payment method) | P1 | ✅ Done |
| U-P2P-03 | P2P trade flow (escrow → payment → release) | P1 | ✅ Done |
| U-P2P-04 | Trade countdown timer, payment proof upload | P1 | ✅ Done |
| U-P2P-05 | Dispute/report system with real-time chat (DB-driven) | P1 | ✅ Done |
| U-P2P-06 | Payment account management (bank, mobile money) | P1 | ✅ Done |
| U-P2P-06b | Admin-managed local bank lists per country | P1 | ✅ Done |
| U-P2P-07 | My Offers management (Edit/Close active listings) | P1 | ✅ Done |
| U-P2P-08 | Post-trade Seller Review & Rating system | P1 | ✅ Done |

### 4.6b Scan2Pay — Payment States

Scan2Pay is a QR-code-based NRT payment that passes through a defined state machine. Every state produces a distinct UI response and API payload.

| State | Trigger | User-Facing Message | Action Available |
|-------|---------|--------------------|-----------------|
| `INITIATED` | QR scanned, decoding | Scanning… | — |
| `VALIDATING` | Server pre-flight checks | Verifying payment… | — |
| `PROCESSING` | DB debit/credit in progress | Processing payment… | — |
| `CONFIRMING` | Awaiting Solana block confirmation | Confirming on blockchain… | — |
| `SUCCESS` | Fully settled (ledger ± on-chain) | ✅ Payment Successful! | View Receipt |
| `PENDING` | Solana RPC timeout — polling | ⏳ Awaiting blockchain confirmation… | — (auto-resolves via WebSocket) |
| `FAILED` | Validation error (balance, PIN, frozen) | ❌ [specific error reason] | Try Again |
| `CANCELLED` | User tapped Cancel before confirming | Payment cancelled | Back to Wallet |
| `TIMEOUT` | QR expired (> 5 min TTL) | QR code has expired | Scan New Code |
| `REFUNDED` | On-chain failure after DB debit | Payment failed — NRT refunded | View Wallet |

**FAILED error codes:** `INSUFFICIENT_BALANCE` · `INVALID_PIN` · `MERCHANT_INACTIVE` · `TOKEN_FROZEN` · `DUPLICATE_REF` · `BLOCKCHAIN_ERROR`

**Safety guarantees:**
- QR `ref` is a UUID idempotency key (Redis, 24hr TTL) — no double charges
- DB debit + SP credit are atomic — no partial state possible
- On-chain failure always auto-refunds user wallet before responding
- PENDING state subscribes to `scan2pay:confirmed` WebSocket event for real-time resolution

### 4.7 KYC & Profile

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| U-KYC-01 | Standard KYC: government ID + selfie | P1 | ✅ Done |
| U-KYC-02 | Business KYC (SP): SP name, website, email, phone, address, logo, biz reg | P1 | ✅ Done |
| U-KYC-03 | Business KYC (ISP): ISP name, website, email, phone, address, logo, biz reg, ISP license | P1 | ✅ Done |
| U-KYC-04 | Email-domain validation for business email | P1 | ✅ Done |
| U-KYC-05 | KYC document preview modal | P1 | ✅ Done |

### 4.8 Support & Settings

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| U-SUP-01 | Create/read support tickets with messaging (DB-driven) | P0 | ✅ Done |
| U-SET-01 | Profile settings (name, phone, password — DB-driven) | P0 | ✅ Done |
| U-SET-02 | Security settings (PIN, biometric, password via Supabase Auth) | P1 | ✅ Done |
| U-SET-03 | Account type switch (User ↔ SP ↔ ISP) with KYC gate (DB RPC) | P1 | ✅ Done |
| U-SET-04 | Notification preferences | P0 | ✅ Done |
| U-SET-05 | Privacy settings | P0 | ✅ Done |
| U-SET-06 | Referral management (DB-driven, auto-generated codes) | P1 | ✅ Done |
| U-SET-07 | Logout with confirmation modal | P0 | ✅ Done |

---

## 5. Feature Requirements — Service Providers (SP)

### 5.1 Dashboard
| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| SP-DASH-01 | Stats: NRT Distributed, Active Campaigns, Users Reached, Revenue (10% spShare) | P0 | ✅ Done |
| SP-DASH-02 | Analytics chart (Campaign / Checkout / Cashback) with time filters (24H/7D/3M/All) | P0 | ✅ Done |
| SP-DASH-03 | Live campaigns list | P0 | ✅ Done |
| SP-LOGOUT | Logout confirmation modal | P0 | ✅ Done |

### 5.2 Service Registration
| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| SP-SVC-01 | Basic fields: service name, logo upload, category, description | P0 | ✅ Done |
| SP-SVC-02 | Platform URLs: Web URL, Google Play Store URL, App Store URL | P0 | ✅ Done |
| SP-SVC-03 | **Android Package Name** (e.g. `com.netflix.mediaclient`) | P0 | ✅ Done |
| SP-SVC-04 | **iOS Bundle ID** (e.g. `com.netflix.Netflix`) | P0 | ✅ Done |
| SP-SVC-05 | **Web Domain** (e.g. `netflix.com`) for Chrome Extension filtering | P0 | ✅ Done |
| SP-SVC-06 | **Webhook URL** (SP endpoint to receive NRT event callbacks) | P0 | ✅ Done |
| SP-SVC-07 | Verification flow: ping webhook, check Play/App Store listings (3-step UI) | P0 | ✅ Done |
| SP-SVC-08 | **Credentials display**: apiKey + secretKey + webhookSecret shown once after verification | P0 | ✅ Done |
| SP-SVC-09 | Service status lifecycle: `pending_verification` → `active` → `suspended` | P0 | ✅ Done |

### 5.3 SDK & Campaign Integration
| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| SP-SDK-01 | SP integrates `@netreward/tracker` SDK into their app (mandatory before campaign live) | P0 | ✅ Done (`src/lib/netreward-sdk.ts`) |
| SP-SDK-01b | **SDK Documentation Portal**: Industrial-grade interactive guides for integration | P0 | ✅ Done |
| SP-SDK-02 | SDK: `new NetRewardSDK({ apiKey, secretKey, endpoint })` | P0 | ✅ Done |
| SP-SDK-03 | SDK: device/session tracking with HMAC-SHA256 signing | P0 | ✅ Done |
| SP-SDK-04 | SDK: `sdk.trackSession({ ... })` / `sdk.bufferEvent({ ... })` / `sdk.trackBatch([...])` | P0 | ✅ Done |
| SP-SDK-05 | Admin SDK verification gate: campaign cannot go live without confirmed SDK ping | P0 | 🔜 Backend needed |
| SP-CAMP-01 | Create campaign (link service, demographics, budget, dates, recurring) | P0 | ✅ Done |
| SP-CAMP-02 | **Campaign funding**: SP must have available NRT balance to create a campaign. Budget is deducted from SP balance to fund the campaign targeting users in specified locations. Low balance prompts deposit. | P0 | 🔜 Backend needed |
| SP-CAMP-03 | Campaign auto-pause when budget exhausted | P0 | 🔜 Backend needed |
| SP-CAMP-04 | Campaign performance view | P0 | ✅ Done |

### 5.4 Revenue & Payments
| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| SP-PAY-01 | 10% spShare auto-credited to SP wallet per user reward event | P0 | 🔜 Backend needed |
| SP-PAY-02 | SP wallet: NRT balance + transaction history | P0 | ✅ Done (UI) |
| SP-PAY-03 | SP withdrawal: NRT → fiat via country gateway | P1 | 🔜 Backend needed |
| SP-PAY-04 | Receive webhook events: `reward.distributed`, `campaign.ended`, `budget.low` | P1 | 🔜 Backend needed |
| SP-PAY-05 | **Scan2Pay Integration**: API/SDK to generate NRT checkout sessions/QR codes for SP platforms — **Setup wizard UI + credential display** | P1 | ✅ UI Done, backend pending |
| SP-PAY-05b | **Payment API Documentation**: Industrial-standard portal for endpoints and webhooks | P1 | ✅ Done |
| SP-PAY-06 | **Payment Webhooks**: Receive real-time `payment.success` webhooks for Scan2Pay checkouts | P1 | 🔜 Backend needed |
| SP-PAY-07 | **Mobile Deep-linking**: App-to-app "Pay with NRT" flow for SP mobile apps | P1 | 🔜 Phase 5 |
| SP-DEV-01 | Devices view (linked devices by campaign) | P0 | ✅ Done |
| SP-KYC-01 | Business KYC: logo, website, business email (domain match), phone, address, biz reg | P1 | ✅ Done |

---

## 6. Feature Requirements — ISP

### 6.1 Dashboard
| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| ISP-DASH-01 | Stats: Customers, Data Consumed, Campaigns, Earnings/Cashback (5%), Balance | P0 | ✅ Done |
| ISP-DASH-02 | Analytics charts: Campaigns / Cashback / Network signal (24H/7D/3M/All) | P0 | ✅ Done |
| ISP-LOGOUT | Logout confirmation modal | P0 | ✅ Done |

### 6.2 Network Registration
| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| ISP-NET-01 | Basic fields: network name, logo, category (Telecom/Satellite/Fiber/Mobile/Broadband) | P0 | ✅ Done |
| ISP-NET-02 | **Country** (ISO 3166-1 alpha-2) | P0 | ✅ Done |
| ISP-NET-03 | **ASN** (Autonomous System Number, e.g. AS6453) | P0 | ✅ Done |
| ISP-NET-04 | **IP Ranges** (CIDR blocks, e.g. "197.210.0.0/16") | P0 | ✅ Done |
| ISP-NET-05 | **Handshake URL** (ISP endpoint for NetReward BGP challenge-response) | P0 | ✅ Done |
| ISP-NET-06 | **Webhook URL** (ISP receives data flow summaries and billing events) | P1 | ✅ Done |
| ISP-NET-07 | Handshake verification: NetReward sends challenge → ISP proves ASN ownership | P0 | ⚠️ UI exists, mock only — real API needed |
| ISP-NET-08 | BGP validation of ASN + IP ranges via RIPE/ARIN | P0 | 🔜 Backend needed |
| ISP-NET-09 | **Credentials display**: apiKey + secretKey shown once after verification | P0 | ✅ Done |
| ISP-NET-10 | Network status lifecycle: `pending_verification` → `active` → `suspended` | P0 | 🔜 Backend needed |

### 6.3 Network Monitoring & Integration
| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| ISP-MON-01 | **Location-based Passive Tracking**: ISP does not need SDK integration. After admin verification, user data traffic in their covered location is automatically tracked towards them for campaigns and rewards. | P0 | 🔜 Backend needed |
| ISP-MON-02 | **Network Differentiation**: Differentiate ISPs sharing names (e.g., MTN Nigeria vs MTN Ghana) strictly by user device location. | P0 | 🔜 Backend needed |
| ISP-MON-03 | **Active integration**: Optional webhook pushes from ISP to `/api/v1/tracking/isp-report` | P1 | 🔜 Backend needed |
| ISP-MON-04 | Network signal quality metric (0–100%) on ISP dashboard | P1 | ✅ UI Done (mock) |
| ISP-MON-05 | Discrepancy > 30% between ISP and SDK reports → admin anomaly flag | P1 | 🔜 Backend needed |

### 6.4 Campaigns & Payments
| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| ISP-CAMP-01 | Create ISP campaign (link network, bonus reward rate for subscribers) | P0 | ✅ Done |
| ISP-CAMP-02 | Campaign funding: ISP deposits NRT into escrow before activation | P0 | 🔜 Backend needed |
| ISP-CAMP-03 | Campaign performance view | P0 | ✅ Done |
| ISP-PAY-01 | 5% ispShare auto-credited to ISP wallet per user reward event | P0 | 🔜 Backend needed |
| ISP-PAY-02 | ISP wallet: NRT balance + transaction history | P0 | ✅ Done (UI) |
| ISP-PAY-03 | ISP withdrawal: NRT → fiat via country gateway | P1 | 🔜 Backend needed |
| ISP-DEV-01 | Devices view | P0 | ✅ Done |
| ISP-KYC-01 | Business KYC: ISP license, logo, all business info | P1 | ✅ Done |

---

## 7. Feature Requirements — Admin

### 7.1 Dashboard & Analytics

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| ADM-DASH-01 | Stats cards: Users, Revenue, Active Campaigns, Data Consumed | P0 | ✅ Done |
| ADM-DASH-02 | Charts: User growth, revenue trend, data consumption | P0 | ✅ Done |
| ADM-DASH-03 | Quick stats with NHS score display | P0 | ✅ Done |

### 7.2 User & Account Management

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| ADM-USR-01 | All users CRUD (search + country filter) | P0 | ✅ Done |
| ADM-USR-02 | User detail modal (KYC docs, wallet, devices, security) | P0 | ✅ Done |
| ADM-USR-03 | Admin roles management | P0 | ✅ Done |
| ADM-KYC-01 | KYC review queue (filter by status, search, country) | P0 | ✅ Done |
| ADM-KYC-02 | KYC detail modal with full document preview | P0 | ✅ Done |
| ADM-KYC-03 | Business info display (logo, website, email, phone, address) | P0 | ✅ Done |
| ADM-KYC-04 | Business Registration and ISP License document preview | P0 | ✅ Done |
| ADM-KYC-05 | KYC approve/reject actions | P0 | ✅ Done |

### 7.3 Financial Management

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| ADM-TXN-01 | All transactions (search + country + type + status filter) | P0 | ✅ Done |
| ADM-CHK-01 | Checkout management (search + country filter) | P0 | ✅ Done |
| ADM-EARN-01 | Earnings & cashback (entity type + country filter) | P0 | ✅ Done |
| ADM-WAL-01 | Wallet management (freeze/unfreeze, search, country) | P0 | ✅ Done |
| ADM-EXC-01 | Exchanger management (CRUD, status, badges, search) | P0 | ✅ Done |
| ADM-PAY-01 | Payment gateway (CRUD, sorted/filtered by country) | P0 | ✅ Done |
| ADM-PAY-02 | Local bank management per country (CRUD, search, filter) | P0 | ✅ Done |
| ADM-PAY-03 | **Checkout Integrations**: SP checkout API usage monitoring (search + country + status + category filter) | P0 | ✅ Done |

### 7.4 Platform Management

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| ADM-CAMP-01 | All campaigns (search + country filter) | P0 | ✅ Done |
| ADM-SVC-01 | Services management (search + country + verify) | P0 | ✅ Done |
| ADM-NET-01 | Networks management (search + country) | P0 | ✅ Done |
| ADM-DEV-01 | Devices management (search + country + detail modal) | P0 | ✅ Done |
| ADM-REF-01 | Referrals (search + country filter) | P0 | ✅ Done |

### 7.5 P2P Management

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| ADM-P2P-01 | Disputes (chat, resolve, auto-escalation timer) | P0 | ✅ Done |
| ADM-P2P-02 | Offers management (CRUD, moderation) | P0 | ✅ Done |
| ADM-P2P-03 | Trades monitoring (real-time flow tracking) | P0 | ✅ Done |
| ADM-P2P-04 | Payment methods & Bank list management | P0 | ✅ Done |

### 7.6 Configuration

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| ADM-CFG-01 | Rewards & Fees (tabbed: reward rates + processing fees) | P0 | ✅ Done |
| ADM-CFG-02 | Token configuration (supply, value, freeze/unfreeze) | P0 | ✅ Done |
| ADM-CFG-03 | Token value sources with weighted algorithm display | P0 | ✅ Done |
| ADM-CFG-04 | API endpoints management | P0 | ✅ Done |

### 7.7 Support & CRM

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| ADM-SUP-01 | Support ticket management (CRUD, assign, chat) | P0 | ✅ Done |
| ADM-CRM-01 | CRM and notification management | P1 | ✅ Done |

### 7.8 System Management

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| ADM-SYS-01 | System health monitoring | P0 | ✅ Done |
| ADM-SYS-02 | API rate limits | P0 | ✅ Done |
| ADM-SYS-03 | Cyber security / log viewer | P0 | ✅ Done |
| ADM-SYS-04 | Maintenance mode toggle | P0 | ✅ Done |
| ADM-SYS-05 | Emergency controls | P0 | ✅ Done |
| ADM-SYS-06 | Backup management | P0 | ✅ Done |
| ADM-LOGOUT | Logout confirmation modal in sidebar | P0 | ✅ Done |

---

## 8. Design System

### 8.1 Implemented Design Language
- **Navigation:** Bottom tab bar (mobile), collapsible sidebar (admin desktop)
- **Cards:** Glassmorphic surfaces with backdrop blur (`glass` class)
- **Colors:** Green (`#10B981` / `#34D399`) primary accent, dark navy backgrounds
- **Typography:** Inter / system fonts with clear hierarchy
- **Spacing:** 8px grid, `rounded-xl` (12px) / `rounded-2xl` (16px) cards
- **Modals:** `framer-motion` AnimatePresence for all confirmations and detail views
- **Filters:** Standardized `Search + Country Filter` pattern on all admin tables

### 8.2 Micro-Interactions (Implemented)
| ID | Interaction | Status |
|----|------------|--------|
| MI-01 | Card press: scale(0.98) | ✅ Done |
| MI-02 | Page transitions: fade + slide | ✅ Done |
| MI-03 | Modal: scale spring enter/exit | ✅ Done |
| MI-04 | Earnings: animated counter | ✅ Done |
| MI-05 | Loading: spinner + skeleton patterns | ✅ Done |
| MI-06 | Step flows: AnimatePresence mode="wait" | ✅ Done |

### 8.3 Theme Tokens

| Token | Dark Mode Value |
|-------|----------------|
| `--bg-primary` | `#0D1117` |
| `--bg-secondary` | `#161B22` |
| `--bg-card` | `#1C2128` |
| `--text-primary` | `#E6EDF3` |
| `--accent-primary` | `#34D399` |
| `--glass-bg` | `rgba(22,27,34,0.7)` |
| `--glass-border` | `rgba(48,54,61,0.8)` |

---

## 9. Non-Functional Requirements

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| ANA-SP-01 | Campaign Analytics & ROI tracking | P1 | ✅ Done |
| ANA-ISP-01 | Network Health & Latency Insights | P1 | ✅ Done |
| ANA-USR-01 | User Earning trajectory visualization | P2 | ✅ Done |
| NFR-01 | Cold start < 2s on mid-range devices | < 2s | 🔜 Optimize |
| NFR-02 | API p95 response < 200ms | < 200ms | 🔜 Backend needed |
| NFR-03 | PWA Lighthouse ≥ 90 | ≥ 90 | 🔜 Optimize |
| NFR-04 | 99.9% uptime SLA | 99.9% | 🔜 Infra needed |
| NFR-05 | E2E encryption for sensitive data | AES-256 | 🔜 Backend needed |
| NFR-06 | OWASP Top 10 compliance | Full | 🔜 Audit needed |
| NFR-07 | GDPR + CCPA compliance | Full | 🔜 Legal needed |
| NFR-08 | WCAG 2.1 AA accessibility | AA | 🔜 Audit needed |
| NFR-09 | Support 1M concurrent users | 1M | 🔜 Infra needed |
| NFR-10 | App loading (code splitting, lazy routes) | < 1.5s FCP | 🔜 Phase 2 |

---

## 10. Release Plan (Updated)

| Phase | Timeline | Scope | Status |
|-------|----------|-------|--------|
| **Alpha Frontend** | Weeks 1–8 | Full PWA frontend shell (all roles), mock data stores | ✅ **Complete** |
| **P2P Market Refinement** | Weeks 9-10 | Disputes, Ratings, My Offers management, Escrow timer | ✅ **Complete** |
| **Scan2Pay Integration** | Weeks 11-12 | SP Payment API/SDK, QR checkout sessions, state machine | ✅ **Complete** |
| **Data Persistence & Off-Ramp** | Weeks 13–14 | Fiat withdrawals, support/referral/dispute DB migration, profile management | ✅ **Complete** |
| **Core Backend — Tracking & Engine** | Weeks 15–17 | Devices tracking, Reward Engine RPC, Dashboard hydration, Transaction History, SDK & Tracking API | ✅ **Complete** |
| **Mobile & Extensions** | Weeks 16–20 | React Native app, Chrome Extension, Windows App | 🔜 Planned |
| **GA** | Weeks 21–24 | Mainnet deployment, security audit, public launch | 🔜 Planned |

---

## 11. SP Data Usage Monitoring

The core technical challenge for rewarding users: accurately measure data consumed on **SP-registered apps/platforms** during active campaigns — across all platforms and even when the NetReward app is backgrounded, minimized, or killed.

### Monitoring Strategy by Platform

| Platform | Primary Method | Secondary Method | Background Capability |
|----------|---------------|-----------------|----------------------|
| **Android** | SP Tracker SDK (HMAC-signed) | TrafficStats API per-UID polling (30s) | ✅ Full (Foreground Service + WorkManager) |
| **iOS** | SP Tracker SDK (HMAC-signed) | NENetworkExtension (VPN tunnel, enterprise) | ⚠️ Limited (BGAppRefreshTask, 30s windows) |
| **Web/PWA** | Chrome Extension (webRequest) | SP Tracker SDK (JS) | ✅ Extension service worker always active |
| **Desktop** | Electron main process intercept | SP Tracker SDK (Node.js) | ✅ Full (native process) |

### SP Tracker SDK (Required for All SPs)

Every SP registering a service **must** integrate the NetReward Tracker SDK. Campaign activation is gated behind a successful SDK test ping verified by admin.

| SDK Platform | Package |
|-------------|--------|
| JavaScript / Web | `@netreward/tracker` (NPM) |
| Android | `io.netreward:tracker` (Maven/AAR) |
| iOS | `NetRewardTracker` (Swift Package) |
| Windows Desktop | `NetReward.Tracker.Win` (NuGet) |

**SDK responsibilities:**
- Initialize with SP API key + campaign ID + linked NRT user ID
- Report: byte counts (upload + download) per session — **no content capture**
- Sign every report with HMAC-SHA256 using SP's secret key
- Buffer events offline and sync on reconnect
- Batch flush every 60 seconds to `/api/v1/tracking/batch`

### Android Background Service
- Runs as a **persistent foreground service** (shows "NRT Tracking Active" notification, Android requirement)
- Uses `WorkManager` for battery-aware 30-second polling
- Reads `TrafficStats.getUidRxBytes(uid)` per registered SP app UID
- Cross-references SDK reports: if delta > 20% → hold reward for admin review
- Restart on kill via `START_STICKY` + `JobScheduler`

### Server-Side Validation & Anti-Fraud

All tracking reports pass a validation pipeline before any NRT is awarded:

| Check | Rule |
|-------|------|
| Signature | HMAC-SHA256 verified against SP secret key |
| Deduplication | `sessionId` checked in Redis (24hr window) |
| Volume anomaly | > 100 GB/session → flagged |
| Speed anomaly | Data rate > 10 Gbps → flagged |
| Offline check | Report timestamp vs. device connectivity log |
| Budget gate | Campaign must have budget remaining before reward |
| Cross-reference (Android) | SDK vs. TrafficStats within 20% tolerance |

Flagged sessions go to **Admin Anomaly Queue** in the admin dashboard for manual review.

### Data Flow Summary
```
User device (SP app with SDK / Android TrafficStats / Browser Extension)
  → HMAC-signed report → /api/v1/tracking/batch
  → Validate → Reward Engine (NRT = dataGB × baseRate × nhsMultiplier)
  → Split 85% user / 10% SP / 5% ISP
  → WebSocket earnings:new → user sees NRT in real-time
  → On claim: Solana SPL transfer to user wallet
```

---

## 11. Next Stage Priorities (Phase 2+)

### 11.1 Backend (Immediate)
- [ ] Node.js/Express REST API server scaffolding
- [ ] Supabase integration (real auth, real DB queries replacing mock stores)
- [ ] JWT middleware, RLS policies update
- [ ] WebSocket server for real-time earnings/stats
- [ ] Reward calculation engine (NHS-based NRT per GB)
- [x] SP Tracker SDK development (JS package done: `src/lib/netreward-sdk.ts`; Android, iOS planned)
- [ ] Android background tracking service (Foreground Service + WorkManager)
- [x] Tracking validation pipeline (HMAC, dedup, anomaly detection) (Admin UI Complete)
- [x] Admin anomaly review queue (flagged tracking sessions) (Admin UI Complete)
- [ ] Scan2Pay backend (full state machine: validate → process → confirm → websocket)
- [x] KYC document storage & Submission (Supabase + Table schema complete)
- [x] Admin security portal (/admin/login)
- [x] Face ID-style liveness check implementation
- [ ] Payment gateway integration (Paystack, Flutterwave, Stripe)
- [ ] Email/SMS notifications (SendGrid, Twilio)

### 11.2 Blockchain (Phase 3)
- [x] NRT SPL Token creation on Solana Devnet → Mainnet (Admin UI Complete)
- [ ] Token distribution smart contract (vesting, LP seeding)
- [x] Treasury multi-sig wallet setup (Squads Protocol) (Admin UI Complete)
- [ ] On-chain reward distribution service
- [ ] Scan2Pay on-chain settlement
- [ ] P2P escrow smart contract
- [ ] Price oracle integration (Chainlink)

### 11.3 NRT Token Price Algorithm
The NRT price is determined by a weighted composite algorithm:

| Driver | Weight | Input Source |
|--------|--------|-------------|
| Campaign Demand | 30% | SP/ISP budget allocation rate |
| Exchanger Trade Volume | 25% | P2P + exchange volume (24h) |
| Data Consumption | 20% | GB consumed across all devices |
| P2P Trade Activity | 15% | Trade count and volume |
| Investor Fund | 10% | Treasury reserve movements |

**Formula:** `NRT_Price = BasePrice × NHS_Multiplier × (1 + VolumeBonus)`

> **Note:** The `NHS_Multiplier` value can be manually adjusted by the Platform Admin to control token inflation and reward scaling. The token setup must reflect live price based on NHS and market criteria.

### 11.4 Security & Emergency (Phase 2+)
- [ ] Rate limiting (Redis-backed, per IP + per user)
- [ ] DDoS protection (Cloudflare WAF)
- [ ] Token freeze circuit breaker (admin emergency)
- [ ] Anomaly detection for suspicious P2P patterns
- [ ] Multi-sig approval for large treasury movements
- [ ] Smart contract audit before mainnet
- [ ] Penetration testing

### 11.5 Country-Based Management
- [ ] Country-aware gateway routing (Paystack for Africa, Stripe for global)
- [ ] Country-specific KYC requirements (regulatory compliance)
- [ ] Geo-blocked regions (OFAC sanctions list)
- [ ] Tax reporting by jurisdiction
- [ ] Currency conversion per country

### 11.6 Market Listing (P2P & Exchange)
- [ ] Internal P2P market listing backend
- [ ] Verified exchanger API integration
- [ ] Market depth display
- [ ] Order book (bid/ask)
- [ ] Price chart (candlestick, OHLCV)
- [ ] Listing on external DEX (Raydium, Orca)
- [ ] CEX listing outreach (Binance, Bybit)

### 11.7 Next Phase: Analytics & Reporting (Phase 6)
- [ ] **Advanced User Analytics**: Daily/Weekly data consumption heatmaps.
- [ ] **Global Platform Metrics**: Real-time map of active NRT nodes/campaigns.
- [ ] **Financial Reporting**: CSV/PDF export for users and partners (Tax ready).
- [ ] **Campaign Performance**: Deep ROI analysis for SPs.
- [ ] **Admin Audit Logs**: Comprehensive tracking of all administrative actions.

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Crypto regulatory changes | Multi-jurisdiction legal counsel, fiat off-ramp compliance |
| ISP integration complexity | Start API-based, add deep integration later |
| Token price volatility | NHS dynamic reward rate, liquidity pool management |
| Privacy concerns | On-device processing, transparent policies |
| Cross-platform inconsistency | Shared design system package, visual regression testing |
| P2P fraud/scam | Escrow smart contract, dispute system, KYC gate |
| Mock data in production | Strict environment separation, DB seed scripts |
| SDK data spoofing by SP | HMAC signature verification + cross-reference with device-level TrafficStats |
| iOS background tracking limits | SP SDK mandatory integration; sync on app open as fallback |
| Scan2Pay double charge | Redis idempotency key (ref UUID, 24hr TTL) + atomic DB transaction |
| Scan2Pay blockchain failure | Auto-refund reversal — user always made whole before error response |
