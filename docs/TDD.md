# NetReward (NRT) — Technical Design Document (TDD)

> **Version:** 2.1 | **Date:** 2026-05-01 | **Status:** Active Development

---

## 1. Overview

This TDD defines the technical implementation details for NetReward — covering the current frontend architecture (including the Phase 8 Scan2Pay state machine), fiat off-ramp pipeline, database-driven settings/support/referral/dispute modules, the full target backend, blockchain integration, microservices, WebSocket, and deployment pipeline.

---

## 2. Current Frontend Implementation

### 2.1 Tech Stack (Active)

| Concern | Library | Version |
|---------|---------|---------|
| Build | Vite | 8.x |
| UI | React | 19.x |
| Language | TypeScript | 6.x |
| Styling | Tailwind CSS | v4 |
| Animations | Framer Motion | 12.x |
| Routing | React Router | v7 |
| State (client) | Zustand | 5.x |
| State (server) | TanStack Query | v5 |
| Forms | React Hook Form + Zod | latest |
| Charts | Recharts | 3.x |
| Icons | Lucide React | latest |
| Auth client | Supabase JS | 2.x |
| Blockchain | Solana Wallet Adapter | latest |

### 2.2 Project Structure (Current)

```
src/
├── App.tsx                  # Router, auth guard, role-based rendering
├── main.tsx                 # React root, SolanaWalletProvider, QueryClient
├── lib/
│   ├── supabase.ts          # Supabase client (createClient)
│   ├── solana.tsx           # Wallet adapter (lazy-loaded, error boundary)
│   └── utils.ts             # cn() utility
├── stores/                  # Zustand stores (currently mock)
│   ├── useAuthStore.ts      # user, role, session, isOnboarded
│   ├── useAdminStore.ts     # All admin entities + actions (largest store)
│   ├── useSpStore.ts        # SP services + campaigns (persisted)
│   ├── useIspStore.ts       # ISP networks + campaigns (persisted)
│   ├── useP2PStore.ts       # P2P offers + payment accounts
│   ├── useWalletStore.ts    # NRT balance, fiat rate
│   └── useToastStore.ts     # Toast notification queue
├── pages/
│   ├── Auth.tsx             # Login/Register with role selector
│   ├── Onboarding.tsx       # 3-step onboarding
│   ├── UserHome.tsx         # General user dashboard
│   ├── SpDashboard.tsx      # SP dashboard + analytics
│   ├── IspDashboard.tsx     # ISP dashboard + analytics
│   ├── Campaigns.tsx        # User campaign browse
│   ├── Devices.tsx          # Device list
│   ├── DeviceDetail.tsx     # Per-app data breakdown
│   ├── WalletPage.tsx       # Balance + transactions
│   ├── ScanToPay.tsx        # QR scan + NRT payment
│   ├── P2PMarketplace.tsx   # Browse P2P offers + 'My Offers' mode
│   ├── P2PFlow.tsx          # Full P2P trade flow (escrow steps + auto-dispute + countdown)
│   ├── CreateP2POffer.tsx   # Create/Edit buy/sell offer
│   ├── P2PReview.tsx        # Post-trade review and rating component
│   ├── P2PPaymentAccounts.tsx # Payment account management
│   ├── KYCVerification.tsx  # KYC doc submission (all roles)
│   ├── CreateService.tsx    # SP service registration
│   ├── CreateCampaign.tsx   # SP campaign creation
│   ├── CreateIspCampaign.tsx # ISP campaign creation
│   ├── CreateNetwork.tsx    # ISP network registration
│   ├── Settings.tsx         # Settings hub (all roles)
│   ├── TransactionHistory.tsx
│   ├── Referral.tsx
│   ├── Support.tsx
│   ├── VerifiedExchanger.tsx
│   ├── DepositHub.tsx
│   ├── InstantPurchase.tsx
│   ├── NrtWalletAddress.tsx # Solana wallet address display
│   └── admin/
│       ├── AdminLayout.tsx  # Sidebar + topbar shell
│       ├── AdminDashboard.tsx
│       ├── AdminUsers.tsx   # User CRUD + detail modal + country filter
│       ├── AdminRoles.tsx
│       ├── AdminKYC.tsx     # KYC review + full doc preview modal
│       ├── AdminTransactions.tsx
│       ├── AdminCheckout.tsx
│       ├── AdminEarnings.tsx
│       ├── AdminWallets.tsx
│       ├── AdminExchangers.tsx
│       ├── AdminPayments.tsx  # Payment gateways (country-sorted)
│       ├── AdminCampaigns.tsx
│       ├── AdminServices.tsx
│       ├── AdminNetworks.tsx
│       ├── AdminDevices.tsx
│       ├── AdminReferrals.tsx
│       ├── AdminP2P.tsx     # 4 tabs: Disputes/Offers/Trades/PaymentMethods
│       ├── AdminRewardSettings.tsx  # Rewards + Fees (tabbed)
│       ├── AdminTokenConfig.tsx
│       ├── AdminApiEndpoints.tsx
│       ├── AdminSupport.tsx
│       ├── AdminCRM.tsx
│       ├── AdminSystemHealth.tsx
│       ├── AdminRateLimits.tsx
│       ├── AdminSecurity.tsx
│       ├── AdminMaintenance.tsx
│       ├── AdminEmergency.tsx
│       └── AdminBackup.tsx
├── hooks/                   # React Query hooks (DB-driven)
│   ├── useProfile.ts          # User profile CRUD + role switching
│   ├── useTransactions.ts     # Wallet transaction history from ledger
│   ├── useWithdrawals.ts      # Fiat withdrawal pipeline
│   ├── useSupportTickets.ts   # Support ticket CRUD
│   ├── useReferrals.ts        # Referral program data
│   ├── useDisputes.ts         # P2P dispute CRUD + messaging
│   ├── useWallet.ts           # Wallet balance from DB
│   ├── useCampaigns.ts        # Campaign enrollment
│   └── useDeviceAnalytics.ts  # Device analytics data
└── components/
    ├── ui/
    │   └── LogoutConfirmModal.tsx  # Reusable logout confirmation
    ├── wallet/
    │   └── WithdrawModal.tsx      # 4-step fiat withdrawal modal
    ├── composed/
    └── layouts/
```

### 2.3 Routing & Auth Guard

```typescript
// App.tsx auth guard logic
if (isLoading) return <SplashScreen />

if (!user) {
  // Public routes available without login
  if (path === '/reset-password') return <ResetPassword />
  if (path === '/admin/login') return <AdminLogin />
  return <Auth />
}

if (!isOnboarded) return <Onboarding />

// Role-based routing gate
if (role === 'admin' && path !== '/admin/login' && !isAuthInAdminPortal) {
  // Admins must use the /admin/login gate
}
```

### 2.4 Zustand Store Architecture

