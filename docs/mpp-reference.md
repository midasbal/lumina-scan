# MPP (Machine Payments Protocol) Reference Code

## 1. MPP Charge (One-Time Payment)
Used for immediate, per-request payments.

### Server Example
```javascript
import { Mppx } from "mppx/server";
import { stellar } from "@stellar/mpp/charge/server";
import { USDC_SAC_TESTNET } from "@stellar/mpp";

const mppx = Mppx.create({
  secretKey: process.env.MPP_SECRET_KEY,
  methods: [
    stellar.charge({
      recipient: process.env.STELLAR_RECIPIENT,
      currency: USDC_SAC_TESTNET,
      network: "stellar:testnet",
      feePayer: {
        envelopeSigner: process.env.FEE_PAYER_SECRET // Optional: Sponsored fees
      }
    }),
  ],
});
// Use mppx.charge({ amount: "0.01", description: "..." })(webReq) in route


Client Example

import { Keypair } from "@stellar/stellar-sdk";
import { Mppx } from "mppx/client";
import { stellar } from "@stellar/mpp/charge/client";

Mppx.create({
  methods: [
    stellar.charge({
      keypair: Keypair.fromSecret(process.env.STELLAR_SECRET),
      mode: "pull", // server broadcasts the signed transaction
    }),
  ],
});
// Global fetch handles 402 automatically

2. MPP Session (Payment Channels)
Used for high-frequency off-chain payments.

Server Example

import { Mppx, Store } from "mppx/server";
import { stellar } from "@stellar/mpp/channel/server";

const mppx = Mppx.create({
  secretKey: process.env.MPP_SECRET_KEY,
  methods: [
    stellar.channel({
      channel: process.env.CHANNEL_CONTRACT, // C... (56 chars)
      commitmentKey: commitmentPublicKeyG, // G... address
      store: Store.memory(), 
      network: "stellar:testnet",
    }),
  ],
});

---

### 2. Dosya: `docs/sponsored-account-reference.md`
Bu dosya, hackathon'un en can alıcı özelliklerinden biri olan (Özellik 2) "Ajanlara sponsorlu cüzdan açma" API'sinin referansıdır.

```markdown
# Stellar Sponsored Agent Account API Reference
Base URL for testnet: `https://stellar-sponsored-agent-account.onrender.com`

## Flow & API Shape
The flow requires exactly two HTTP calls. 
Cost to agent: 0 XLM. Service sponsors ~1.5 XLM for reserves and USDC trustline.

### Call 1: POST `/create`
Gets the unsigned sponsorship transaction.
- **Request:** `{ "public_key": "<agent_public_key>" }`
- **Response:** `{ "xdr": "<unsigned_xdr>", "network_passphrase": "..." }`

### Call 2: POST `/submit`
Submits the agent-signed transaction back to the service. Must be called within 30s.
- **Request:** `{ "xdr": "<agent_signed_xdr>" }`
- **Response:** `{ "status": "ok", "hash": "...", "agent_public_key": "...", "explorer_url": "..." }`

## JS SDK Integration Example
```javascript
import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';
const SERVICE = '[https://stellar-sponsored-agent-account.onrender.com](https://stellar-sponsored-agent-account.onrender.com)';

// 1. Generate agent keypair locally
const kp = Keypair.random();

// 2. Request sponsored account
const createRes = await fetch(`${SERVICE}/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ public_key: kp.publicKey() }),
});
const { xdr, network_passphrase } = await createRes.json();

// 3. Agent Signs
const tx = TransactionBuilder.fromXDR(xdr, network_passphrase);
tx.sign(kp);

// 4. Submit
const submitRes = await fetch(`${SERVICE}/submit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ xdr: tx.toXDR() }),
});
const result = await submitRes.json();

---

### 3. Dosya: `docs/x402-reference.md`
Next.js App Router üzerinde x402 protokolüyle ödeme bariyeri kurarken Copilot'un ihtiyaç duyacağı JSON şemaları ve mimari referanslar.

```markdown
# x402 Protocol Data Types & Schema Reference

## 1. Payment Required Response (HTTP 402)
Returned by the resource server to initiate payment.
```json
{
  "x402Version": 2,
  "accepts": [
    {
      "scheme": "exact",
      "network": "stellar:testnet",
      "maxAmountRequired": "100000",
      "resource": "[https://api.domain.com/scan](https://api.domain.com/scan)",
      "description": "Security Audit Report",
      "payTo": "GABC123...",
      "maxTimeoutSeconds": 30,
      "asset": "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
    }
  ]
}
2. Facilitator API Endpoints (OpenZeppelin)
Facilitator verifies and settles payments so the resource server doesn't need to touch blockchain nodes directly.
URL: https://channels.openzeppelin.com/x402/testnet

POST /verify
Request: { "x402Version": 2, "paymentHeader": "<b64>", "paymentRequirements": {...} }

Response: { "isValid": true, "invalidReason": null }

POST /settle
Request: { "x402Version": 2, "paymentHeader": "<b64>", "paymentRequirements": {...} }

Response: { "success": true, "error": null, "txHash": "...", "networkId": "stellar:testnet" }