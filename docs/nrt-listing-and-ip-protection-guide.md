# NRT Token Listing & Intellectual Property Protection Guide

> **Document Version:** 1.0
> **Date:** June 2026
> **Prepared for:** NetReward Foundation
> **Token:** NRT (NetReward Token)
> **Target Peg:** 1 NRT = $5.00 USD
> **Current Supply:** 600,000,000 NRT

---

## Table of Contents

1. [Part A: NRT Exchange Listing Strategy](#part-a-nrt-exchange-listing-strategy)
   - [Pre-Listing Requirements](#1-pre-listing-requirements-before-any-exchange)
   - [Price Peg Mechanism ($5/NRT)](#2-price-peg-mechanism-5nrt)
   - [DEX Listings](#3-dex-listings-decentralized-exchanges)
   - [CEX Listings](#4-cex-listings-centralized-exchanges)
   - [Market Making](#5-market-making)
   - [Total Budget Summary](#6-total-estimated-budget-summary)
   - [Recommended Listing Roadmap](#7-recommended-listing-roadmap)
2. [Part B: Intellectual Property Protection](#part-b-intellectual-property-protection)
   - [Copyright Protection](#1-copyright-protection)
   - [Patent Protection](#2-patent-protection)
   - [Trademark Protection](#3-trademark-protection)
   - [International IP Protection](#4-international-ip-protection)
   - [IP Budget Summary](#5-ip-protection-budget-summary)
   - [Reliable Sources & Firms](#6-reliable-sources--firms)

---

## Part A: NRT Exchange Listing Strategy

### 1. Pre-Listing Requirements (Before Any Exchange)

Before approaching any exchange (CEX or DEX), the following foundational items must be completed:

| Requirement | Description | Estimated Cost | Status |
| :--- | :--- | :--- | :--- |
| **Smart Contract Audit** | Independent security audit of the NRT token contract by a reputable firm (CertiK, Hacken, or Trail of Bits) | $5,000 – $15,000 (ERC-20/BEP-20) | ☐ |
| **Legal Opinion Letter** | From a licensed securities attorney confirming NRT is a utility token, not a security (Howey Test analysis) | $10,000 – $30,000 | ☐ |
| **Whitepaper** | Finalized, professional-grade whitepaper with clear tokenomics, use cases, and governance | ✅ Complete | ✅ |
| **Tokenomics Documentation** | Detailed breakdown of: supply schedule, minting mechanism, burn mechanics, circulation strategy | $0 (internal) | ☐ |
| **KYB / KYC (Core Team)** | Full KYC for all founders and key team members, plus KYB for the legal entity | $500 – $2,000 | ☐ |
| **Blockchain Deployment** | NRT smart contract deployed on target chain(s) — Ethereum (ERC-20), BNB Chain (BEP-20), or Solana (SPL) | $500 – $2,000 (gas fees) | ☐ |
| **Contract Verification** | Verified source code on Etherscan / BscScan / Solscan | $0 | ☐ |
| **CoinGecko / CoinMarketCap Listing** | Apply for aggregator listings (free, but requires active trading pair) | $0 | ☐ |

---

### 2. Price Peg Mechanism ($5/NRT)

Maintaining a stable $5.00 peg for NRT requires a deliberate economic mechanism. Here are the three viable approaches, ranked by suitability for NRT:

#### Option A: Reserve-Backed Peg (Recommended)

This is the most credible and investor-friendly approach.

| Component | Detail |
| :--- | :--- |
| **Mechanism** | NetReward Foundation holds liquid reserves (USD, USDC, or T-Bills) equal to or greater than the value of circulating NRT |
| **Math** | 600M NRT × $5 = $3 Billion total value. Only circulating supply needs backing. |
| **Redemption** | Users can redeem NRT → $5 USDC via the platform, creating an arbitrage floor |
| **Proof of Reserves** | Quarterly audits published on-chain or via a trusted third party |
| **Trust Signal** | Strongest. Institutional investors and exchanges prefer this model |
| **Risk** | Requires significant capital reserves |

> **Strategy for NRT:** Since NRT is a utility token (not a stablecoin), you don't need to back the *entire* supply. Focus on backing the **circulating supply** with platform revenue, data ecosystem fees, and treasury reserves. The peg is enforced through:
> - **Internal Platform Rate:** All Scan2Pay, subscription, and reward transactions settle at 1 NRT = $5
> - **Liquidity Pool Ratio:** DEX pools are initialized at the $5 rate
> - **Market Making:** Professional market makers maintain order books around the $5 mark on CEXs

#### Option B: Algorithmic + Revenue-Backed (Hybrid)

| Component | Detail |
| :--- | :--- |
| **Mechanism** | Smart contract mints/burns NRT to stabilize price around $5, backed by platform revenue |
| **Pros** | Lower capital requirement |
| **Cons** | Lower investor confidence post-TerraUST collapse. Requires proven revenue |
| **Risk** | High — algorithmic pegs have a history of failure |

#### Option C: CEX Order Book Peg (Market Maker Managed)

| Component | Detail |
| :--- | :--- |
| **Mechanism** | Professional market maker maintains deep buy/sell walls at $4.95–$5.05 |
| **Pros** | Simpler to implement; no smart contract changes |
| **Cons** | Ongoing monthly cost; dependent on market maker relationship |
| **Monthly Cost** | $10,000 – $50,000/month |

---

### 3. DEX Listings (Decentralized Exchanges)

DEX listings are **permissionless** — there is no application or approval process. You create a liquidity pool yourself.

#### Uniswap (Ethereum / L2s)

| Item | Detail |
| :--- | :--- |
| **Chain** | Ethereum Mainnet, Arbitrum, Base, Polygon |
| **Token Standard** | ERC-20 |
| **Listing Fee** | $0 (permissionless) |
| **Gas Fees** | $50 – $500 (depends on network congestion) |
| **Initial Liquidity Required** | Minimum $50,000 recommended; $100,000+ for credibility |
| **Pair** | NRT/USDC or NRT/ETH |
| **Price Setting** | You set the initial ratio: deposit 10,000 NRT + $50,000 USDC = $5/NRT |
| **Liquidity Lock** | Use Unicrypt or Team.Finance to lock LP tokens (builds trust) — $200–$500 |
| **Pool Version** | Uniswap V3 (concentrated liquidity) recommended for capital efficiency |
| **DEXTools/DEXScreener** | Auto-detected once pool has activity |
| **Total Estimated Cost** | **$50,500 – $101,000** |

#### PancakeSwap (BNB Smart Chain)

| Item | Detail |
| :--- | :--- |
| **Chain** | BNB Smart Chain (BSC) |
| **Token Standard** | BEP-20 |
| **Listing Fee** | $0 (permissionless) |
| **Gas Fees** | $1 – $10 |
| **Initial Liquidity Required** | Minimum $20,000; $50,000+ recommended |
| **Pair** | NRT/BUSD or NRT/BNB |
| **Total Estimated Cost** | **$20,200 – $50,500** |

#### Raydium / Orca (Solana)

| Item | Detail |
| :--- | :--- |
| **Chain** | Solana |
| **Token Standard** | SPL Token |
| **Listing Fee** | $0 |
| **Gas Fees** | < $1 |
| **Initial Liquidity** | $20,000 – $50,000 |
| **Total Estimated Cost** | **$20,000 – $50,000** |

#### DEX Post-Launch Checklist

- [ ] Lock liquidity for 6–12 months minimum (Unicrypt / Team.Finance)
- [ ] Apply for CoinGecko and CoinMarketCap listing (requires active DEX pair)
- [ ] Submit to DEXTools and DEXScreener for chart tracking
- [ ] Set up a token info page (logo, description, social links)
- [ ] Monitor pool health daily for the first 30 days

---

### 4. CEX Listings (Centralized Exchanges)

CEX listings require formal applications, due diligence, and significant budgets. They are ranked by tier below.

#### Tier 3 — Entry-Level CEXs (Start Here)

Best for establishing trading history and credibility before approaching larger exchanges.

| Exchange | Listing Fee | Liquidity Deposit | Marketing Budget | Total Budget | Timeline |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MEXC** | $50K – $100K | $10K – $30K | $10K – $20K | **$70K – $150K** | 2–4 weeks |
| **BitMart** | $30K – $80K | $10K – $20K | $5K – $15K | **$45K – $115K** | 2–4 weeks |
| **LBank** | $20K – $50K | $10K – $20K | $5K – $10K | **$35K – $80K** | 2–3 weeks |

**Requirements:**
- Completed smart contract audit report
- Legal opinion letter
- KYC for core team members
- Whitepaper and tokenomics
- Minimum trading volume targets (often self-managed initially)

#### Tier 2 — Mid-Level CEXs

| Exchange | Listing Fee | Liquidity/MM | Marketing | Total Budget | Timeline |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **KuCoin** | $150K – $200K | $50K – $100K | $20K – $50K | **$220K – $350K** | 4–8 weeks |
| **Gate.io** | $150K – $300K | $50K – $150K | $30K – $50K | **$230K – $500K** | 4–8 weeks |
| **Bybit** | $100K – $200K | $50K – $80K | $30K – $50K | **$180K – $330K** | 4–8 weeks |
| **Crypto.com** | $100K – $250K | $50K – $100K | $30K – $50K | **$180K – $400K** | 6–10 weeks |

**Additional Requirements:**
- Active trading history (from Tier 3 CEX or DEX)
- Minimum 10,000+ community members
- Professional market maker agreement
- Ongoing monthly marketing commitment

#### Tier 1 — Premium CEXs

| Exchange | Listing Fee | Liquidity/MM | Marketing/Launchpad | Total Budget | Timeline |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Binance** | $300K – $500K+ | $200K – $500K | $100K – $300K | **$600K – $1.3M+** | 3–6 months |
| **Coinbase** | $0 (merit-based) | $100K – $300K | $50K – $200K | **$150K – $500K** | 3–12 months |
| **OKX** | $200K – $400K | $150K – $300K | $50K – $150K | **$400K – $850K** | 3–6 months |
| **Kraken** | $50K – $200K | $100K – $200K | $30K – $100K | **$180K – $500K** | 3–6 months |

**Additional Requirements:**
- Proven trading volume from Tier 2/3 exchanges
- 50,000+ active community members
- Comprehensive legal and compliance framework
- Professional market maker on retainer
- Clear regulatory compliance in target jurisdictions

> [!IMPORTANT]
> **Never pay through unofficial channels.** Always apply through the official exchange listing portals. Scammers frequently pose as exchange representatives offering "guaranteed" listings.

---

### 5. Market Making

A professional market maker is **mandatory** for all CEX listings and strongly recommended for DEX stability.

| Provider | Monthly Retainer | Token Loan Required | Best For | Website |
| :--- | :--- | :--- | :--- | :--- |
| **Wintermute** | $15K – $50K/mo | Yes (negotiable) | Tier 1 exchanges, high volume | wintermute.com |
| **GSR** | $15K – $50K/mo | Yes | Institutional-grade, regulated | gsr.io |
| **Kairon Labs** | $5K – $25K/mo | Yes | Mid-stage projects, accessible | kaironlabs.com |
| **Gotbit** | $5K – $15K/mo | Yes | Early-stage, growth-focused | gotbit.io |
| **DWF Labs** | Varies | Token investment model | Projects seeking investment + MM | dwf-labs.com |

**What Market Makers Do:**
- Maintain tight bid/ask spreads around the $5 peg
- Provide deep liquidity on order books
- Prevent price manipulation and flash crashes
- Meet exchange-mandated volume/liquidity requirements

---

### 6. Total Estimated Budget Summary

| Phase | Minimum Budget | Recommended Budget |
| :--- | :--- | :--- |
| **Pre-Listing (Audit, Legal, KYB)** | $16,000 | $47,000 |
| **DEX Listing (Uniswap + PancakeSwap)** | $70,000 | $150,000 |
| **Tier 3 CEX (MEXC or BitMart)** | $45,000 | $150,000 |
| **Tier 2 CEX (KuCoin or Bybit)** | $180,000 | $400,000 |
| **Tier 1 CEX (Binance)** | $600,000 | $1,300,000 |
| **Market Maker (12 months)** | $60,000 | $300,000 |
| **CoinGecko / CMC + Aggregators** | $0 | $0 |
| **Marketing & Community** | $30,000 | $100,000 |
| **──────────────────────** | **──────────** | **──────────** |
| **Total (DEX + Tier 3)** | **$221,000** | **$647,000** |
| **Total (DEX + Tier 2)** | **$356,000** | **$997,000** |
| **Total (DEX + Tier 1 Full)** | **$1,001,000** | **$2,447,000** |

---

### 7. Recommended Listing Roadmap

```
Phase 1 (Month 1-2):  Pre-Listing Preparation
├── Complete smart contract audit
├── Obtain legal opinion letter
├── Finalize tokenomics documentation
├── Complete KYB/KYC for core team
└── Deploy & verify contract on target chains

Phase 2 (Month 2-3):  DEX Launch
├── Create Uniswap V3 pool (NRT/USDC at $5)
├── Create PancakeSwap pool (NRT/BUSD at $5)
├── Lock liquidity (12 months minimum)
├── List on CoinGecko and CoinMarketCap
└── Begin community marketing push

Phase 3 (Month 3-5):  Tier 3 CEX
├── Apply to MEXC and/or BitMart
├── Engage entry-level market maker
├── Build 30-day trading history
└── Grow community to 10,000+ members

Phase 4 (Month 5-8):  Tier 2 CEX
├── Apply to KuCoin, Gate.io, or Bybit
├── Upgrade to professional market maker
├── Scale marketing and PR campaigns
└── Target 50,000+ community members

Phase 5 (Month 8-14): Tier 1 CEX
├── Apply to Binance / Coinbase / OKX
├── Engage Tier 1 market maker (Wintermute/GSR)
├── Institutional partnership announcements
└── Full regulatory compliance framework
```

---

## Part B: Intellectual Property Protection

### 1. Copyright Protection

Copyright protects the **expression** of your work — the actual source code, UI designs, documentation, and creative content.

#### What Can Be Copyrighted for NetReward

| Asset | Copyright Eligible | Registration Needed |
| :--- | :--- | :--- |
| Source code (frontend, backend, smart contracts) | ✅ Yes | Recommended |
| UI/UX designs and layouts | ✅ Yes | Recommended |
| Whitepaper text and graphics | ✅ Yes | Recommended |
| Documentation and guides | ✅ Yes | Optional |
| Logo and brand artwork | ✅ Yes | Recommended |
| Marketing materials | ✅ Yes | Optional |
| Database structure / schemas | ⚠️ Partial | Optional |
| Algorithms / business logic | ❌ No (use patents) | N/A |

#### How to Register Copyright (United States)

| Step | Detail | Cost |
| :--- | :--- | :--- |
| **1. Prepare Deposit** | Export your source code. You may redact trade secrets (up to 50% of the code) | $0 |
| **2. Online Application** | File at [copyright.gov](https://www.copyright.gov/registration/) | $45 – $65 per work |
| **3. Submit Code Deposit** | Upload the source code file(s) as part of the application | Included |
| **4. Processing** | US Copyright Office reviews and issues certificate | 3–6 months |
| **5. Attorney Assistance** | Optional but recommended for complex multi-version registrations | $250 – $500 per filing |

> **Total Cost for NetReward:** Register 4-6 key works (platform code, mobile app, smart contracts, whitepaper, UI designs) = **$270 – $3,500**

#### Key Benefits of Registration
- **Legal Standing:** Required to sue for infringement in US federal court
- **Statutory Damages:** Up to $150,000 per infringement (if registered before infringement occurs)
- **Presumption of Validity:** Court assumes your copyright is valid if registered within 5 years of creation
- **Customs Recording:** Can record with US Customs to block infringing imports

#### Recommended Filing Strategy
1. Register the **platform source code** (web PWA + backend) as one work
2. Register the **mobile application** source code as a separate work
3. Register the **smart contract code** as a separate work
4. Register the **whitepaper** as a literary work
5. Register **UI/UX design assets** as visual works
6. **Re-register** when major new versions are released

---

### 2. Patent Protection

Patents protect the **functional invention** — the technical process, method, or system behind your innovation.

#### Patentable Innovations in NetReward

| Innovation | Patentability | Priority |
| :--- | :--- | :--- |
| Scan2Pay QR-based NRT payment system | ✅ High — novel payment flow | 🔴 High |
| Data reward tokenomics (earn NRT for data usage) | ✅ Medium — unique economic model | 🔴 High |
| Net Health Score (NHS) algorithm | ✅ High — novel scoring system | 🟡 Medium |
| SP/ISP integration SDK for Scan2Pay | ✅ Medium — technical implementation | 🟡 Medium |
| Cross-role subscription management system | ⚠️ Low — may be considered abstract | 🟢 Low |
| Device fingerprinting for data tracking | ✅ Medium — if novel technical approach | 🟡 Medium |

#### Patent Filing Process (USPTO)

| Step | Detail | Timeline | Cost |
| :--- | :--- | :--- | :--- |
| **1. Prior Art Search** | Professional search to confirm novelty | 2–4 weeks | $1,500 – $3,000 |
| **2. Provisional Application** | Secures filing date; gives 12 months to file full application | 1–2 weeks to file | $2,000 – $5,000 (attorney + $320 USPTO fee) |
| **3. Non-Provisional Application** | Full patent application with claims | 4–8 weeks to draft | $8,000 – $15,000 (attorney + $1,820 USPTO fee) |
| **4. USPTO Examination** | Examiner reviews; often issues Office Actions | 18–36 months | $0 (included in filing) |
| **5. Office Action Responses** | Attorney responds to examiner rejections (common for software) | 2–3 months each | $3,000 – $5,000 per response |
| **6. Patent Grant** | If approved, patent issues | After examination | $1,200 issue fee |
| **7. Maintenance Fees** | Required at 3.5, 7.5, and 11.5 years | Ongoing | $1,600 / $4,810 / $12,420 |

> **Estimated Total Cost per Patent:** **$15,000 – $35,000** (filing through grant)
>
> **Recommended for NetReward:** File 2–3 provisional patents = **$6,000 – $15,000** initially, with full applications to follow within 12 months.

#### Expedited Options

| Option | Cost | Benefit |
| :--- | :--- | :--- |
| **Track One (Prioritized Examination)** | $1,000 – $4,000 additional | Final decision within ~12 months |
| **Patent Prosecution Highway (PPH)** | Varies | Speeds up if you have a foreign filing |

#### Software Patent Tips (Alice Test Compliance)
- **DO:** Focus on *technical improvements* (e.g., "a method for reducing latency in peer-to-peer NRT transactions using a novel verification protocol")
- **DON'T:** Frame it as a business method (e.g., "a method for paying users for their data")
- **DO:** Include flowcharts, system architecture diagrams, and technical implementation details
- **DO:** Emphasize improvements to computing speed, security, or data integrity

---

### 3. Trademark Protection

Trademarks protect your **brand identity** — the names, logos, and slogans that distinguish your product.

#### What to Trademark for NetReward

| Mark | Type | Class(es) | Priority |
| :--- | :--- | :--- | :--- |
| **NetReward** | Word Mark | Class 9 (Software), Class 36 (Financial Services), Class 42 (SaaS) | 🔴 Critical |
| **NRT** | Word Mark | Class 9, Class 36 | 🔴 Critical |
| **Scan2Pay** | Word Mark | Class 9, Class 36 | 🔴 Critical |
| **NetReward Logo** | Design Mark | Class 9, Class 36, Class 42 | 🟡 High |
| **"Your Data, Your Reward"** (or tagline) | Word Mark | Class 36, Class 42 | 🟢 Medium |
| **Net Health Score** | Word Mark | Class 9, Class 42 | 🟢 Medium |

#### USPTO Trademark Filing

| Step | Detail | Cost |
| :--- | :--- | :--- |
| **1. Trademark Search** | Comprehensive search to ensure mark is available | $300 – $1,000 (professional) |
| **2. TEAS Plus Application** | Standard online filing (per class of goods/services) | $250 per class |
| **3. TEAS Standard Application** | If TEAS Plus requirements can't be met | $350 per class |
| **4. Attorney Fees** | Recommended for proper classification and response | $500 – $2,000 per mark |
| **5. Examination** | USPTO examiner reviews (may issue Office Actions) | 8–12 months |
| **6. Publication** | 30-day opposition period | Included |
| **7. Registration** | Certificate of Registration issued | Included |
| **8. Maintenance** | Declaration of Use at years 5-6, renewal at year 10 | $225 – $425 per class |

> **Estimated Cost for NetReward (3 core marks × 3 classes):**
> Filing fees: 3 marks × 3 classes × $250 = **$2,250**
> Attorney fees: 3 marks × $1,500 = **$4,500**
> **Total: $6,750 – $12,000**

---

### 4. International IP Protection

#### PCT (International Patent Application)

For protecting NetReward's innovations globally:

| Component | Cost |
| :--- | :--- |
| **PCT Filing Fee** | ~$3,000 – $4,000 (includes international search) |
| **National Phase Entry** (per country) | $3,000 – $10,000 per country |
| **Attorney Fees** | $5,000 – $15,000 |
| **Translation Costs** | $2,000 – $5,000 per language |

> **Recommended Strategy:** File PCT application first (secures 158 countries for 30 months), then selectively enter national phase in key markets (US, EU, UK, Nigeria, Singapore, UAE).

#### Madrid Protocol (International Trademark)

| Component | Cost |
| :--- | :--- |
| **Basic Fee** | 653 CHF (~$730) for B&W; 903 CHF (~$1,010) for color |
| **Per Country Designation** | 100 CHF (~$112) per country (or individual fee) |
| **Supplementary Fee** | 100 CHF per additional class beyond 3 |
| **Total for 5 countries, 3 classes** | **~$2,000 – $4,000** |

> **Use WIPO's Fee Calculator:** [wipo.int/madrid/en/fees/calculator.jsp](https://www.wipo.int/madrid/en/fees/calculator.jsp)

---

### 5. IP Protection Budget Summary

| Protection Type | Minimum Budget | Recommended Budget |
| :--- | :--- | :--- |
| **Copyright Registration (5 works)** | $270 | $3,500 |
| **Trademark (3 marks, US only)** | $2,250 | $12,000 |
| **Trademark (International, 5 countries)** | $2,000 | $4,000 |
| **Patent (2 provisional, US)** | $6,000 | $15,000 |
| **Patent (1 non-provisional, US)** | $15,000 | $35,000 |
| **Patent (PCT International)** | $8,000 | $25,000 |
| **──────────────────────** | **──────────** | **──────────** |
| **Total (US Only — Essentials)** | **$23,520** | **$65,500** |
| **Total (US + International)** | **$33,520** | **$94,500** |

---

### 6. Reliable Sources & Firms

#### Smart Contract Audit Firms

| Firm | Specialty | Website | Estimated Cost |
| :--- | :--- | :--- | :--- |
| **CertiK** | Largest audit firm, AI-driven monitoring | certik.com | $5K – $50K |
| **Hacken** | Senior-led manual reviews, comprehensive | hacken.io | $5K – $30K |
| **Trail of Bits** | Research-heavy, highest prestige | trailofbits.com | $30K – $100K+ |
| **OpenZeppelin** | Institutional credibility, industry standard | openzeppelin.com | $20K – $80K |
| **Cyfrin** | Developer-focused, modern tooling | cyfrin.io | $10K – $40K |

#### IP Law Firms (Blockchain / Fintech Specialists)

| Firm | Specialty | Location | Website |
| :--- | :--- | :--- | :--- |
| **Anderson Kill** | Blockchain litigation & IP | New York, USA | andersonkill.com |
| **Perkins Coie** | Blockchain, fintech, patents | Seattle, USA | perkinscoie.com |
| **Cooley LLP** | Crypto startups, IP, securities | Palo Alto, USA | cooley.com |
| **Bird & Bird** | Fintech, blockchain, international IP | London, UK (global) | twobirds.com |
| **Olisa Agbakoba Legal (OAL)** | Nigerian IP & fintech law | Lagos, Nigeria | oal.law |
| **Aluko & Oyebode** | Nigerian corporate & IP law | Lagos, Nigeria | aluko-oyebode.com |

#### Official IP Filing Portals

| Office | Purpose | Website |
| :--- | :--- | :--- |
| **U.S. Copyright Office** | Copyright registration | [copyright.gov](https://www.copyright.gov) |
| **USPTO** | Patents and trademarks (US) | [uspto.gov](https://www.uspto.gov) |
| **WIPO** | International patents (PCT) and trademarks (Madrid) | [wipo.int](https://www.wipo.int) |
| **EUIPO** | EU trademarks and designs | [euipo.europa.eu](https://euipo.europa.eu) |
| **UK IPO** | UK patents and trademarks | [gov.uk/government/organisations/intellectual-property-office](https://www.gov.uk/government/organisations/intellectual-property-office) |
| **Trademarks Registries Nigeria** | Nigerian trademark filing | [iponigeria.com](https://iponigeria.com) |

#### Blockchain-Based Proof of Creation

As an additional layer of protection, timestamp your IP on-chain:

| Service | Purpose | Cost |
| :--- | :--- | :--- |
| **Bernstein.io** | Blockchain IP timestamping | Free tier available |
| **Opentimestamps.org** | Open-source Bitcoin timestamping | Free |
| **WIPO Proof** | WIPO's official digital evidence service | ~$20 per token |

---

## Quick-Start Priority Actions

### Immediate (Week 1-2)
1. ☐ Register **"NetReward"**, **"NRT"**, and **"Scan2Pay"** trademarks with USPTO
2. ☐ Register copyright for platform source code and whitepaper
3. ☐ Timestamp all source code on blockchain (Opentimestamps — free)

### Short-Term (Month 1-2)
4. ☐ File **provisional patent** for Scan2Pay payment system
5. ☐ File **provisional patent** for data reward tokenomics model
6. ☐ Commission smart contract audit (CertiK or Hacken)
7. ☐ Obtain legal opinion letter for NRT as utility token

### Medium-Term (Month 2-4)
8. ☐ Deploy NRT on target blockchain(s)
9. ☐ Create DEX liquidity pools at $5/NRT
10. ☐ Apply to MEXC or BitMart for Tier 3 CEX listing
11. ☐ File Madrid Protocol international trademark

### Long-Term (Month 4-12)
12. ☐ Convert provisional patents to non-provisional
13. ☐ File PCT international patent application
14. ☐ Apply to Tier 2 CEXs (KuCoin, Bybit)
15. ☐ Begin Tier 1 CEX application process (Binance)

---

> [!CAUTION]
> **Disclaimer:** This document is for informational and planning purposes only. It does not constitute legal, financial, or investment advice. Exchange listing fees, IP filing fees, and regulatory requirements change frequently. Always consult with qualified legal counsel (IP attorney) and financial advisors before making decisions. Verify all fees directly with official exchange and government portals before committing funds.