```typescript
// useAdminStore.ts — primary data store
// Types: AdminUser, AdminTransaction, AdminCampaign, AdminGateway,
//        AdminExchanger, AdminWallet, AdminReferral, AdminEarning,
//        AdminCheckout, AdminDevice, AdminP2PDispute, AdminP2POffer,
//        AdminP2PTrade, AdminPaymentMethod, AdminSupportTicket,
//        AdminNotification, TokenConfig, RewardSettings, ProcessingFees

// Each entity has: CRUD actions (add, update, delete)
// AdminUser.kycDocs includes: frontUrl, backUrl, selfieUrl,
//   businessName, website, businessEmail, phone, address,
//   logoUrl, businessRegUrl, ispLicenseUrl
```

### 2.5 KYC Flow Architecture
The KYC flow is implemented as a multi-step dynamic state machine in `KYCVerification.tsx`:

1.  **Liveness Step**: Uses a progress-based simulation of Face ID actions.
    *   `turn_head`: Requires yaw detection.
    *   `open_mouth`: Requires aperture detection.
    *   `rotate_head`: Requires roll detection.
    *   Audit trail recorded with timestamps for admin review.
2.  **Document Step**: Adapts based on `targetRole` (passed via location state).
    *   All roles: Government ID (Front/Back) + Selfie.
    *   SP/ISP: Business name, website, email, phone, address, and Logo.
    *   ISP: Telecom Authority License.
3.  **Submission**:
    *   Images are uploaded (simulated/Supabase Storage).
    *   Records created in `kyc_submissions` table.
    *   User `kyc_status` updated to `pending`.

### 2.6 Admin Review Implementation
*   `AdminKYC.tsx` uses direct Supabase subscriptions.
*   Approval triggers an atomic update: `kyc_submissions.status = approved` AND `users.role = target_role` AND `users.kyc_verified = true`.


```
User selects role → KYCVerification.tsx
  ├── Step 1: ID + Selfie upload (all roles)
  ├── Step 2 (SP): Business name, website, email (domain validated),
  │               phone, address, logo, biz registration
  └── Step 2 (ISP): All SP fields + ISP license document
        ↓
  handleSubmitReview() → useAdminStore.updateUser()
        ↓
  Admin → AdminKYC.tsx → Review modal with:
    - Personal: ID front/back, selfie preview
    - Business: logo, info grid, biz reg preview, ISP license preview
    - Actions: Approve / Reject
```

---

## 3. Target Backend Architecture

### 3.1 Microservices Structure

```
backend/
├── services/
│   ├── api-gateway/         # Nginx reverse proxy + rate limiting
│   ├── auth-service/        # JWT + session + 2FA
│   ├── user-service/        # User CRUD + KYC
│   ├── campaign-service/    # Campaign CRUD + enrollment
│   ├── wallet-service/      # Balance + transactions + withdrawals
│   ├── p2p-service/         # Offers + trades + escrow + disputes
│   ├── reward-engine/       # NHS + NRT calculation + distribution
│   ├── notification-service/# Push + email + SMS
│   ├── admin-service/       # Admin CRUD + config
│   └── blockchain-service/  # Solana RPC + on-chain ops
├── shared/
│   ├── types/               # Shared TypeScript interfaces
│   ├── middleware/          # Auth, rate limit, validation
│   └── utils/               # Formatters, errors, pagination
└── workers/                 # BullMQ background jobs
    ├── nhs-calculator.ts
    ├── reward-distributor.ts
    ├── withdrawal-processor.ts
    └── price-updater.ts
```

### 3.2 Reward Engine (Core Algorithm)

```typescript
class RewardEngine {
  // NRT earned by user from data consumption
  calculateUserReward(input: {
    dataBytes: number;
    campaignId: string;
    deviceId: string;
    userId: string;
    ispId: string;
  }): RewardDistribution {
    const dataGB = input.dataBytes / (1024 ** 3);
    const baseRate = await this.getBaseRate();       // Admin configured NRT/GB
    const nhs = await this.getCurrentNHS();
    const nhsMult = 1 + Math.tanh((nhs - 50) / 20) * 0.5; // 0.75–1.25×
    const campBonus = await this.getCampaignBonus(input.campaignId);

    const gross = dataGB * baseRate * nhsMult * campBonus;

    return {
      userNRT:  gross * 0.85,  // 85% to user
      spShare:  gross * 0.10,  // 10% to SP
      ispShare: gross * 0.05,  // 5%  to ISP
      grossNRT: gross,
      nhsScore: nhs,
      txRef: crypto.randomUUID()
    };
  }
}
```

### 3.3 NHS Calculation Service

```typescript
class NHSService {
  private weights = {
    ispDataFlow:      0.20,
    marketDemand:     0.20,
    spIspNRTPurchase: 0.15,
    userEngagement:   0.15,
    investorBacking:  0.10,
    paymentFeeVolume: 0.10,
    dataConsumption:  0.10
  };

  async calculate(): Promise<number> {
    const raw = await this.gatherSignals();
    const normalized = this.normalize(raw);  // Scale each to 0–100

    const score = Object.entries(this.weights)
      .reduce((s, [k, w]) => s + normalized[k] * w, 0);

    const clamped = Math.max(0, Math.min(100, score));
    await this.persist(clamped, raw);
    await this.broadcast(clamped);  // WebSocket nhs:update
    return clamped;
  }
}
// Scheduled: every 5 minutes via BullMQ cron
```

### 3.4 NRT Price Algorithm

```typescript
class PriceOracle {
  private weights = {
    campaignDemand:   0.30,
    exchangerVolume:  0.25,
    dataConsumption:  0.20,
    p2pActivity:      0.15,
    investorFund:     0.10
  };

  async calculatePrice(): Promise<number> {
    const signals = await this.fetchSignals();
    const composite = Object.entries(this.weights)
      .reduce((s, [k, w]) => s + (signals[k] || 0) * w, 0);

    const price = this.basePrice * (1 + composite);
    await redis.set('nrt:price', price, 'EX', 60);  // 1-min cache
    await websocket.broadcast('token:price_update', { price, timestamp: Date.now() });
    return price;
  }
}
// Scheduled: every 1 minute
```

### 3.5 WebSocket Server

```typescript
// Socket.IO on same port as API (path: /ws)
io.use(wsAuthMiddleware);  // Verify JWT on connect

io.on('connection', (socket) => {
  const { userId, role } = socket.data;

  socket.on('subscribe:dashboard', () => socket.join(`dashboard:${userId}`));
  socket.on('subscribe:earnings',  () => socket.join(`earnings:${userId}`));
  socket.on('subscribe:nhs',       () => socket.join('nhs:global'));
  socket.on('subscribe:token_price', () => socket.join('token:global'));
  socket.on('subscribe:p2p_trade', (tradeId) => socket.join(`p2p:${tradeId}`));

  socket.on('disconnect', () => logger.info(`User ${userId} disconnected`));
});

// Emit from reward engine:
io.to(`earnings:${userId}`).emit('earnings:new', { nrt, app, campaign, ts });
io.to('nhs:global').emit('nhs:update', { score, multiplier });
io.to('token:global').emit('token:price_update', { price, change24h });
io.to(`p2p:${tradeId}`).emit('p2p:trade_status', { status, message });
```

