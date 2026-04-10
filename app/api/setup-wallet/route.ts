import { NextResponse } from "next/server";
import { Asset, BASE_FEE, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { getSponsorKeypair, getHorizonServer, accountExists } from "@/lib/stellar/wallet";

// Official Testnet USDC issuer
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

// Sponsor pays generous fee to avoid tx_insufficient_fee on busy networks
const SPONSOR_FEE = String(Number(BASE_FEE) * 10);

/**
 * POST /api/setup-wallet
 *
 * Feature 2 — Sponsored Onboarding.
 *
 * Accepts { public_key } and returns an unsigned XDR envelope that, once
 * co-signed by the user's wallet and the sponsor, will:
 *
 *   Case A — Account DOES NOT exist on the network:
 *     1. beginSponsoringFutureReserves  (sponsor → user)
 *     2. createAccount  (startingBalance "0" — reserves are sponsored)
 *     3. changeTrust USDC  (source = user)
 *     4. endSponsoringFutureReserves  (source = user)
 *     → Result: "sponsored" — new identity with 0 XLM.
 *
 *   Case B — Account already exists:
 *     Check if USDC trustline exists. If not, add it (sponsored).
 *     → Result: "existing" — account is ready.
 *
 * The response includes an `onboarding` field so the UI can signal
 * what just happened.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const publicKey = body?.public_key || body?.publicKey;

    if (!publicKey || typeof publicKey !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid public_key in request body" },
        { status: 400 }
      );
    }

    const sponsor = getSponsorKeypair();
    if (!sponsor) {
      return NextResponse.json(
        { error: "Sponsor keypair not configured on server" },
        { status: 500 }
      );
    }

    const server = getHorizonServer();

    // Load sponsor account (must exist)
    let sponsorAccount;
    try {
      sponsorAccount = await server.loadAccount(sponsor.publicKey());
    } catch {
      return NextResponse.json(
        { error: "Sponsor account does not exist or is not funded on testnet" },
        { status: 500 }
      );
    }

    const baseFee = await server.fetchBaseFee();
    const fee = String(Math.max(Number(SPONSOR_FEE), baseFee * 4));

    // -----------------------------------------------------------------------
    // Determine whether the user's account already exists on the network
    // -----------------------------------------------------------------------
    const userExists = await accountExists(publicKey);

    if (userExists) {
      // ----- Case B: Account exists — check USDC trustline -----
      const userAccount = await server.loadAccount(publicKey);
      const usdcAsset = new Asset("USDC", USDC_ISSUER);
      const hasTrustline = userAccount.balances.some(
        (b: any) =>
          b.asset_type === "credit_alphanum4" &&
          b.asset_code === "USDC" &&
          b.asset_issuer === USDC_ISSUER
      );

      if (hasTrustline) {
        // Already fully onboarded — nothing to do
        return NextResponse.json(
          {
            onboarding: "ready",
            message: "Account exists and USDC trustline is already configured.",
          },
          { status: 200 }
        );
      }

      // Add sponsored USDC trustline for the existing account
      const txBuilder = new TransactionBuilder(sponsorAccount, {
        fee,
        networkPassphrase: Networks.TESTNET,
      }).setTimeout(180);

      txBuilder.addOperation(
        Operation.beginSponsoringFutureReserves({ sponsoredId: publicKey })
      );
      txBuilder.addOperation(
        Operation.changeTrust({ asset: usdcAsset, source: publicKey })
      );
      txBuilder.addOperation(
        Operation.endSponsoringFutureReserves({ source: publicKey })
      );

      const tx = txBuilder.build();

      return NextResponse.json(
        {
          onboarding: "trustline",
          xdr: tx.toXDR(),
          network_passphrase: Networks.TESTNET,
          message: "Account exists. Sponsored USDC trustline will be added.",
        },
        { status: 200 }
      );
    }

    // ----- Case A: Account does NOT exist — full sponsored onboarding -----
    const usdcAsset = new Asset("USDC", USDC_ISSUER);

    const txBuilder = new TransactionBuilder(sponsorAccount, {
      fee,
      networkPassphrase: Networks.TESTNET,
    }).setTimeout(180);

    // 1) Sponsor begins covering all reserves for the new account
    txBuilder.addOperation(
      Operation.beginSponsoringFutureReserves({ sponsoredId: publicKey })
    );

    // 2) Create account with 0 XLM (reserves are sponsor-backed)
    txBuilder.addOperation(
      Operation.createAccount({ destination: publicKey, startingBalance: "0" })
    );

    // 3) USDC trustline (source = new user, reserve sponsored)
    txBuilder.addOperation(
      Operation.changeTrust({ asset: usdcAsset, source: publicKey })
    );

    // 4) End sponsorship (source = sponsored account)
    txBuilder.addOperation(
      Operation.endSponsoringFutureReserves({ source: publicKey })
    );

    const tx = txBuilder.build();

    return NextResponse.json(
      {
        onboarding: "sponsored",
        xdr: tx.toXDR(),
        network_passphrase: Networks.TESTNET,
        message:
          "Sponsored identity created. Account + USDC trustline with 0 XLM balance.",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: `Internal server error: ${err.message || String(err)}` },
      { status: 500 }
    );
  }
}
