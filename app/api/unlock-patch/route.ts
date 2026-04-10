import { NextResponse } from "next/server";
import { Mppx } from "mppx/server";
import { stellar } from "@stellar/mpp/charge/server";
import { USDC_SAC_TESTNET } from "@stellar/mpp";
import { getRecipientKeypair } from "@/lib/stellar/wallet";
import { getSession, deductFromSession } from "@/lib/session/store";

// Fixed price for unlocking a single remediation patch
const PATCH_PRICE_USDC = 1; // 1 USDC
const PATCH_PRICE_STR = "1.0000000"; // Stellar 7-decimal format

// Resolve the recipient public key at module load time
const recipientKeypair = getRecipientKeypair();
const recipientAddress = recipientKeypair?.publicKey() ?? "";

// Initialize MPP charge protocol for patch unlocks
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

    // Validate request body
    const clonedReq = req.clone();
    let issueIndex: number;
    try {
      const body = await clonedReq.json();
      issueIndex = body?.issueIndex;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (typeof issueIndex !== "number" || issueIndex < 0) {
      return NextResponse.json(
        { error: "Missing or invalid 'issueIndex' field" },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // Feature 1 — Session-based payment: deduct from pre-authorized allowance
    // -----------------------------------------------------------------------
    const sessionToken = req.headers.get("x-session-token");
    let paidViaSession = false;
    let sessionRemaining: number | null = null;

    if (sessionToken) {
      const session = getSession(sessionToken);
      if (session) {
        const deduction = deductFromSession(sessionToken, PATCH_PRICE_USDC);
        if (deduction) {
          paidViaSession = true;
          sessionRemaining = deduction.remaining;
          console.log(
            `[unlock-patch] ✅ Session payment: ${PATCH_PRICE_USDC} USDC deducted — remaining: ${sessionRemaining}`
          );
        }
      }
    }

    if (!paidViaSession) {
      // Standard MPP charge for 1 USDC
      const result = await mppx.charge({
        amount: PATCH_PRICE_STR,
        description: `Unlock remediation patch #${issueIndex + 1}`,
      })(req);

      // If payment is required (402), forward the challenge
      if (result.status === 402) {
        return result.challenge;
      }

      // Payment succeeded via MPP — return with receipt
      console.log(`[unlock-patch] Patch #${issueIndex + 1} unlocked (1 USDC via MPP)`);

      return result.withReceipt(
        NextResponse.json(
          { unlocked: true, issueIndex },
          { status: 200 }
        )
      );
    }

    // Session payment succeeded — return confirmation
    console.log(`[unlock-patch] Patch #${issueIndex + 1} unlocked (1 USDC via session)`);

    const response = NextResponse.json(
      { unlocked: true, issueIndex },
      { status: 200 }
    );
    response.headers.set("X-Session-Remaining", String(sessionRemaining));
    return response;
  } catch (err: any) {
    console.error("[unlock-patch] Error:", err?.message ?? err);
    return NextResponse.json(
      { error: `Internal server error: ${err.message || String(err)}` },
      { status: 500 }
    );
  }
}