### 3.6 Background Jobs (BullMQ)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `nhs:calculate` | Every 5 min | Recalculate NHS score |
| `price:update` | Every 1 min | Update NRT price oracle |
| `rewards:distribute` | Every 1 min | Process pending reward claims |
| `withdrawals:process` | Every 15 min | Fiat withdrawal via gateway |
| `data:aggregate` | Every 1 hr | Aggregate usage stats |
| `cache:warm` | Every 10 min | Pre-warm dashboard caches |
| `sessions:cleanup` | Daily | Remove expired sessions |

### 3.7 Caching (Redis)

| Key | TTL | Value |
|-----|-----|-------|
| `nhs:current` | 5 min | Current NHS score |
| `nrt:price` | 1 min | Current NRT price |
| `dashboard:stats:{userId}` | 30s | User dashboard stats |
| `campaigns:list:{hash}` | 2 min | Filtered campaign list |
| `rate:{ip}:{endpoint}` | varies | Rate limit counters |

---

## 4. Blockchain Integration

### 4.1 NRT Token (Solana SPL)

```
Token Standard: SPL Token (Token-2022 for transfer fees)
Network: Solana Mainnet-Beta (Devnet for testing)
Total Supply: 1,000,000,000 NRT
Decimals: 9
```

### 4.2 Token Distribution

| Allocation | % | Amount | Vesting |
|-----------|---|--------|---------|
| Community Rewards Pool | 30% | 300M NRT | Released on-demand |
| SP/ISP Incentives | 25% | 250M NRT | 12-month linear |
| Liquidity Pool (DEX) | 20% | 200M NRT | Locked 6 months |
| Team & Dev | 15% | 150M NRT | 24-month cliff+linear |
| Reserve | 10% | 100M NRT | DAO-controlled |

### 4.3 Token Creation Steps

```bash
# 1. Install Solana CLI + SPL Token CLI
solana config set --url mainnet-beta
solana-keygen new --outfile treasury.json

# 2. Create token mint (Token-2022)
spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --enable-transfer-fee 50 --maximum-fee 1000000  # 0.5% fee, max 1 NRT

# 3. Set mint authority to multi-sig
spl-token authorize <MINT_ADDR> mint <MULTISIG_ADDR>

# 4. Create treasury ATA and mint initial supply
spl-token create-account <MINT_ADDR>
spl-token mint <MINT_ADDR> 1000000000

# 5. Seed liquidity pools (Raydium)
# 6. Create vesting contracts (Streamflow.finance)
```

### 4.4 Multi-Sig Treasury (Squads Protocol)

```
Members: CEO, CTO, CFO, Legal, Board Member (5 total)
Threshold: 3-of-5 for any treasury operation
Operations requiring multi-sig:
  - Minting additional tokens
  - Burning tokens
  - Moving treasury funds > 10,000 NRT
  - Changing fee parameters
  - Emergency pause
```

### 4.5 On-Chain Operations

| Operation | Trigger | Flow |
|-----------|---------|------|
| Reward Distribution | User claims | Backend signs with treasury hot wallet → SPL transfer |
| Scan2Pay | User pays SP | User wallet signs → SPL transfer to SP wallet |
| P2P Escrow Lock | Trade initiated | Smart contract holds NRT |
| P2P Escrow Release | Payment confirmed | Contract releases to buyer |
| Withdrawal | User requests fiat | NRT burned → fiat sent via gateway |
| Campaign Funding | SP creates campaign | SP wallet → escrow contract |

### 4.6 Escrow Smart Contract

```rust
// Anchor program for P2P escrow
#[program]
pub mod nrt_p2p_escrow {
    pub fn lock_escrow(ctx: Context<LockEscrow>, amount: u64, trade_id: [u8; 32]) -> Result<()> {
        // Transfer NRT from seller to escrow PDA
        // Store trade_id, buyer, seller, expiry
    }

    pub fn release_escrow(ctx: Context<ReleaseEscrow>, trade_id: [u8; 32]) -> Result<()> {
        // Only callable by buyer (confirmed payment) or admin (dispute resolution)
        // Transfer from escrow PDA to buyer
    }

    pub fn cancel_escrow(ctx: Context<CancelEscrow>, trade_id: [u8; 32]) -> Result<()> {
        // Returns NRT to seller (timeout or mutual cancel)
    }
}
```

---

## 5. Scan2Pay Technical Flow

### 5.1 State Machine

```typescript
type Scan2PayStatus =
  | 'INITIATED'   // QR scanned, decoding
  | 'VALIDATING'  // Server checking QR + user balance
  | 'PROCESSING'  // DB debit/credit in progress
  | 'CONFIRMING'  // Waiting for Solana block confirmation
  | 'SUCCESS'     // Fully settled
  | 'FAILED'      // Any validation or processing failure
  | 'PENDING'     // Solana RPC timeout — awaiting confirmation
  | 'CANCELLED'   // User cancelled before confirm
  | 'TIMEOUT'     // QR expired (> 5 min TTL)
  | 'REFUNDED';   // On-chain failed after DB debit — auto-reversed
```

### 5.2 Frontend Implementation

```typescript
// ScanToPay.tsx enhanced state machine
type ScanStep = 'scanning' | 'decoding' | 'detected' | 'confirming'
              | 'success' | 'failed' | 'pending' | 'cancelled' | 'timeout';

// QR decode via jsQR library
import jsQR from 'jsqr';

function decodeFrame(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, canvas.width, canvas.height);
  if (code) return code.data;  // JWT-signed payload
}

// Payment flow with status handling
async function handlePay(payload: Scan2PayPayload) {
  setStep('confirming');
  const { data, error } = await api.post('/wallet/pay', payload);

  switch (data?.status) {
    case 'success':   setStep('success'); break;
    case 'pending':   setStep('pending'); subscribeToPendingTx(data.txId); break;
    case 'cancelled': setStep('cancelled'); break;
    case 'timeout':   setStep('timeout'); break;
    case 'failed':    setStep('failed'); setErrorCode(data.code); break;
    case 'refunded':  setStep('failed'); setErrorCode('REFUNDED'); break;
  }
}

// Subscribe to WebSocket for PENDING → SUCCESS/FAILED resolution
function subscribeToPendingTx(txId: string) {
  socket.on('scan2pay:confirmed', ({ txId: t, status }) => {
    if (t === txId) setStep(status === 'success' ? 'success' : 'failed');
  });
}
```

### 5.3 UI Screens per State

| State | Screen | Primary CTA |
|-------|--------|-------------|
| scanning | Camera viewfinder + scan line animation | — |
| detected | Merchant card + amount + fiat equivalent | Confirm / Cancel |
| confirming | Spinner "Processing payment…" | — |
| success | ✅ Green checkmark + amount + merchant | View Receipt |
| failed | ❌ Red icon + specific error message (e.g. INSUFFICIENT_BALANCE) | Try Again |
| pending | ⏳ Spinner "Confirming on blockchain…" | — (auto-resolves) |
| cancelled | Grey screen "Payment cancelled" | Back to Wallet |
| timeout | Clock icon "QR code expired" | Scan New Code |
| refunded | Info icon "Payment failed — NRT refunded" | View Wallet |

