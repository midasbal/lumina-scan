// ---------------------------------------------------------------------------
// Feature 1 — MPP Session API
// ---------------------------------------------------------------------------
// POST /api/session — Start a new pay-as-you-go session
//   Body: { depositAmount: number } (e.g. 5)
//   Payment: 1-time MPP charge for the full deposit amount
//   Response: { token, remainingAllowance, depositAmount }
//
// DELETE /api/session — End an active session
//   Headers: X-Session-Token: <token>
//   Response: { ended: true }
//
// GET /api/session — Check session status
//   Headers: X-Session-Token: <token>
//   Response: { active, remainingAllowance, depositAmount }
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { Mppx } from "mppx/server";
import { stellar } from "@stellar/mpp/charge/server";
import { USDC_SAC_TESTNET } from "@stellar/mpp";
import { getRecipientKeypair } from "@/lib/stellar/wallet";
import { createSession, getSession, destroySession } from "@/lib/session/store";
import { toStellarAmount } from "@/lib/pricing";

// Pre-defined session tiers (USDC)
const SESSION_TIERS = [5, 10, 25, 50];
const MIN_DEPOSIT = 5;
const MAX_DEPOSIT = 50;

// Resolve the recipient public key at module load time
const recipientKeypair = getRecipientKeypair();
const recipientAddress = recipientKeypair?.publicKey() ?? "";

// Initialize MPP charge protocol for session deposits
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

// ---------------------------------------------------------------------------
// POST — Start a new session with a deposit payment
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    if (!recipientAddress) {
      return NextResponse.json(
        { error: "Recipient keypair not configured on server" },
        { status: 500 }
      );
    }

    // Read body for deposit amount
    const clonedReq = req.clone();
    let depositAmount: number;
    let walletAddress: string;

    try {
      const body = await clonedReq.json();
      depositAmount = body?.depositAmount;
      walletAddress = body?.walletAddress;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (
      typeof depositAmount !== "number" ||
      depositAmount < MIN_DEPOSIT ||
      depositAmount > MAX_DEPOSIT
    ) {
      return NextResponse.json(
        {
          error: `Invalid deposit amount. Must be between ${MIN_DEPOSIT} and ${MAX_DEPOSIT} USDC.`,
          tiers: SESSION_TIERS,
        },
        { status: 400 }
      );
    }

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Missing walletAddress field" },
        { status: 400 }
      );
    }

    // Charge the full deposit via MPP
    const priceStr = toStellarAmount(depositAmount);

    const result = await mppx.charge({
      amount: priceStr,
      description: `Pro Session Deposit (${depositAmount} USDC)`,
    })(req);

    // If payment is required (402), forward the challenge
    if (result.status === 402) {
      return result.challenge;
    }

    // Payment succeeded — create a session
    // Use a placeholder tx hash (the MPP receipt contains the real one,
    // but for the session store we just need a reference)
    const depositTxHash = `session-deposit-${Date.now()}`;

    const { token, session } = createSession(
      walletAddress,
      depositAmount,
      depositTxHash
    );

    console.log(
      `[session] ✅ Pro session started: ${walletAddress.slice(0, 8)}… — ${depositAmount} USDC`
    );

    return result.withReceipt(
      NextResponse.json(
        {
          token,
          remainingAllowance: session.remainingAllowance,
          depositAmount: session.depositAmount,
          createdAt: session.createdAt,
        },
        { status: 201 }
      )
    );
  } catch (err: any) {
    console.error("[session] POST error:", err?.message ?? err);
    return NextResponse.json(
      { error: `Internal server error: ${err.message || String(err)}` },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET — Check session status
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  const token = req.headers.get("x-session-token");

  if (!token) {
    return NextResponse.json(
      { active: false, error: "No session token provided" },
      { status: 400 }
    );
  }

  const session = getSession(token);

  if (!session) {
    return NextResponse.json({ active: false }, { status: 404 });
  }

  return NextResponse.json({
    active: session.remainingAllowance > 0,
    remainingAllowance: session.remainingAllowance,
    depositAmount: session.depositAmount,
    walletAddress: session.walletAddress,
    createdAt: session.createdAt,
  });
}

// ---------------------------------------------------------------------------
// DELETE — End session
// ---------------------------------------------------------------------------
export async function DELETE(req: Request) {
  const token = req.headers.get("x-session-token");

  if (!token) {
    return NextResponse.json(
      { error: "No session token provided" },
      { status: 400 }
    );
  }

  const destroyed = destroySession(token);

  if (!destroyed) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  console.log("[session] Session ended by user");

  return NextResponse.json({ ended: true });
}
