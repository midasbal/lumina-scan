import { NextResponse } from "next/server";
import { Mppx } from "mppx/server";
import { stellar } from "@stellar/mpp/charge/server";
import { USDC_SAC_TESTNET } from "@stellar/mpp";
import { getRecipientKeypair } from "@/lib/stellar/wallet";
import { analyzeCode } from "@/lib/ai/analyzer";
import { submitAuditProof } from "@/lib/stellar/audit-proof";
import { calculatePrice, toStellarAmount } from "@/lib/pricing";
import { getSession, deductFromSession } from "@/lib/session/store";

// Resolve the recipient public key at module load time
const recipientKeypair = getRecipientKeypair();
const recipientAddress = recipientKeypair?.publicKey() ?? "";

// Initialize MPP charge protocol
const mppx = Mppx.create({
  secretKey: process.env.MPP_SECRET_KEY!,
  methods: [
    stellar.charge({
      recipient: recipientAddress,
      currency: USDC_SAC_TESTNET,
      network: "stellar:testnet",
    }),
  ],
});

export async function POST(req: Request) {
  try {
    if (!recipientAddress) {
      return NextResponse.json(
        { error: "Recipient keypair not configured on server" },
        { status: 500 }
      );
    }

    // Clone the request so we can read the body for code extraction
    // while still passing the original request to the MPP charge flow
    const clonedReq = req.clone();

    // Extract the code string from the request body
    let code: string;
    let priority = false;
    try {
      const body = await clonedReq.json();
      code = body?.code;
      priority = body?.priority === true;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'code' field in request body" },
        { status: 400 }
      );
    }

    // Calculate dynamic price based on code complexity + priority surcharge
    const price = calculatePrice(code, priority);
    const priceStr = toStellarAmount(price);

    console.log(
      `[scan] Dynamic pricing: ${code.length} chars${priority ? " + PRIORITY" : ""} → ${priceStr} USDC`
    );

    // -----------------------------------------------------------------------
    // Feature 1 — Session-based payment: deduct from pre-authorized allowance
    // -----------------------------------------------------------------------
    const sessionToken = req.headers.get("x-session-token");
    let sessionDeduction: { remaining: number } | null = null;
    let paidViaSession = false;

    if (sessionToken) {
      const session = getSession(sessionToken);
      if (session) {
        sessionDeduction = deductFromSession(sessionToken, price);
        if (sessionDeduction) {
          paidViaSession = true;
          console.log(
            `[scan] ✅ Session payment: ${price} USDC deducted — remaining: ${sessionDeduction.remaining}`
          );
        } else {
          console.warn("[scan] Session allowance insufficient — falling back to MPP");
        }
      }
    }

    // If not paid via session, use standard MPP charge
    if (!paidViaSession) {
      // Invoke the charge with the calculated price
      const result = await mppx.charge({
        amount: priceStr,
        description: `Autonomous Security Audit (${code.length} chars)`,
      })(req);

      // If payment is required (402), forward the challenge response to the caller
      if (result.status === 402) {
        return result.challenge;
      }

      // Payment succeeded via MPP — run the audit and wrap with receipt
      // Feature 9: Non-priority requests wait in the simulated queue
      if (!priority) {
        console.log("[scan] Standard queue — waiting 4s…");
        await new Promise((r) => setTimeout(r, 4000));
      } else {
        console.log("[scan] ⚡ VIP priority — skipping queue");
      }

      const scanReport = await analyzeCode(code);
      const reportJson = JSON.stringify(scanReport);
      const proofTxHash = await submitAuditProof(reportJson);

      if (proofTxHash) {
        scanReport.auditProofTxHash = proofTxHash;
        console.log("[scan] Fee-sponsored audit proof attached:", proofTxHash);
      } else {
        console.warn("[scan] Audit proof was NOT attached — submitAuditProof returned null");
      }

      return result.withReceipt(NextResponse.json(scanReport, { status: 200 }));
    }

    // Session payment succeeded — run the audit (no MPP receipt wrapper needed)
    // Feature 9: Non-priority requests wait in the simulated queue
    if (!priority) {
      console.log("[scan] Standard queue — waiting 4s…");
      await new Promise((r) => setTimeout(r, 4000));
    } else {
      console.log("[scan] ⚡ VIP priority — skipping queue");
    }

    const scanReport = await analyzeCode(code);

    // Submit on-chain audit proof (SHA-256 of report as Stellar Memo.hash)
    const reportJson = JSON.stringify(scanReport);
    const proofTxHash = await submitAuditProof(reportJson);

    if (proofTxHash) {
      scanReport.auditProofTxHash = proofTxHash;
      console.log("[scan] Fee-sponsored audit proof attached:", proofTxHash);
    } else {
      console.warn("[scan] Audit proof was NOT attached — submitAuditProof returned null");
    }

    // Return result with session metadata
    const response = NextResponse.json(scanReport, { status: 200 });
    response.headers.set("X-Session-Remaining", String(sessionDeduction!.remaining));
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: `Internal server error: ${err.message || String(err)}` },
      { status: 500 }
    );
  }
}