### 5.4 Backend Controller

```typescript
// scan2payController.ts
async function processPayment(req, res) {
  const { merchantId, amountNRT, ref, pin, deviceId } = req.body;
  const userId = req.user.id;

  // VALIDATING — idempotency check
  if (await redis.get(`s2p:ref:${ref}`)) {
    return res.json({ status: 'failed', code: 'DUPLICATE_REF' });
  }

  // VALIDATING — pre-flight checks
  const [user, merchant, tokenFrozen] = await Promise.all([
    db.wallet.findByUserId(userId),
    db.wallet.findByUserId(merchantId),
    db.settings.get('token_frozen')
  ]);

  if (tokenFrozen) return res.json({ status: 'failed', code: 'TOKEN_FROZEN' });
  if (!await verifyPin(userId, pin)) return res.json({ status: 'failed', code: 'INVALID_PIN' });
  if (user.nrt_balance < amountNRT + fee) return res.json({ status: 'failed', code: 'INSUFFICIENT_BALANCE' });
  if (!merchant || merchant.status !== 'active') return res.json({ status: 'failed', code: 'MERCHANT_INACTIVE' });

  // PROCESSING — atomic DB transaction
  const txId = crypto.randomUUID();
  await db.transaction(async (trx) => {
    await trx.wallet.decrement(userId, amountNRT + fee);
    await trx.wallet.increment(merchantId, amountNRT);
    await trx.transactions.insert({ id: txId, type: 'scan2pay', status: 'processing',
      userId, merchantId, amountNRT, fee, scan2payRef: ref });
  });
  await redis.set(`s2p:ref:${ref}`, txId, 'EX', 86400); // 24hr dedup

  // CONFIRMING — on-chain if above threshold
  if (amountNRT > ON_CHAIN_THRESHOLD) {
    try {
      const sig = await solanaService.transfer(userId, merchantId, amountNRT);
      await db.transactions.update(txId, { status: 'success', blockchainSig: sig });
      return res.json({ status: 'success', txId, onChainSig: sig });
    } catch (err) {
      // REFUNDED — reverse the DB transaction
      await db.transaction(async (trx) => {
        await trx.wallet.increment(userId, amountNRT + fee);
        await trx.wallet.decrement(merchantId, amountNRT);
        await trx.transactions.update(txId, { status: 'refunded' });
      });
      return res.json({ status: 'failed', code: 'BLOCKCHAIN_ERROR', refundStatus: 'auto_refunded' });
    }
  }

  // Internal ledger only (below threshold)
  await db.transactions.update(txId, { status: 'success' });
  return res.json({ status: 'success', txId });
}
```

  return res.json({ status: 'success', txId });
}
```

### 5.5 SP Platform Checkout Integration (Technical)

#### 5.5.1 Checkout Session Generation
SP backend creates a checkout session to prevent client-side tampering of the amount/merchant.
```typescript
// POST /api/v1/scan2pay/generate
// Headers: X-SP-API-Key: <key>, X-HMAC-Signature: <sig>
async function generateCheckout(req, res) {
  const { amountNRT, description, expiresIn } = req.body;
  const merchantId = req.sp.id;
  const ref = crypto.randomUUID();
  
  // JWT payload includes merchant and amount to prevent tampering
  const payload = jwt.sign({
    merchantId,
    amountNRT,
    ref,
    exp: Math.floor(Date.now() / 1000) + (expiresIn || 300)
  }, process.env.SCAN2PAY_SECRET);

  return res.json({
    qrPayload: payload,
    ref,
    expiresAt: new Date(Date.now() + (expiresIn || 300) * 1000)
  });
}
```

#### 5.5.2 Mobile Deep-link Payload
```
netreward://checkout?payload=<JWT_SIGNED_SESSION>
```
When NetReward app receives this:
1.  **Decode JWT**: Verify signature and expiration.
2.  **State Init**: Set app state to `CONFIRMING` payment for `{ merchant, amount }`.
3.  **UI Switch**: Navigate directly to `ScanConfirmModal`.

---

## 5.6 SP Data Usage Monitoring — Technical Design

### Why This Is Critical
NetReward rewards users for data consumed on **specific SP apps/platforms** during active campaigns. The challenge: monitor multiple registered SP apps accurately across Android, iOS, and web — even when the NetReward app is backgrounded, minimized, or killed.

### Solution Architecture: Three-Layer Monitoring

```
Layer 1: SP Tracker SDK (Primary — works on all platforms)
Layer 2: NetReward Background Service (Android — secondary/verification)
Layer 3: Browser Extension (Web — Chrome/Firefox)
```

### Layer 1: SP Tracker SDK

All SPs integrating with NetReward **must** embed the NetReward Tracker SDK. This is enforced at service registration: SDK integration verified before campaign goes live.

> **Implementation Status: ✅ Complete**
> - SDK Client: `src/lib/netreward-sdk.ts` (NetRewardSDK class)
> - Edge Function: `supabase/functions/tracking/index.ts`
> - Reward Engine RPC: `supabase/migrations/00030_reward_engine_v2.sql`

```typescript
// @netreward/tracker SDK — Actual Implementation (src/lib/netreward-sdk.ts)
import { NetRewardSDK } from '@netreward/sdk';

const sdk = new NetRewardSDK({
  apiKey: 'sp_live_xxxxx',       // services.api_key
  secretKey: 'sk_xxxxx',        // services.secret_key (never expose client-side)
  endpoint: 'https://<project>.supabase.co/functions/v1/tracking',
});

// Track a single session immediately
await sdk.trackSession({
  deviceId: 'device-uuid',
  campaignId: 'campaign-uuid',
  sessionId: 'unique-session-id',
  bytesUp: 1024000,
  bytesDown: 50240000,
  durationSeconds: 300,
});

// Or buffer events and auto-flush every 30s
sdk.bufferEvent({ ... });
sdk.startAutoFlush(30000);

// Features: HMAC-SHA256 signing, exponential retry, batch processing (max 100)
```

```
// Android (Kotlin) SDK — equivalent (planned)
// iOS (Swift) SDK — equivalent (planned)
```

**SP Integration Verification Flow:**
```
SP registers service → Admin reviews → SDK test call required
  → Admin sends test payload → SDK must respond with valid HMAC
  → Only then is campaign allowed to go live
```

### Layer 2: Android Background Service

```kotlin
// NetRewardTrackingService.kt (Android Foreground Service)
class NetRewardTrackingService : Service() {

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(NOTIF_ID, buildNotification("NRT Tracking Active"))
    schedulePolling()
    return START_STICKY  // Restart if killed
  }

  private fun schedulePolling() {
    val workRequest = PeriodicWorkRequestBuilder<DataPollWorker>(
      repeatInterval = 30, TimeUnit.SECONDS
    ).setConstraints(
      Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
    ).build()
    WorkManager.getInstance(this).enqueueUniquePeriodicWork(
      "nrt_data_poll", ExistingPeriodicWorkPolicy.KEEP, workRequest
    )
  }
}

