import { Horizon, Keypair } from "@stellar/stellar-sdk";

// Horizon and friendbot endpoints for Stellar testnet
const HORIZON_URL = process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
const FRIEND_BOT_URL = process.env.STELLAR_FRIENDBOT_URL || "https://friendbot.stellar.org";

const server = new Horizon.Server(HORIZON_URL);

/**
 * Load a Keypair from an environment variable containing a secret key.
 * Returns null if the environment variable is not set or invalid.
 */
export function loadKeypairFromEnv(envName: string): Keypair | null {
  const secret = process.env[envName];
  if (!secret) return null;
  try {
    return Keypair.fromSecret(secret);
  } catch (err) {
    return null;
  }
}

/**
 * Get the server-side sponsor keypair from SPONSOR_SECRET_KEY environment variable.
 * Returns null if not configured.
 */
export function getSponsorKeypair(): Keypair | null {
  return loadKeypairFromEnv("SPONSOR_SECRET_KEY");
}

/**
 * Get the server-side recipient keypair from RECIPIENT_SECRET_KEY environment variable.
 * Returns null if not configured.
 */
export function getRecipientKeypair(): Keypair | null {
  return loadKeypairFromEnv("RECIPIENT_SECRET_KEY");
}

/**
 * Returns the initialized Horizon server instance for testnet interactions.
 */
export function getHorizonServer(): Horizon.Server {
  return server;
}

/**
 * Fund a testnet account using Stellar Friendbot.
 * This is intended for onboarding / testnet flows only.
 * Throws an error if funding fails.
 */
export async function fundTestnetAccount(publicKey: string): Promise<void> {
  if (!publicKey) throw new Error("publicKey is required for friendbot funding");

  const url = new URL(FRIEND_BOT_URL);
  url.searchParams.append("addr", publicKey);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Friendbot funding failed: ${res.status} ${res.statusText} ${body}`);
  }
}

/**
 * Check whether an account exists on the configured Horizon network.
 * Returns true if the account exists, false otherwise.
 */
export async function accountExists(publicKey: string): Promise<boolean> {
  try {
    await server.loadAccount(publicKey);
    return true;
  } catch (err: any) {
    // Horizon returns NotFoundError when account does not exist
    return false;
  }
}

/**
 * Ensure that a keypair's account exists on testnet. If the account does not exist,
 * attempt to fund it using Friendbot. Returns true if the account exists after the call.
 */
export async function ensureAccountExistsAndFund(keypair: Keypair): Promise<boolean> {
  const pub = keypair.publicKey();
  const exists = await accountExists(pub);
  if (exists) return true;

  await fundTestnetAccount(pub);

  // After funding, confirm the account exists
  return await accountExists(pub);
}

/**
 * Initialize server-side wallets for sponsor and recipient using environment variables.
 * This will load keypairs from SPONSOR_SECRET_KEY and RECIPIENT_SECRET_KEY, attempt to
 * fund them on testnet if they do not exist, and return the loaded keypairs.
 *
 * The function does not create keys automatically; environment variables must be set.
 */
export async function initServerWallets(): Promise<{
  sponsor: Keypair | null;
  recipient: Keypair | null;
}> {
  const sponsor = getSponsorKeypair();
  const recipient = getRecipientKeypair();

  if (sponsor) {
    try {
      await ensureAccountExistsAndFund(sponsor);
    } catch (err) {
      // If funding fails, surface the error to the caller but keep going for recipient
      throw new Error(`Failed to ensure sponsor account funded: ${(err as Error).message}`);
    }
  }

  if (recipient) {
    try {
      await ensureAccountExistsAndFund(recipient);
    } catch (err) {
      throw new Error(`Failed to ensure recipient account funded: ${(err as Error).message}`);
    }
  }

  return { sponsor, recipient };
}

export default {
  getHorizonServer,
  getSponsorKeypair,
  getRecipientKeypair,
  fundTestnetAccount,
  accountExists,
  ensureAccountExistsAndFund,
  initServerWallets,
};
