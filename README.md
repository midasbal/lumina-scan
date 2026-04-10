<div align="center">

<img src="public/lumina-logo.png" alt="Lumina Scan" width="400" />

<br />

### Autonomous Web3 Security Auditor — Powered by Stellar Agentic Payments

*The first AI security scanner that charges per-request via the x402 / MPP protocol on Stellar.*
*Starting at $0.10. Audit proof on-chain. Zero human intervention.*

[![Stellar](https://img.shields.io/badge/Stellar-Testnet-blue?logo=stellar)](https://stellar.org)
[![MPP](https://img.shields.io/badge/x402%20%2F%20MPP-Agentic%20Payments-purple)](https://developers.stellar.org/docs/build/agentic-payments)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Llama 3.3](https://img.shields.io/badge/AI-Llama%203.3%2070B-orange)](https://groq.com)

**[Live Demo](https://lumina-scan.vercel.app)** · **[Documentation](https://lumina-scan.vercel.app/docs)** · **[API Spec](https://lumina-scan.vercel.app/openclaw.json)** · **[Python SDK](https://lumina-scan.vercel.app/lumina-sdk-example.py)**

</div>

---

## 🎯 The Problem

Traditional smart contract audits cost **$5,000–$50,000** and take **2–4 weeks**. In 2024 alone, over **$1.7 billion** was lost to smart contract exploits. Meanwhile, AI agents are writing more and more code autonomously — but they have **no way to pay for independent security reviews**.

The bottleneck isn't intelligence. It's **payment infrastructure**.

## 💡 The Solution

**Lumina Scan** is an autonomous, machine-payable security auditor built on Stellar's **x402 / MPP protocol**. Any AI agent or developer can:

1. **Send a contract** → `POST /api/scan`
2. **Receive a 402** → MPP payment challenge (USDC on Stellar Testnet)
3. **Pay & Get Results** → Structured vulnerability report + **immutable on-chain audit proof**

No API keys. No subscriptions. No humans. Just **usage-based micro-payments** starting at **$0.10**.

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Developer /    │     │   Lumina      │     │   Stellar       │
│  AI Agent       │────▶│   Scan API   │────▶│   Testnet       │
│  (Claude, etc.) │     │              │     │                 │
└─────────────────┘     └──────────────┘     └─────────────────┘
        │                       │                     │
   1. POST /api/scan      3. Llama 3.3          5. Audit Proof
   2. MPP 402 Challenge      Analysis              (Memo.hash)
      ↕ USDC Payment     4. JSON Report         6. Fee Sponsored
```

**Request Flow:**
`Developer` → `POST /api/scan` → `MPP 402 Challenge` → `USDC Payment` → `Llama 3.3 Analysis` → `Stellar On-Chain Proof` → `JSON Report`

---

## ⚡ 10 Killer Features

### 1. 💳 Usage-Based Micro-Payments (x402 / MPP)
Every API call is gated by Stellar's **Machine Payment Protocol**. No subscriptions, no API keys — agents pay per-request in USDC via the standard 402 challenge-response flow.

- **Protocol:** `mppx v0.4.12` + `@stellar/mpp v0.4.0`
- **Flow:** Client → 402 → `WWW-Authenticate: Payment` → Soroban SAC transfer → Retry with proof
- **Currency:** USDC on Stellar Testnet (`CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`)

### 2. 🆓 Frictionless Onboarding (Sponsored Accounts)
New users never need to hold XLM. Lumina's server **sponsors account creation and USDC trustline setup** — removing every barrier to entry.

- **3-case detection:** No account → sponsored create + trustline | Account, no trustline → sponsored trustline | Ready → no-op
- **Cost to user:** $0.00 (all reserves and fees covered by Lumina)
- **Protocol ops:** `beginSponsoringFutureReserves` → `createAccount` / `changeTrust` → `endSponsoringFutureReserves`

### 3. 🤖 Agent-to-Agent Service Discovery (MCP)
Lumina Scan implements the **Model Context Protocol**, allowing AI agents like Claude Code, OpenClaw, and AutoGen to discover and call our scanner autonomously.

- **Manifest:** `/mcp.json` (static) + `/api/mcp/config` (CORS-enabled)
- **HTML Discovery:** `<link rel="mcp-manifest" href="/mcp.json">`
- **Tools defined:** `analyze_smart_contract`, `unlock_remediation_patch`

### 4. 🏦 Fee Sponsoring (FeeBumpTransaction)
Every on-chain audit proof is submitted using a **FeeBumpTransaction** where the Lumina server is the fee source. Users never pay gas.

- **Architecture:** Inner tx (source=recipient) → 3 ops (beginSponsoring + manageData + endSponsoring) → signed by both keypairs → wrapped in FeeBumpTransaction
- **Fee:** `SPONSOR_FEE = 10× BASE_FEE` (generous multiplier to avoid `tx_insufficient_fee`)

### 5. 📊 Dynamic Pricing (Complexity-Based)
Price scales with code complexity. A 100-character contract costs $0.60; a 10,000-character enterprise contract costs the cap of $50.

```
price = max(0.10, min(50.00, 0.10 + characters × 0.005))
```

| Characters | Standard | Priority (+VIP) |
|-----------|----------|-----------------|
| 100       | $0.60    | $1.10           |
| 500       | $2.60    | $3.10           |
| 1,000     | $5.10    | $5.60           |
| 10,000    | $50.00   | $50.50          |

### 6. 🔗 On-Chain Audit Proof (Immutable Verification)
Every scan report is hashed (SHA-256) and anchored to the **Stellar blockchain** via `Memo.hash`. Anyone can verify the integrity of a report — forever.

- **Hash:** `SHA-256(JSON.stringify(report))` → 32-byte Buffer
- **Storage:** `manageData("lumina_audit_hash", hexHash)` + `Memo.hash(rawHash)`
- **Verify:** `https://stellar.expert/explorer/testnet/tx/{txHash}`

### 7. 🧠 AI-Powered Vulnerability Detection
**Llama 3.3 70B Versatile** via Groq delivers enterprise-grade analysis with server-side severity enforcement.

- **Model:** `llama-3.3-70b-versatile` (Groq — ultra-low latency inference)
- **Output:** Structured JSON with `vulnerabilityScore` (0–100), `riskLevel`, `issues[]`
- **Scoring rules:** CRITICAL=0–20, HIGH=21–50, MEDIUM=51–75, LOW=76–95, Clean=96–100
- **Languages:** Solidity, Soroban Rust, Move, Ink!, and more

### 8. 🔒 Pay-for-Patch (Monetized Remediation)
CRITICAL and HIGH severity issues include **locked remediation code**. Developers pay 1 USDC to unlock production-ready fixes — turning intelligence into revenue.

- **Price:** Fixed 1 USDC per patch unlock
- **UI:** Glassmorphism blur overlay with premium unlock button
- **Session-aware:** Auto-deducted from active session balance

### 9. ⚡ Priority Queue (VIP Lane)
Skip the standard queue. Priority scans execute instantly for an extra $0.50 — because for professional auditors, time is money.

- **Surcharge:** `PRIORITY_SURCHARGE = 0.50 USDC`
- **Queue bypass:** Standard requests wait 4 seconds; VIP skips immediately
- **UI:** Violet/fuchsia gradient toggle button

### 10. 🐍 OpenClaw / LangChain Compatibility (Interoperability Layer)
Full **OpenAPI 3.1 spec** + ready-to-run **Python SDK** + **LangChain StructuredTool** definitions. Lumina Scan is a platform, not just a product.

- **Spec:** [`/openclaw.json`](https://lumina-scan.vercel.app/openclaw.json) — Tool definitions with `x-tool-definition` for LangChain, CrewAI, AutoGen
- **SDK:** [`/lumina-sdk-example.py`](https://lumina-scan.vercel.app/lumina-sdk-example.py) — Scan, unlock, sessions, proof verification
- **Integration:** [`/scripts/openclaw-integration.py`](./scripts/openclaw-integration.py) — LangChain agent tool factory

---

## ✨ Premium UX/UI Engineering

Six enterprise-grade interface features that elevate Lumina Scan from functional prototype to a product with premium, "Quiet Luxury" feel.

### 🦴 Skeleton Loading Shimmers
Custom `@keyframes shimmerSweep` with an **emerald/violet linear-gradient sweep**. Replaces generic spinners with a full skeleton matching the report layout — gauge, risk cards, issue cards — so the UI feels alive during AI analysis.

### 💰 Live Animated Balance Counter
A custom `useAnimatedNumber` hook using `requestAnimationFrame` with **ease-out cubic easing**. The MPP session balance animates smoothly as USDC is spent — making machine payments feel tangible.

### 📜 Audit History Timeline
**Session-persistent** audit history stored in `sessionStorage` (max 10 entries). Each entry stores full report, code, and on-chain proof. Users can **restore**, **delete**, **export JSON**, or **clear all** — providing platform-level data portability.

### 🌗 Dark / Light Theme
Seamless theme switching powered by **next-themes** with class-based toggling. Light mode uses clean whites, `zinc-100` surfaces, and sharp emerald contrasts — equally stunning as the Cyber-Noir dark mode.

### 📄 Professional CSV & JSON Exports
One-click **CSV export** generates structured vulnerability data (Severity, Title, Description) with UTF-8 BOM for Excel compatibility. Combined with JSON history export for complete data portability — built for developers who parse, not just read.

### 🔔 Interactive Toast Notifications
Powered by **Sonner**, styled with the Quiet Luxury aesthetic. Real-time feedback for wallet connections, scan completion, patch unlocks, and file exports — subtle, non-intrusive, and informative.

---

## 🔌 Interoperability Layer

Lumina Scan is designed to be discovered and consumed by autonomous AI agents:

| Protocol | File | Purpose |
|----------|------|---------|
| **MCP** | [`/mcp.json`](https://lumina-scan.vercel.app/mcp.json) | Model Context Protocol manifest for agent discovery |
| **OpenClaw** | [`/openclaw.json`](https://lumina-scan.vercel.app/openclaw.json) | OpenAPI 3.1 spec with `x-tool-definition` for LangChain/CrewAI |
| **Python SDK** | [`/lumina-sdk-example.py`](https://lumina-scan.vercel.app/lumina-sdk-example.py) | Ready-to-run HTTP client with MPP handling |
| **HTML Meta** | `<link rel="mcp-manifest">` | In-page discovery tag |
| **CORS Config** | `/api/mcp/config` | Cross-origin configuration endpoint |

**Compatible agents:** Claude Code, OpenClaw, LangChain, CrewAI, AutoGen, OpenAI Functions, Anthropic Tools

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Stellar-compatible wallet ([Freighter](https://freighter.app/) recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/lumina-scan.git
cd lumina-scan

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Add your keys: SPONSOR_SECRET_KEY, RECIPIENT_SECRET_KEY, MPP_SECRET_KEY, GROQ_API_KEY

# Start development server
npm run dev
```

Open [https://lumina-scan.vercel.app](https://lumina-scan.vercel.app) to use the scanner, or `http://localhost:3000` for local development.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `SPONSOR_SECRET_KEY` | Stellar keypair that sponsors fees and reserves |
| `RECIPIENT_SECRET_KEY` | Stellar keypair that receives USDC payments |
| `MPP_SECRET_KEY` | Secret key for MPP challenge signing |
| `GROQ_API_KEY` | Groq API key for Llama 3.3 inference |

### API Usage

```bash
# Scan a contract (will return 402 for payment)
curl -X POST https://lumina-scan.vercel.app/api/scan \
  -H "Content-Type: application/json" \
  -d '{"code": "pragma solidity ^0.8.0; contract Vault { ... }"}'

# With priority
curl -X POST https://lumina-scan.vercel.app/api/scan \
  -H "Content-Type: application/json" \
  -d '{"code": "...", "priority": true}'

# With session token (bypasses per-request MPP)
curl -X POST https://lumina-scan.vercel.app/api/scan \
  -H "Content-Type: application/json" \
  -H "X-Session-Token: your-session-token" \
  -d '{"code": "..."}'
```

### Python SDK

```python
from lumina_sdk import scan_contract, estimate_price

# Estimate price
price = estimate_price(my_contract_code)  # e.g., 0.60 USDC

# Scan (handles 402 challenge)
report = scan_contract(my_contract_code, priority=True)
print(f"Score: {report['vulnerabilityScore']}/100")
print(f"Proof: stellar.expert/tx/{report['auditProofTxHash']}")
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS 4 | Quiet Luxury UI |
| **AI Engine** | Llama 3.3 70B (Groq) | Vulnerability detection |
| **Blockchain** | @stellar/stellar-sdk v14.6.1 | On-chain proofs, sponsoring |
| **Payments** | mppx v0.4.12, @stellar/mpp v0.4.0 | x402 / MPP protocol |
| **Wallet** | @creit.tech/stellar-wallets-kit v2.1.0, Freighter | Client-side signing |
| **Theming** | next-themes | Dark/Light mode switching |
| **Notifications** | Sonner | Toast notification system |
| **Export** | Native CSV + JSON | Structured report & history export |
| **Design** | Quiet Luxury / Cyber-Noir | Premium aesthetic |

---

## 📁 Project Structure

```
lumina-scan/
├── app/
│   ├── page.tsx                  # Main scanner dashboard
│   ├── layout.tsx                # Root layout with MCP meta tag
│   ├── globals.css               # Tailwind + custom animations
│   ├── docs/page.tsx             # Documentation / Whitepaper page
│   └── api/
│       ├── scan/route.ts         # 🔑 Core: MPP-gated security scan
│       ├── unlock-patch/route.ts # Pay-for-Patch (1 USDC)
│       ├── session/route.ts      # Pro session management
│       ├── setup-wallet/route.ts # Sponsored onboarding
│       ├── submit-wallet/route.ts# Co-sign onboarding tx
│       └── mcp/config/route.ts   # MCP configuration endpoint
├── lib/
│   ├── pricing.ts                # Shared dynamic pricing module
│   ├── ai/analyzer.ts            # Groq Llama 3.3 integration
│   ├── stellar/
│   │   ├── wallet.ts             # Server-side wallet management
│   │   └── audit-proof.ts        # FeeBumpTransaction audit proofs
│   └── session/store.ts          # In-memory session store
├── public/
│   ├── mcp.json                  # MCP manifest
│   ├── openclaw.json             # OpenAPI 3.1 / OpenClaw spec
│   └── lumina-sdk-example.py     # Python SDK example
├── scripts/
│   └── openclaw-integration.py   # LangChain integration reference
├── types/index.ts                # TypeScript interfaces
```

---

## 🏆 Hackathon Alignment

### Stellar Hacks: Agentic AI

| Hackathon Theme | Lumina Scan Implementation |
|----------------|---------------------------|
| **Autonomous Agents** | AI agents discover Lumina via MCP/OpenClaw and call our API without human intervention |
| **x402 / MPP Protocol** | Every endpoint uses the 402 challenge-response pattern with Soroban USDC transfers |
| **On-Chain Paywalls** | `POST /api/scan` returns 402 until USDC payment is verified on Stellar Testnet |
| **Usage-Based Micro-Payments** | Dynamic pricing from $0.10 — agents pay exactly what they consume |
| **Frictionless Onboarding** | Server-sponsored account creation + USDC trustline at $0 cost |
| **Agent-to-Agent Discovery** | MCP manifest + OpenClaw spec enable autonomous tool discovery |
| **Agentic Payments** | MPP Sessions allow batch-mode scanning with pre-authorized deposits |
| **Fee Sponsoring** | FeeBumpTransaction covers all network fees — users never hold XLM |

### Why Lumina Scan Wins

1. **Real utility** — Security audits are a $2B+ market need, not a toy demo
2. **Full x402/MPP stack** — Not just a 402 status code; we implement sessions, sponsoring, and dynamic pricing
3. **10 production features** — Each feature is implemented, tested, and working end-to-end
4. **6 premium UX features** — Skeleton shimmers, animated balance, audit history, dark/light theme, CSV/JSON export, toast notifications
5. **On-chain proof** — Every audit is cryptographically anchored to Stellar — verifiable forever
6. **Platform, not product** — OpenClaw + MCP + Python SDK make us an interoperability hub

---

## 📜 License

MIT

---

<div align="center">

**Built for [Stellar Hacks: Agentic AI](https://stellar.org) Hackathon**

*Securing the autonomous future — one micro-payment at a time.*

🛡️ Lumina Scan · $0.10 starting price · On-chain proof · Zero friction

</div>