// DataPollWorker.kt
class DataPollWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

  override suspend fun doWork(): Result {
    val activeCampaignApps = fetchActiveCampaignPackages()  // from local cache
    val snapshots = activeCampaignApps.map { (pkg, campaignId) ->
      val uid = packageManager.getApplicationInfo(pkg, 0).uid
      val rxBytes = TrafficStats.getUidRxBytes(uid.toLong())
      val txBytes = TrafficStats.getUidTxBytes(uid.toLong())
      val delta = calculateDelta(pkg, rxBytes, txBytes)  // vs last snapshot
      DataSnapshot(pkg, campaignId, delta.rx, delta.tx, System.currentTimeMillis())
    }
    reportToServer(snapshots)
    saveSnapshots(snapshots)  // Store for next delta calculation
    return Result.success()
  }
}
```

**Permission requirements displayed to user on setup:**
```
"To earn NRT, NetReward needs:"
  ✓ Usage Access — to see which apps you use
  ✓ Network Stats — to measure data used per app
  ✓ Run in Background — to track while you use other apps
  ✓ Show Notification — required for background service (Android 8+)
```

### Layer 3: Browser Extension (Web)

```typescript
// background/service-worker.ts (Chrome MV3)
const campaignDomains = new Map<string, string>(); // domain → campaignId
let usageBuffer: DomainUsage[] = [];

// Load SP domain registry on startup
async function loadCampaignRegistry() {
  const registry = await fetch('https://api.netreward.io/v1/campaigns/active-domains',
    { headers: { Authorization: `Bearer ${await getStoredToken()}` } }
  );
  const data = await registry.json();
  data.forEach(({ domain, campaignId }) => campaignDomains.set(domain, campaignId));
}

// Track bytes per completed request
chrome.webRequest.onCompleted.addListener((details) => {
  const url = new URL(details.url);
  const campaignId = campaignDomains.get(url.hostname);
  if (campaignId) {
    usageBuffer.push({
      domain: url.hostname, campaignId,
      bytes: details.responseHeadersSize + (details.transferSize || 0),
      timestamp: Date.now()
    });
  }
}, { urls: ['<all_urls>'] }, ['responseHeaders']);

// Flush every 60s via alarm
chrome.alarms.create('flush', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'flush' && usageBuffer.length > 0) {
    await reportUsage(usageBuffer.splice(0));
  }
});
```

### Cross-Platform Data Reconciliation

```
For the same user + campaign + time period:

Android:
  SDK report: 450 MB (foreground)
  TrafficStats: 480 MB (foreground + some background difference)
  Accepted range: ±20% → both valid
  Award based on: min(SDK, TrafficStats) to prevent over-claiming

iOS:
  SDK report only (no independent verification possible)
  Higher fraud risk → lower trust score → more conservative reward cap

Web:
  Extension bytes + SDK report
  Cross-reference: extension captures all HTTP, SDK captures app-level
  Award based on extension measurement (more objective)

Server reconciliation logic:
  if abs(sdk - device) / device < 0.20: use sdk  // within 20%
  else: hold for manual review, flag in admin anomaly queue
```

### Anti-Fraud & Validation Pipeline

```typescript
// trackingService.ts — server-side validation
async function validateReport(report: TrackingReport): Promise<ValidationResult> {
  const checks = await Promise.all([
    verifyHMAC(report),              // 1. Signature valid
    checkDuplicateSession(report.sessionId),  // 2. Not duplicate
    checkAnomalyRules(report),       // 3. Plausible data volume
    checkCampaignActive(report.campaignId),   // 4. Campaign still live
    checkBudgetRemaining(report.campaignId, report.dataBytes), // 5. Budget OK
    crossReferenceDevice(report),    // 6. Android: compare SDK vs TrafficStats
  ]);

  if (checks.some(c => !c.passed)) {
    return { valid: false, reasons: checks.filter(c => !c.passed).map(c => c.reason) };
  }
  return { valid: true };
}

// Anomaly rules
const ANOMALY_RULES = [
  { name: 'MAX_SESSION_GB', check: (r) => r.dataBytes < 100 * 1024**3 },       // < 100 GB/session
  { name: 'MAX_HOURLY_GB',  check: (r) => r.hourlyRate < 10 * 1024**3 },        // < 10 GB/hr
  { name: 'NETWORK_SPEED',  check: (r) => r.dataBytes / r.duration < 1.25e9 },  // < 10 Gbps
  { name: 'OFFLINE_CHECK',  check: (r) => !deviceWasOffline(r.deviceId, r.timestamp) },
];
```

### New DB Tables Required

```sql
-- SP SDK API Keys
CREATE TABLE sp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sp_id UUID REFERENCES public.users(id),
  api_key TEXT UNIQUE NOT NULL,       -- sp_live_xxxxx
  secret_key TEXT NOT NULL,           -- for HMAC signing (hashed in DB)
  status TEXT DEFAULT 'active',
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Data Usage Sessions (from SDK + device service)
CREATE TABLE tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,    -- idempotency key
  user_id UUID REFERENCES public.users(id),
  sp_id UUID REFERENCES public.users(id),
  campaign_id UUID REFERENCES campaigns(id),
  device_id UUID REFERENCES devices(id),
  source TEXT NOT NULL,               -- 'sdk'|'android_service'|'extension'
  data_rx_bytes BIGINT DEFAULT 0,
  data_tx_bytes BIGINT DEFAULT 0,
  duration_seconds INT,
  nrt_awarded NUMERIC(18,9) DEFAULT 0,
  status TEXT DEFAULT 'pending',      -- pending|rewarded|rejected|held
  reject_reason TEXT,
  validation_score NUMERIC(3,2),      -- 0.00–1.00
  recorded_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ
);

-- Campaign-App Target Registry
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

-- Anomaly Flags (for admin review)
CREATE TABLE tracking_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES tracking_sessions(session_id),
  user_id UUID REFERENCES public.users(id),
  flag_type TEXT NOT NULL,            -- 'HIGH_VOLUME'|'IMPOSSIBLE_SPEED'|'MISMATCH'|'DUPLICATE'
  details JSONB,
  status TEXT DEFAULT 'open',         -- open|reviewed|cleared|actioned
  admin_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. SP Service Integration — Full Technical Design

### 6.1 Current Frontend State (Audit)

`CreateService.tsx` currently collects:
- Service name, logo (local preview), category
- Web URL, Google Play Store URL, App Store URL
- Simulates 3.5s "verification" — no real API call

**Gaps identified (required for production):**
| Missing Field | Why Needed |
|--------------|------------|
| Android Package Name (e.g. `com.netflix.mediaclient`) | Required by Android `TrafficStats` and campaign_app_targets |
| iOS Bundle ID (e.g. `com.netflix.Netflix`) | Required for iOS tracking registry |
| Web Domain (e.g. `netflix.com`) | Required for Chrome Extension domain filter |
| Webhook URL | SP receives real-time event notifications |
| API Key (server-generated) | SP uses for SDK authentication |
| Description | Displayed in admin and user-facing listings |

### 6.2 Complete SP Service Registration Flow

