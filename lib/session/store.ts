// ---------------------------------------------------------------------------
// Feature 1 — MPP Session Store (Pay-as-you-go)
// ---------------------------------------------------------------------------
// In-memory session store for pre-authorized USDC allowances.
// Each session maps a token → { walletAddress, remainingAllowance, depositTxHash }.
//
// NOTE: In production this would be backed by a database or Redis.
//       For the hackathon / testnet demo, an in-memory Map is sufficient.
// ---------------------------------------------------------------------------

import { randomBytes } from "crypto";

export interface Session {
  /** The Stellar public key of the user who deposited. */
  walletAddress: string;
  /** Remaining USDC allowance (in human-readable units, e.g. 5.0). */
  remainingAllowance: number;
  /** The initial deposit amount. */
  depositAmount: number;
  /** Stellar transaction hash of the deposit. */
  depositTxHash: string;
  /** ISO timestamp of session creation. */
  createdAt: string;
}

// Token → Session mapping
const sessions = new Map<string, Session>();

/**
 * Generate a cryptographically random session token.
 */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a new session after deposit verification.
 *
 * @param walletAddress - The user's Stellar public key.
 * @param depositAmount - The USDC amount deposited (e.g. 5).
 * @param depositTxHash - The verified Stellar transaction hash.
 * @returns The session token and initial allowance.
 */
export function createSession(
  walletAddress: string,
  depositAmount: number,
  depositTxHash: string
): { token: string; session: Session } {
  const token = generateToken();
  const session: Session = {
    walletAddress,
    remainingAllowance: depositAmount,
    depositAmount,
    depositTxHash,
    createdAt: new Date().toISOString(),
  };

  sessions.set(token, session);
  console.log(
    `[session] Created session for ${walletAddress.slice(0, 8)}… — ${depositAmount} USDC allowance`
  );

  return { token, session };
}

/**
 * Look up a session by token.
 * Returns the session if it exists and has remaining allowance, null otherwise.
 */
export function getSession(token: string): Session | null {
  return sessions.get(token) ?? null;
}

/**
 * Attempt to deduct an amount from a session's allowance.
 *
 * @param token - The session token.
 * @param amount - The USDC amount to deduct.
 * @returns The updated remaining allowance, or null if insufficient funds.
 */
export function deductFromSession(
  token: string,
  amount: number
): { remaining: number } | null {
  const session = sessions.get(token);
  if (!session) return null;

  if (session.remainingAllowance < amount) {
    console.warn(
      `[session] Insufficient allowance: ${session.remainingAllowance} < ${amount}`
    );
    return null;
  }

  session.remainingAllowance = parseFloat(
    (session.remainingAllowance - amount).toFixed(7)
  );

  console.log(
    `[session] Deducted ${amount} USDC — remaining: ${session.remainingAllowance}`
  );

  return { remaining: session.remainingAllowance };
}

/**
 * Destroy a session (e.g. on disconnect).
 */
export function destroySession(token: string): boolean {
  return sessions.delete(token);
}
