import {
  Horizon,
  Keypair,
  TransactionBuilder,
  FeeBumpTransaction,
  Networks,
  Operation,
  Memo,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { getSponsorKeypair, getRecipientKeypair } from "./wallet";
import { createHash } from "crypto";

const HORIZON_URL =
  process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
const FRIENDBOT_URL =
  process.env.STELLAR_FRIENDBOT_URL || "https://friendbot.stellar.org";

// Sponsor covers fees with a generous multiplier to avoid tx_insufficient_fee
const SPONSOR_FEE = String(Number(BASE_FEE) * 10);

/**
 * Generate a SHA-256 hash (raw 32-byte Buffer) of the given data string.
 */
export function sha256(data: string): Buffer {
  return createHash("sha256").update(data, "utf8").digest();
}

/**
 * Ensure the given account exists on testnet; fund it via Friendbot if not.
 */
async function ensureAccountFunded(
  server: Horizon.Server,
  keypair: Keypair
): Promise<void> {
  try {
    await server.loadAccount(keypair.publicKey());
  } catch {
    console.warn(
      `[auditProof] Account ${keypair.publicKey()} not found — funding via Friendbot…`
    );
    const res = await fetch(
      `${FRIENDBOT_URL}?addr=${keypair.publicKey()}`
    );
    if (!res.ok) {
      throw new Error(
        `Friendbot funding failed: ${res.status} ${res.statusText}`
      );
    }
    console.log("[auditProof] Account funded successfully.");
  }
}

// ---------------------------------------------------------------------------
// Feature 4 — Sponsored Audit Proof
// ---------------------------------------------------------------------------

/**
 * Submit a fee-sponsored "audit proof" transaction to the Stellar testnet.
 *
 * Architecture:
 *   • The **recipient** account is the logical source — it is the "user" whose
 *     audit history is being recorded on-chain.
 *   • The **sponsor** account pays ALL fees and covers reserve requirements
 *     via `beginSponsoringFutureReserves` so the recipient never needs XLM.
 *   • The inner transaction is wrapped in a `FeeBumpTransaction` with the
 *     sponsor as the `feeSource`, making fee sponsoring explicit at the
 *     protocol level.
 *   • Both keys are server-side, so both signatures are applied here.
 *
 * Flow:
 *   1. Ensure both accounts exist (auto-fund via Friendbot on testnet).
 *   2. Build inner tx: sponsor begins reserve sponsoring → manageData
 *      (audit hash) sourced from recipient → sponsor ends sponsoring.
 *   3. Sign inner tx with recipient key.
 *   4. Wrap in FeeBumpTransaction signed by sponsor (fee payer).
 *   5. Submit the fee-bump envelope.
 *
 * @param analysisJson - The stringified JSON of the scan report to anchor.
 * @returns The Stellar transaction hash, or null if the submission fails.
 */
export async function submitAuditProof(
  analysisJson: string
): Promise<string | null> {
  const sponsor = getSponsorKeypair();
  if (!sponsor) {
    console.error("[auditProof] SPONSOR_SECRET_KEY not configured — skipping on-chain proof");
    return null;
  }

  const recipient = getRecipientKeypair();
  if (!recipient) {
    console.error("[auditProof] RECIPIENT_SECRET_KEY not configured — skipping on-chain proof");
    return null;
  }

  const server = new Horizon.Server(HORIZON_URL);

  try {
    // Ensure both accounts exist on testnet before building the tx
    await ensureAccountFunded(server, sponsor);
    await ensureAccountFunded(server, recipient);

    // Load the recipient as the inner tx source
    const recipientAccount = await server.loadAccount(recipient.publicKey());

    // SHA-256 of the analysis JSON → 32-byte hash for Memo.hash
    const hash = sha256(analysisJson);

    // ----- Inner transaction (source = recipient) -----
    const innerTx = new TransactionBuilder(recipientAccount, {
      fee: BASE_FEE, // placeholder — the fee-bump wrapper overrides this
      networkPassphrase: Networks.TESTNET,
    })
      // 1. Sponsor begins covering reserve for the manageData entry
      .addOperation(
        Operation.beginSponsoringFutureReserves({
          sponsoredId: recipient.publicKey(),
          source: sponsor.publicKey(),
        })
      )
      // 2. manageData anchoring the audit hash (sourced from recipient)
      .addOperation(
        Operation.manageData({
          name: "lumina_audit_hash",
          value: hash.toString("hex"),
          source: recipient.publicKey(),
        })
      )
      // 3. End sponsoring (source = the sponsored account = recipient)
      .addOperation(
        Operation.endSponsoringFutureReserves({
          source: recipient.publicKey(),
        })
      )
      .addMemo(Memo.hash(hash))
      .setTimeout(120)
      .build();

    // Inner tx must be signed by both:
    //  • recipient — as the tx source and for endSponsoringFutureReserves
    //  • sponsor  — for beginSponsoringFutureReserves
    innerTx.sign(recipient);
    innerTx.sign(sponsor);

    // ----- Fee-bump wrapper (feeSource = sponsor) -----
    const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
      sponsor,            // fee payer
      SPONSOR_FEE,        // max fee the sponsor is willing to pay
      innerTx,            // the inner transaction
      Networks.TESTNET
    );

    // Fee-bump must be signed by the fee payer (sponsor)
    feeBumpTx.sign(sponsor);

    console.log("[auditProof] Submitting fee-sponsored audit proof…");
    const response = await server.submitTransaction(feeBumpTx);
    const txHash = (response as Horizon.HorizonApi.SubmitTransactionResponse).hash;

    console.log("[auditProof] ✅ Fee-sponsored proof submitted:", txHash);
    return txHash;
  } catch (err: any) {
    // Log detailed Horizon error information when available
    const resultCodes = err?.response?.data?.extras?.result_codes;
    const horizonDetail = err?.response?.data?.detail;
    console.error(
      "[auditProof] Failed to submit sponsored proof transaction:",
      resultCodes ?? horizonDetail ?? err?.message ?? err
    );
    return null;
  }
}