```
Step 1 — SP submits form:
  POST /api/v1/services
  Body: {
    name, category, description, logoFile,
    webUrl, webDomain,
    androidPlayStoreUrl, androidPackage,
    iosAppStoreUrl, iosBundleId,
    webhookUrl
  }

Step 2 — Server processes:
  - Upload logo → Supabase Storage → get logoUrl
  - Generate: apiKey (sp_live_xxxxx), secretKey (stored hashed)
  - Insert into services table (status: 'pending_verification')
  - Insert into campaign_app_targets:
      { android_package, ios_bundle_id, web_domain }
  - Insert into sp_api_keys

Step 3 — SDK Verification (admin-triggered or auto):
  Admin: POST /api/v1/admin/services/:id/verify
    → Server sends test HMAC ping to SP's webhookUrl
    → SP webhook must respond: { ack: true, hmac: validSignature }
    → If valid: service.status → 'active'
    → Admin dashboard shows verified badge ✅

Step 4 — SP receives credentials:
  Response: {
    service: { id, name, status: 'active' },
    credentials: {
      apiKey: 'sp_live_xxxxx',        // Public — include in SDK init
      secretKey: 'sk_xxxxx',          // Secret — HMAC signing only
      webhookSecret: 'whs_xxxxx'      // Verify incoming NetReward webhooks
    }
  }
  ⚠️ Secret key shown ONCE — SP must store securely
```

### 6.3 SP SDK Integration Steps (Post-Registration)

```
1. SP installs SDK:
   npm install @netreward/tracker

2. SP initializes SDK in their app:
   import { NetRewardTracker } from '@netreward/tracker';
   const nrt = new NetRewardTracker({
     apiKey: 'sp_live_xxxxx',   // from registration
     campaignId: 'camp_yyy',    // active campaign ID
   });

3. SP links user account (when user logs in to SP app):
   nrt.identifyUser({ nrtUserId: user.nrtId });
   // nrtUserId obtained via NetReward OAuth or user provides it

4. SP tracks data usage:
   // After each API response:
   nrt.trackDataUsage({ bytes: response.headers['content-length'] });
   // Or on session end:
   nrt.trackSession({ startTime, endTime, totalBytes });

5. SP receives webhook events from NetReward:
   POST to SP's webhookUrl:
   { event: 'reward.distributed', userId, nrtAmount, campaignId, timestamp }
   // SP can use this to show reward notification in their own app
```

### 6.4 SP Payment & Revenue Flow

```
Campaign Funding (before campaign goes live):
  SP deposits NRT into campaign escrow:
  POST /api/v1/campaigns/:id/fund
    Body: { amountNRT }
    → Deduct from SP wallet
    → campaign.budget_remaining += amountNRT
    → Campaign status: 'active'
  Campaign auto-pauses when budget_remaining < min_reward_threshold

Revenue (SP earns 10% of user NRT from their campaign):
  When reward engine distributes reward:
    userNRT  = gross × 0.85
    spShare  = gross × 0.10  → credited to SP wallet instantly
    ispShare = gross × 0.05  → credited to ISP wallet

SP Withdrawal:
  POST /api/v1/wallet/withdraw
    → Same flow as user withdrawal
    → NRT → fiat via country-appropriate gateway

SP Dashboard Metrics (what dashboard displays):
  - NRT Distributed: total user rewards from SP's campaigns
  - Active Campaigns: count of live campaigns
  - Users Reached: distinct users who earned from SP
  - Revenue (10%): spShare accumulated
  Charts: Campaigns / Checkout / Cashback — time filters: 24H, 7D, 3M, All
```

### 6.5 SP Service Verification Steps (shown in UI during verifying state)

The UI currently shows mock steps. Real backend equivalents:
```
"Checking Web hooks..."
  → GET https://sp-webhookurl/health
  → Expects HTTP 200

"Pinging Android SDK..."
  → Check if android_package is resolvable on Play Store API
  → Verify package not already registered by another SP

"Validating iOS signatures..."
  → Check ios_bundle_id exists in App Store API
  → Verify bundle not already registered

All pass → service.status = 'active', credentials returned
Any fail → service.status = 'verification_failed', reason stored
```

---

## 6b. ISP Network Integration — Full Technical Design

### 6b.1 Current Frontend State (Audit)

`CreateNetwork.tsx` currently collects:
- Network name, logo (local preview), category (Telecommunication, Satellite, Fiber, Mobile, Broadband, Other)
- **Country** (dropdown with 12 preloaded options)
- **Signal Strength** (slider 0-100% with color-coded indicator)
- **Coverage Regions** (text input, e.g. "North America, Europe")
- **ASN** (text input, e.g. "AS6453")
- **IP Ranges** (textarea, one CIDR block per line)
- **Handshake URL** (ISP endpoint for BGP challenge-response)
- **Webhook URL** (ISP receives data flow summaries)
- Simulates 3.5s "NetReward handshake API" — mock verification (real API pending)
- On success: displays generated `apiKey` + `apiSecret` with copy-to-clipboard

**Frontend Status: ✅ Complete** — all form fields, validation, and credential display implemented.

**Remaining for production:**
| Gap | Notes |
|-----|-------|
| Real handshake verification | Replace setTimeout mock with actual BGP challenge-response |
| ASN/IP RIPE/ARIN validation | Backend BGP lookup needed |
| Supabase Storage for logo | Currently uses base64 data URL |

### 6b.2 Complete ISP Network Registration Flow

```
Step 1 — ISP submits form:
  POST /api/v1/networks
  Body: {
    name, category, logoFile,
    country,              // ISO 3166-1 alpha-2
    asn,                  // e.g. "AS6453" (Tata Communications)
    ipRanges: string[],   // CIDR blocks e.g. ["197.210.0.0/16", "41.58.0.0/17"]
    handshakeUrl,         // ISP's verification endpoint
    webhookUrl            // ISP receives data flow summaries
  }

Step 2 — Server processes:
  - Upload logo → Supabase Storage
  - Generate: apiKey, secretKey
  - Insert into isp_networks:
    { isp_id, name, country, asn, ip_ranges, status: 'pending_verification' }
  - Insert into isp_api_keys

Step 3 — Network Handshake Verification:
  Server sends signed challenge to ISP's handshakeUrl:
    POST ISP_handshakeUrl
    { challenge: 'nonce_xyz', timestamp, hmac }
  ISP system must respond within 30s:
    { ack: nonce_xyz, asn: 'AS6453', ipRanges: [...] }
  Server validates:
    - ASN matches registered network via public BGP data (RIPE/ARIN)
    - IP ranges are a subset of ASN's announced prefixes
    - Response HMAC is valid
  If valid → network.status = 'active'

Step 4 — ISP receives credentials:
  { network: { id, name, country, asn, status: 'active' },
    credentials: { apiKey, secretKey, webhookSecret } }
```

### 6b.3 ISP Network Monitoring — How It Works

