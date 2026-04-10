import { NextResponse } from "next/server";
import { Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { getSponsorKeypair, getHorizonServer } from "@/lib/stellar/wallet";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const xdr = body?.xdr;

    if (!xdr || typeof xdr !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid xdr in request body" },
        { status: 400 }
      );
    }

    // Load the sponsor keypair from environment
    const sponsorKeypair = getSponsorKeypair();
    if (!sponsorKeypair) {
      return NextResponse.json(
        { error: "Sponsor keypair not configured on server" },
        { status: 500 }
      );
    }

    // Rebuild the transaction from the agent-signed XDR
    let tx;
    try {
      tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid XDR: unable to parse transaction" },
        { status: 400 }
      );
    }

    // Sponsor co-signs the transaction
    tx.sign(sponsorKeypair);

    // Submit the fully signed transaction to the Stellar testnet
    const server = getHorizonServer();
    let result;
    try {
      result = await server.submitTransaction(tx);
    } catch (submitErr: any) {
      // Horizon returns detailed error info in response.data.extras
      const extras = submitErr?.response?.data?.extras;
      const resultCodes = extras?.result_codes;
      return NextResponse.json(
        {
          error: "Transaction submission failed",
          details: resultCodes || submitErr?.message || String(submitErr),
        },
        { status: 400 }
      );
    }

    const txHash = result.hash;
    const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${txHash}`;

    return NextResponse.json(
      {
        status: "ok",
        hash: txHash,
        explorer_url: explorerUrl,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: `Internal server error: ${err.message || String(err)}` },
      { status: 500 }
    );
  }
}