```
ISP integration works on two levels:

Level 1: Passive (NetReward-side)
  When a user's device reports data consumption:
    - Device IP is checked against registered ISP ip_ranges
    - If match found → credit that ISP's account (5% share)
    - ISP wallet auto-credited with each reward distribution
  No ISP action required after registration.

Level 2: Active (ISP API Integration)
  For enterprise ISP partners with direct API integration:
    ISP pushes aggregated data flow reports to NetReward:
    POST /api/v1/tracking/isp-report
    Headers: X-ISP-API-Key, X-HMAC-Sig
    Body: {
      networkId,
      userId,         // ISP subscriber ID (linked to NRT user)
      periodStart, periodEnd,
      totalDataBytes,
      appBreakdown: [{ appDomain, bytes }]  // optional, from DPI
    }
  These ISP reports cross-validate SDK reports (ISP is ground truth).
  Discrepancy > 30% → flag for admin review

ISP Network Health Metrics sent to ISP dashboard:
  - Signal quality (0–100%)
  - Total data consumed via their network
  - NRT cashback earned (5% of user rewards)
  - Active subscribers using NetReward
```

### 6b.4 ISP Payment & Revenue Flow

```
Revenue (ISP earns 5% of user NRT from their network):
  ispShare = gross × 0.05 → credited to ISP wallet per reward event

ISP Campaign Funding:
  ISP creates supplementary campaign for their subscribers:
  POST /api/v1/campaigns
    → ISP deposits NRT into campaign budget
    → Users on ISP's network earn bonus NRT during campaign

ISP Dashboard Metrics:
  - NRT Distributed: total user rewards over ISP's network
  - Active Campaigns: ISP-created campaigns
  - Customers: distinct subscribers using NRT
  - Earnings / Balance: 5% cashback accumulated
  - Network signal: real-time quality metric
  Charts: Campaigns / Cashback / Network — time filters: 24H, 7D, 3M, All

ISP Withdrawal:
  Same flow as user/SP withdrawal
  NRT → fiat via country-appropriate gateway
```

### 6b.5 New DB Tables Required

```sql
-- SP API Keys (generated at service registration)
CREATE TABLE sp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  sp_id UUID REFERENCES public.users(id),
  api_key TEXT UNIQUE NOT NULL,       -- sp_live_xxxxx (public)
  secret_key_hash TEXT NOT NULL,      -- bcrypt of secret key
  webhook_url TEXT,
  webhook_secret_hash TEXT,
  status TEXT DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ISP API Keys (generated at network registration)
CREATE TABLE isp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID REFERENCES isp_networks(id) ON DELETE CASCADE,
  isp_id UUID REFERENCES public.users(id),
  api_key TEXT UNIQUE NOT NULL,
  secret_key_hash TEXT NOT NULL,
  handshake_url TEXT,
  webhook_url TEXT,
  status TEXT DEFAULT 'active',
  last_handshake_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Update services table (add missing fields)
ALTER TABLE services ADD COLUMN android_package TEXT;
ALTER TABLE services ADD COLUMN ios_bundle_id TEXT;
ALTER TABLE services ADD COLUMN web_domain TEXT;
ALTER TABLE services ADD COLUMN webhook_url TEXT;
ALTER TABLE services ADD COLUMN description TEXT;
ALTER TABLE services ADD COLUMN status TEXT DEFAULT 'pending_verification';

-- Update isp_networks table (add missing fields)
ALTER TABLE isp_networks ADD COLUMN handshake_url TEXT;
ALTER TABLE isp_networks ADD COLUMN webhook_url TEXT;
ALTER TABLE isp_networks ADD COLUMN status TEXT DEFAULT 'pending_verification';
-- asn, ip_ranges, country already in schema ✅

-- Webhook Events log
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,          -- 'sp'|'isp'
  target_id UUID NOT NULL,
  event_type TEXT NOT NULL,           -- 'reward.distributed'|'campaign.ended'|etc.
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',      -- pending|delivered|failed
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 6b.6 Frontend Updates Needed

```
CreateService.tsx — add fields:
  + Description (textarea)
  + Android Package Name input (below Android Play URL)
  + iOS Bundle ID input (below App Store URL)
  + Web Domain input (derived from webUrl or manual)
  + Webhook URL input (optional at first, required for active verification)
  + After success: show API key + secret key card (copy-to-clipboard)
  + Real verification steps replace setTimeout mock

CreateNetwork.tsx — ✅ COMPLETED:
  + Country selector (dropdown)
  + ASN input (e.g. AS6453)
  + IP Ranges (textarea, one CIDR per line)
  + Handshake URL (ISP's verification endpoint)
  + Webhook URL (data flow summaries)
  + Signal Strength slider (0-100%)
  + Coverage regions text input
  + After success: show API key + secret key card (copy-to-clipboard)
  + Real handshake verification replaces setTimeout mock (backend TODO)
```

---

## 7. P2P Backend Flow

```
Create Offer:
  POST /p2p/offers → store in p2p_offers table

Initiate Trade:
  POST /p2p/trades
    → Create p2p_trades row (status: pending)
    → Lock seller's NRT in escrow PDA (Solana)
    → Emit p2p:trade_status to buyer + seller sockets
    → Start 15-min countdown

Buyer Confirms Payment:
  POST /p2p/trades/:id/confirm-payment
    → Upload proof to Supabase Storage
    → Update status: paid
    → Notify seller via WebSocket + push

Seller Releases:
  POST /p2p/trades/:id/release
    → Call escrow program release()
    → Update status: completed
    → Credit buyer wallet
    → Record transaction

Dispute:
  POST /p2p/trades/:id/dispute
    → Create p2p_disputes row
    → Admin notified
    → Admin reviews via AdminP2P → Disputes tab (chat)
    → Admin resolves: release to buyer or return to seller
```

---

## 7. Country-Based Management

### 7.1 Country Routing for Payment Gateways

```typescript
function selectGateway(country: string, amount: number): Gateway {
  const africaCountries = ['NG','GH','KE','ZA','SN','CI','UG','TZ'];
  const restricted = ['KP','IR','SY','CU','RU']; // OFAC

  if (restricted.includes(country)) throw new GeoBlockedError();
  if (africaCountries.includes(country)) return 'paystack'; // or flutterwave
  if (['US','GB','EU'].includes(country)) return 'stripe';
  return 'flutterwave'; // global fallback
}
```

### 7.2 Country-Specific KYC

```typescript
const kycRequirements: Record<string, string[]> = {
  'NG': ['government_id', 'selfie', 'bvn'],
  'GH': ['government_id', 'selfie', 'ghana_card'],
  'US': ['ssn_last4', 'government_id', 'selfie'],
  '*':  ['government_id', 'selfie']  // default
};
```

---

## 8. Security Implementation

### 8.1 Defense Layers

```
Layer 1: Cloudflare WAF + DDoS protection (DNS proxy)
Layer 2: Nginx rate limiting (connection + request limits)
Layer 3: Redis rate limiting (per IP per endpoint)
Layer 4: JWT verification (RS256 middleware)
Layer 5: Role-based authorization (RBAC middleware)
Layer 6: RLS policies (Supabase — all tables)
Layer 7: Zod input validation (all endpoints)
Layer 8: AES-256 at rest (Supabase managed)
Layer 9: Audit logging (all admin mutations)
Layer 10: Multi-sig for treasury (Squads)
```

### 8.2 Emergency Procedures

| Emergency | Action | System Impact |
|-----------|--------|--------------|
| Token exploit | Admin freezes token | All NRT ops halted globally |
| DDoS attack | Cloudflare rate block | Automatic, under 1 min |
| DB breach | Supabase disable external access | Manual, 5 min |
| P2P fraud wave | Suspend P2P module | Admin toggle, instant |
| Price crash | Pause reward distribution | Admin toggle, instant |

---

## 9. Frontend Migration Plan (Mock → Live)

### Priority Order

```
Phase 1: Auth (2 weeks) ✅ COMPLETE
  - Supabase signIn/signUp with role from JWT metadata
  - Session refresh + auto-logout
  - Admin login gate (/admin/login)

Phase 2: User Data (3 weeks) ✅ COMPLETE
  - useWallet hook (real DB balance)
  - Live transaction history from Supabase (useTransactions)
  - Real campaign enrollment (useCampaigns)
  - Fiat withdrawal pipeline (useWithdrawals + WithdrawModal)
  - Support tickets (useSupportTickets)
  - Referral program (useReferrals)
  - P2P disputes (useDisputes)
  - Profile settings (useProfile + Supabase Auth password)
  - Role switching (switch_user_role RPC)

Phase 3: Admin (2 weeks) ✅ PARTIAL
  - KYC review connected to Supabase
  - User management connected to Supabase
  - Remaining admin stores still use Zustand mock data

Phase 4: Tracking & Reward Engine (🟡 NEXT)
  - Device registration UI wired to DB (devices table exists: migration 00020)
  - Reward Engine RPC (process_tracking_report)
  - Dashboard data hydration (replace mock stats)
  - SDK pipeline (POST /api/v1/tracking/batch)

Phase 5: Blockchain (4 weeks)
  - Live Solana wallet balance
  - On-chain reward claims
  - P2P escrow smart contract
```

---

## 10. App Loading Optimization

### Code Splitting Strategy

```typescript
// All admin pages lazy-loaded
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers     = lazy(() => import('./pages/admin/AdminUsers'));
// ...etc

// Heavy user pages lazy-loaded
const P2PFlow        = lazy(() => import('./pages/P2PFlow'));
const DeviceDetail   = lazy(() => import('./pages/DeviceDetail'));
const KYCVerification = lazy(() => import('./pages/KYCVerification'));
```

### PWA Service Worker

```typescript
// workbox config in vite.config.ts
runtimeCaching: [
  { urlPattern: /\/api\//, handler: 'NetworkFirst',
    options: { cacheName: 'api', expiration: { maxAgeSeconds: 300 } } },
  { urlPattern: /\.(?:png|jpg|webp|svg)$/,
    handler: 'CacheFirst',
    options: { cacheName: 'images', expiration: { maxEntries: 100 } } },
  { urlPattern: /\.(?:js|css)$/,
    handler: 'StaleWhileRevalidate',
    options: { cacheName: 'assets' } }
]
```

---

## 11. Testing Strategy

### 11.1 Test Pyramid

| Level | Coverage | Tool |
|-------|----------|------|
| Unit (business logic) | 90% | Vitest |
| API Integration | 80% | Vitest + Supertest |
| React Components | 70% | Vitest + Testing Library |
| E2E Critical Paths | 100% of P0 flows | Playwright |
| Smart Contracts | 95% | Anchor test framework |

### 11.2 Critical E2E Flows

1. Register → Onboarding → Dashboard (all 3 roles)
2. User: Browse campaigns → Join → Earnings appear
3. User: P2P buy flow end-to-end (offer → escrow → proof → release)
4. User: Scan2Pay → QR detected → Pay → Success
5. User: KYC submit (SP type) → Admin receives in queue
6. Admin: KYC review → Approve → User status updated
7. Admin: Token freeze → User wallet ops blocked
8. SP: Create service → Create campaign → Goes live
9. Device Tracking (Unit): `process_tracking_report()` accurately splits NRT (85% user, 10% SP, 5% ISP) and records tax logic.
10. Device Tracking (E2E): SDK reports payload → Tracking API validates → `unclaimed_nrt` grows → Claim reward → Wallet balance increases.
11. Fiat Withdrawal (E2E): User enters amount → selects bank → creates withdrawal request → balance decremented → request appears in DB.
12. Support Ticket (E2E): User creates ticket → ticket appears in list → admin receives ticket.
13. Referral Code: Auto-generated referral codes are unique per user.
14. Dispute (E2E): User reports trade → dispute created in DB → message sent → appears in Dispute Center.
15. Profile Update: User changes display_name/phone → persisted to DB → reflected in Settings header.
16. Role Switch: User switches from `user` → `sp` via `switch_user_role` RPC → DB role updated → UI re-renders to SP dashboard.

---

## 12. Infrastructure & Deployment

### 12.1 Production Stack

```
Cloudflare (CDN + WAF + DNS)
  └── AWS ALB (Load Balancer)
      ├── API Pods (Kubernetes, 3 replicas, auto-scale)
      ├── WebSocket Pods (sticky sessions)
      └── Worker Pods (BullMQ consumers)
          └── Supabase (PostgreSQL + Auth + Storage + Realtime)
          └── Redis Cluster (3 nodes, ElastiCache)
          └── Solana RPC (QuickNode / Helius)
```

### 12.2 Environment Strategy

| Env | DB | Solana | Purpose |
|-----|-----|--------|---------|
| local | Docker Supabase | Devnet | Development |
| dev | Supabase project (dev) | Devnet | Feature testing |
| staging | Supabase project (staging) | Devnet | Pre-prod QA |
| production | Supabase project (prod) | Mainnet | Live users |

### 12.3 CI/CD (GitHub Actions)

```yaml
Steps:
  1. Lint + Type check (ESLint, tsc --noEmit)
  2. Unit tests (Vitest, >80% coverage gate)
  3. Build all packages
  4. E2E tests (Playwright on staging)
  5. Security scan (Snyk)
  6. Deploy to staging (auto on PR merge)
  7. Deploy to production (manual approval on main)
```

---

## 13. Key Technical Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend framework | React 19 + Vite 8 | Fastest DX, RSC ready |
| Database | Supabase (PostgreSQL) | Auth + RLS + Realtime bundled |
| Blockchain | Solana (SPL) | < $0.01 fees, 400ms finality |
| State (client) | Zustand 5 | Minimal boilerplate, no Redux |
| State (server) | TanStack Query v5 | Best cache/refetch/optimistic |
| Animation | Framer Motion 12 | Best React integration |
| P2P escrow | Anchor (Solana) | Native Rust, auditable |
| Multi-sig | Squads Protocol | Best Solana multi-sig |
| DEX liquidity | Raydium | Highest Solana TVL |
| Payment gateway | Paystack + Flutterwave | Africa coverage |
| Price oracle | Chainlink | Decentralized, battle-tested |
| KYC provider | Onfido / Jumio | SOC2, global coverage |
| Job queue | BullMQ | Redis-backed, reliable |
| Monitoring | Sentry + Grafana | Error + infra coverage |
