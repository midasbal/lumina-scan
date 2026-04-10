"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Send,
  FileCode2,
  Lightbulb,
  ChevronRight,
  Sparkles,
  Wallet,
  LogOut,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Unlock,
  Zap,
  CreditCard,
  Terminal,
  Code2,
  BookOpen,
  History,
  Clock,
  Trash2,
  X,
  Download,
  Sun,
  Moon,
  FileDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import type { ScanReport } from "@/types";
import { calculatePrice, formatPrice, BASE_FEE_USDC, PER_CHAR_USDC, PRIORITY_SURCHARGE } from "@/lib/pricing";

// ---------------------------------------------------------------------------
// Risk level colour mapping
// ---------------------------------------------------------------------------
const RISK_COLORS: Record<ScanReport["riskLevel"], string> = {
  LOW: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  MEDIUM: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  HIGH: "text-orange-400 border-orange-500/20 bg-orange-500/5",
  CRITICAL: "text-red-400 border-red-500/20 bg-red-500/5",
};

const RISK_GLOW: Record<ScanReport["riskLevel"], string> = {
  LOW: "stroke-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]",
  MEDIUM: "stroke-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]",
  HIGH: "stroke-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.4)]",
  CRITICAL: "stroke-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]",
};

const RISK_ICONS: Record<ScanReport["riskLevel"], typeof ShieldCheck> = {
  LOW: ShieldCheck,
  MEDIUM: Shield,
  HIGH: ShieldAlert,
  CRITICAL: AlertTriangle,
};

// Stellar testnet passphrase
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

// ---------------------------------------------------------------------------
// Circular gauge component
// ---------------------------------------------------------------------------
function ScoreGauge({ score, riskLevel }: { score: number; riskLevel: ScanReport["riskLevel"] }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="animate-gauge-reveal relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-zinc-800/60"
          strokeWidth="6"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          className={RISK_GLOW[riskLevel]}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s ease-in-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tracking-tighter font-mono tabular-nums">{score}</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium">Safety</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Truncate a Stellar address for display
// ---------------------------------------------------------------------------
function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Suggestion 2 — Animated number counter hook
// ---------------------------------------------------------------------------
function useAnimatedNumber(target: number, duration = 500) {
  const [display, setDisplay] = useState(target);
  const animRef = useRef<number | null>(null);
  const startRef = useRef(target);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const from = startRef.current;
    const diff = target - from;
    if (Math.abs(diff) < 0.001) {
      setDisplay(target);
      startRef.current = target;
      return;
    }

    startTimeRef.current = null;

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + diff * eased;
      setDisplay(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(target);
        startRef.current = target;
      }
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target, duration]);

  return display;
}

// ---------------------------------------------------------------------------
// Suggestion 1 — Skeleton loading state for the report area
// ---------------------------------------------------------------------------
function ReportSkeleton() {
  return (
    <section className="animate-fade-up mx-auto w-full max-w-4xl">
      {/* Skeleton header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="h-7 w-40 rounded-lg animate-shimmer" />
        <div className="h-9 w-28 rounded-lg animate-shimmer" />
      </div>

      {/* Skeleton proof badge */}
      <div className="mb-6 flex justify-center">
        <div className="h-9 w-72 rounded-full animate-shimmer" />
      </div>

      {/* Skeleton score + risk cards */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
        {/* Score gauge skeleton */}
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-700/30 bg-gradient-to-b from-zinc-900/80 to-zinc-950/60 p-8 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="relative flex items-center justify-center">
            <svg width="140" height="140" className="-rotate-90">
              <circle
                cx="70" cy="70" r="54" fill="none"
                stroke="currentColor" className="text-zinc-800/60" strokeWidth="6"
              />
              <circle
                cx="70" cy="70" r="54" fill="none"
                className="stroke-zinc-700/40" strokeWidth="7"
                strokeLinecap="round" strokeDasharray="339.29" strokeDashoffset="254"
                style={{ animation: "shimmerSweep 2s ease-in-out infinite" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center gap-1">
              <div className="h-8 w-12 rounded animate-shimmer" />
              <div className="h-3 w-10 rounded animate-shimmer" />
            </div>
          </div>
          <div className="h-3 w-28 rounded animate-shimmer" />
        </div>

        {/* Risk level skeleton */}
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-700/30 bg-gradient-to-b from-zinc-900/80 to-zinc-950/60 p-8 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="h-12 w-12 rounded-xl animate-shimmer" />
          <div className="h-7 w-24 rounded-full animate-shimmer" />
          <div className="h-3 w-32 rounded animate-shimmer" />
        </div>
      </div>

      {/* Skeleton issue cards */}
      <div className="mt-10">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="h-4 w-4 rounded animate-shimmer" />
          <div className="h-4 w-32 rounded animate-shimmer" />
          <div className="h-5 w-6 rounded-full animate-shimmer ml-1" />
        </div>
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-800/40 bg-gradient-to-br from-zinc-900/50 via-zinc-950/40 to-zinc-950/60 p-5 backdrop-blur-xl"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 h-7 w-7 rounded-lg animate-shimmer" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-5 w-48 rounded animate-shimmer" />
                    <div className="h-5 w-16 rounded-md animate-shimmer" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3.5 w-full rounded animate-shimmer" />
                    <div className="h-3.5 w-4/5 rounded animate-shimmer" />
                  </div>
                  <div className="rounded-xl border border-zinc-800/30 bg-zinc-800/15 p-3">
                    <div className="flex items-start gap-2.5">
                      <div className="h-3.5 w-3.5 rounded animate-shimmer mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-full rounded animate-shimmer" />
                        <div className="h-3 w-3/4 rounded animate-shimmer" />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-800/40 bg-zinc-950 h-32 animate-shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Suggestion 3 — Audit History (sessionStorage-backed)
// ---------------------------------------------------------------------------
interface AuditHistoryEntry {
  id: string;
  timestamp: number;
  score: number;
  riskLevel: ScanReport["riskLevel"];
  issueCount: number;
  txHash?: string;
  code: string;
  report: ScanReport;
}

const HISTORY_KEY = "lumina_audit_history";
const MAX_HISTORY = 10;

function loadHistory(): AuditHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: AuditHistoryEntry[]) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    // sessionStorage full — ignore
  }
}

function addToHistory(code: string, report: ScanReport): AuditHistoryEntry {
  const entry: AuditHistoryEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    score: report.vulnerabilityScore,
    riskLevel: report.riskLevel,
    issueCount: report.issues.length,
    txHash: report.auditProofTxHash,
    code,
    report,
  };
  const history = loadHistory();
  history.unshift(entry);
  saveHistory(history);
  return entry;
}

function removeFromHistory(id: string) {
  const history = loadHistory().filter((e) => e.id !== id);
  saveHistory(history);
  return history;
}

function clearHistory() {
  sessionStorage.removeItem(HISTORY_KEY);
}

function exportHistory() {
  const history = loadHistory();
  if (history.length === 0) return;
  const json = JSON.stringify(history, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lumina-scan-history.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("History exported", { description: "lumina-scan-history.json" });
}

const RISK_DOT: Record<ScanReport["riskLevel"], string> = {
  LOW: "bg-emerald-400",
  MEDIUM: "bg-amber-400",
  HIGH: "bg-orange-400",
  CRITICAL: "bg-red-500",
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Home() {
  const [code, setCode] = useState("");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentRequired, setPaymentRequired] = useState(false);

  // Copy-to-clipboard state: tracks which issue index was just copied
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Feature 8 — Pay-for-Patch: track which remediation patches are unlocked
  const [unlockedPatches, setUnlockedPatches] = useState<Set<number>>(new Set());
  const [unlockingIdx, setUnlockingIdx] = useState<number | null>(null);

  // Wallet state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletReady, setWalletReady] = useState(false);
  const kitInitialised = useRef(false);

  // Sponsored onboarding state
  const [onboardingStatus, setOnboardingStatus] = useState<
    "idle" | "checking" | "sponsoring" | "sponsored" | "ready" | "failed"
  >("idle");

  // A payment-aware fetch created by mppx/client (set after wallet connect)
  const mppFetchRef = useRef<typeof globalThis.fetch | null>(null);

  // Feature 1 — MPP Session (Pay-as-you-go) state
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionAllowance, setSessionAllowance] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Feature 9 — Priority Queue (VIP lane)
  const [isPriority, setIsPriority] = useState(false);

  // Feature 10 — Dev Tools panel state
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  // Suggestion 2 — Animated session balance
  const animatedBalance = useAnimatedNumber(sessionAllowance);

  // Suggestion 3 — Audit History state
  const [auditHistory, setAuditHistory] = useState<AuditHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Load history on mount
  useEffect(() => {
    setAuditHistory(loadHistory());
  }, []);

  // Theme toggle
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = !mounted || theme === "dark";

  // CSV Export — structured vulnerability data (fix column gated by paywall)
  function exportCsv() {
    if (!report) return;
    // Escape CSV field: wrap in quotes, double any internal quotes
    const esc = (val: string) => `"${val.replace(/"/g, '""')}"`;

    // Include "Suggested Fix" column only for issues whose patches are unlocked
    const hasAnyUnlocked = unlockedPatches.size > 0;
    const header = hasAnyUnlocked
      ? "Severity,Title,Description,Suggested Fix"
      : "Severity,Title,Description";

    const rows = report.issues.map((issue, idx) => {
      const base = [
        esc(issue.severity ?? ""),
        esc(issue.title),
        esc(issue.description ?? ""),
      ];
      if (hasAnyUnlocked) {
        // Only reveal fix for individually unlocked patches
        const fix = unlockedPatches.has(idx)
          ? esc(issue.suggestion || issue.remediation || "")
          : esc("[Locked — Pay 1 USDC to unlock]");
        base.push(fix);
      }
      return base.join(",");
    });

    // UTF-8 BOM for Excel compatibility
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lumina-scan-report.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  }

  // ---------------------------------------------------------------------------
  // Lazy-load and initialise the wallet kit (client-only, runs exactly once)
  // ---------------------------------------------------------------------------
  const initKit = useCallback(async () => {
    if (kitInitialised.current) return;
    kitInitialised.current = true;

    try {
      const { StellarWalletsKit, Networks } = await import(
        "@creit.tech/stellar-wallets-kit"
      );
      const { FreighterModule } = await import(
        "@creit.tech/stellar-wallets-kit/modules/freighter"
      );

      StellarWalletsKit.init({
        modules: [new FreighterModule()],
        network: Networks.TESTNET,
      });

      setWalletReady(true);
    } catch (err) {
      console.error("[initKit] Failed to initialise StellarWalletsKit:", err);
    }
  }, []);

  useEffect(() => {
    initKit();
  }, [initKit]);

  // ---------------------------------------------------------------------------
  // Build a payment-aware fetch using mppx client + StellarWalletsKit signing
  // ---------------------------------------------------------------------------
  async function buildMppFetch(address: string) {
    const { Keypair, Address, Contract, Account, TransactionBuilder, BASE_FEE, nativeToScVal, rpc, authorizeEntry, xdr: StellarXdr } =
      await import("@stellar/stellar-sdk");
    const { Mppx } = await import("mppx/client");
    const { Challenge, Credential, PaymentRequest } = await import("mppx");
    const { StellarWalletsKit } = await import("@creit.tech/stellar-wallets-kit");

    // We create a custom mppx "method" that builds a Soroban SAC transfer
    // and signs the auth entries via the connected wallet (Freighter).
    const stellarChargeMethod = {
      name: "stellar" as const,
      intent: "charge" as const,
      async createCredential({ challenge }: { challenge: any }) {
        const { amount, currency, recipient } = challenge.request;
        const networkId = challenge.request.methodDetails?.network ?? "stellar:testnet";
        const networkPassphrase = TESTNET_PASSPHRASE;

        // Use public Testnet Soroban RPC
        const rpcUrl = "https://soroban-testnet.stellar.org";
        const server = new rpc.Server(rpcUrl);

        // Build SAC transfer(from, to, amount)
        const contract = new Contract(currency);
        const stellarAmount = BigInt(amount);

        const sourceAccount = await server.getAccount(address);
        const transferOp = contract.call(
          "transfer",
          new Address(address).toScVal(),
          new Address(recipient).toScVal(),
          nativeToScVal(stellarAmount, { type: "i128" })
        );

        const builder = new TransactionBuilder(sourceAccount, {
          fee: BASE_FEE,
          networkPassphrase,
        })
          .addOperation(transferOp)
          .setTimeout(120);

        const tx = builder.build();

        // Simulate to attach Soroban resource metadata
        const prepared = await server.prepareTransaction(tx);
        const preparedXdr = prepared.toXDR();

        // Sign the full transaction via wallet (Freighter)
        const { signedTxXdr } = await StellarWalletsKit.signTransaction(preparedXdr, {
          networkPassphrase,
          address,
        });

        const source = `did:pkh:${networkId}:${address}`;

        return Credential.serialize({
          challenge,
          payload: { type: "transaction", transaction: signedTxXdr },
          source,
        });
      },
    };

    const mppClient = Mppx.create({
      methods: [stellarChargeMethod as any],
      polyfill: false,
    });

    mppFetchRef.current = mppClient.fetch;
  }

  // ---------------------------------------------------------------------------
  // Sponsored onboarding — ensures user has an account + USDC trustline
  // ---------------------------------------------------------------------------
  async function sponsoredOnboard(address: string) {
    setOnboardingStatus("checking");

    try {
      // 1. Ask the server to check account status and build the onboarding tx
      const setupRes = await fetch("/api/setup-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_key: address }),
      });

      if (!setupRes.ok) {
        const err = await setupRes.json().catch(() => ({}));
        console.error("[onboard] setup-wallet error:", err);
        setOnboardingStatus("failed");
        return;
      }

      const setupData = await setupRes.json();

      // If the account is already fully ready, no transaction needed
      if (setupData.onboarding === "ready") {
        console.log("[onboard] Account already onboarded");
        setOnboardingStatus("ready");
        return;
      }

      // 2. We have an XDR that needs co-signing — sign with user's wallet
      setOnboardingStatus("sponsoring");

      const { StellarWalletsKit } = await import(
        "@creit.tech/stellar-wallets-kit"
      );

      const { signedTxXdr } = await StellarWalletsKit.signTransaction(
        setupData.xdr,
        {
          networkPassphrase: setupData.network_passphrase,
          address,
        }
      );

      // 3. Submit the co-signed transaction via our server
      const submitRes = await fetch("/api/submit-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xdr: signedTxXdr }),
      });

      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({}));
        console.error("[onboard] submit-wallet error:", err);
        setOnboardingStatus("failed");
        return;
      }

      const submitData = await submitRes.json();
      console.log(
        `[onboard] ✅ ${setupData.onboarding === "sponsored" ? "Sponsored identity created" : "Trustline added"}:`,
        submitData.explorer_url ?? submitData.hash
      );

      setOnboardingStatus(
        setupData.onboarding === "sponsored" ? "sponsored" : "ready"
      );

      // Clear the "sponsored" badge after 6 seconds
      if (setupData.onboarding === "sponsored") {
        setTimeout(() => setOnboardingStatus("ready"), 6000);
      }
    } catch (err: any) {
      console.warn("[onboard] Onboarding skipped or failed:", err?.message ?? err);
      // Non-critical — don't block the user from using the app
      setOnboardingStatus("ready");
    }
  }

  // ---------------------------------------------------------------------------
  // Connect wallet via auth modal + automatic sponsored onboarding
  // ---------------------------------------------------------------------------
  async function connectWallet() {
    try {
      const { StellarWalletsKit } = await import(
        "@creit.tech/stellar-wallets-kit"
      );
      const { address } = await StellarWalletsKit.authModal();
      setWalletAddress(address);

      // Build the payment-aware fetch for this address
      await buildMppFetch(address);

      // Trigger sponsored onboarding (non-blocking — runs in background)
      sponsoredOnboard(address);

      toast.success("Wallet connected", {
        description: `${address.slice(0, 6)}…${address.slice(-4)}`,
      });
    } catch (err: any) {
      console.warn("[connectWallet]", err?.message ?? err);
    }
  }

  // ---------------------------------------------------------------------------
  // Disconnect wallet
  // ---------------------------------------------------------------------------
  async function disconnectWallet() {
    try {
      const { StellarWalletsKit } = await import(
        "@creit.tech/stellar-wallets-kit"
      );
      await StellarWalletsKit.disconnect();
    } catch {
      // Ignore
    }

    // End active session if any
    if (sessionToken) {
      fetch("/api/session", {
        method: "DELETE",
        headers: { "x-session-token": sessionToken },
      }).catch(() => {});
    }

    setWalletAddress(null);
    setOnboardingStatus("idle");
    mppFetchRef.current = null;
    setSessionToken(null);
    setSessionAllowance(0);
    setIsSessionActive(false);
  }

  // ---------------------------------------------------------------------------
  // Feature 1 — Start a Pro session (one-time deposit for frictionless scans)
  // ---------------------------------------------------------------------------
  async function startSession(depositAmount: number = 5) {
    if (!walletAddress || !mppFetchRef.current) {
      setPaymentRequired(true);
      return;
    }

    setSessionLoading(true);

    try {
      const fetchFn = mppFetchRef.current;

      const res = await fetchFn("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositAmount, walletAddress }),
      });

      if (res.status === 402) {
        // MPP challenge — should be handled by mppFetch automatically
        setPaymentRequired(true);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[startSession] Failed:", body);
        return;
      }

      const data = await res.json();
      setSessionToken(data.token);
      setSessionAllowance(data.remainingAllowance);
      setIsSessionActive(true);

      console.log(
        `[startSession] ✅ Pro session active — ${data.remainingAllowance} USDC allowance`
      );
    } catch (err: any) {
      console.error("[startSession] Error:", err?.message ?? err);
    } finally {
      setSessionLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Feature 1 — End the active Pro session
  // ---------------------------------------------------------------------------
  async function endSession() {
    if (!sessionToken) return;

    try {
      await fetch("/api/session", {
        method: "DELETE",
        headers: { "x-session-token": sessionToken },
      });
    } catch {
      // Ignore
    }

    setSessionToken(null);
    setSessionAllowance(0);
    setIsSessionActive(false);
    console.log("[endSession] Pro session ended");
  }

  // ---------------------------------------------------------------------------
  // Scan & Audit flow (with automatic MPP payment handling)
  // ---------------------------------------------------------------------------
  async function handleScan() {
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setReport(null);
    setPaymentRequired(false);
    setUnlockedPatches(new Set());

    try {
      // Decide which fetch to use: session-aware, payment-aware, or plain
      let fetchFn = mppFetchRef.current ?? globalThis.fetch;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // If session is active and has enough allowance, bypass MPP/Freighter
      const scanPrice = calculatePrice(code, isPriority);
      const useSession = isSessionActive && sessionToken && sessionAllowance >= scanPrice;

      if (useSession) {
        // Use plain fetch with session token — no Freighter signature needed
        fetchFn = globalThis.fetch;
        headers["x-session-token"] = sessionToken!;
      }

      const res = await fetchFn("/api/scan", {
        method: "POST",
        headers,
        body: JSON.stringify({ code, priority: isPriority }),
      });

      // Update session allowance from response header
      const remainingHeader = res.headers.get("X-Session-Remaining");
      if (remainingHeader !== null && useSession) {
        const remaining = parseFloat(remainingHeader);
        setSessionAllowance(remaining);
        if (remaining <= 0) {
          setIsSessionActive(false);
          setSessionToken(null);
        }
      }

      // If 402 is still returned, the wallet is not connected
      if (res.status === 402) {
        setPaymentRequired(true);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || `Request failed with status ${res.status}`);
        return;
      }

      const data: ScanReport = await res.json();
      console.log("[handleScan] Report received, auditProofTxHash:", data.auditProofTxHash ?? "NOT PRESENT");
      setReport(data);

      // Suggestion 3 — persist to audit history
      addToHistory(code, data);
      setAuditHistory(loadHistory());

      toast.success("Audit complete", {
        description: `Score ${data.vulnerabilityScore}/100 · ${data.issues.length} issue${data.issues.length !== 1 ? "s" : ""} found`,
      });
    } catch (err: any) {
      const rawMessage =
        err?.message || err?.toString?.() || "An unexpected error occurred";

      // Sanitize technical errors — never show raw crash data to the user
      const TECHNICAL_PATTERNS = [
        /HostError/i, /Panic/i, /Error\(Contract/i, /balance\s+not\s+in\s+range/i,
        /runtime\s+error/i, /wasm\s+trap/i, /out\s+of\s+bounds/i,
      ];
      const isTechnical = TECHNICAL_PATTERNS.some((p) => p.test(rawMessage));
      const message = isTechnical
        ? "Simulation identified a logical failure in the submitted contract"
        : rawMessage;

      console.error("[handleScan] Error details:", {
        message: rawMessage,
        name: err?.name,
        stack: err?.stack,
        raw: err,
      });
      setError(message);
      toast.error("Scan failed", { description: message });
    } finally {
      setLoading(false);
    }
  }

  // =========================================================================
  // Feature 8 — Pay-for-Patch: unlock a single remediation for 1 USDC
  // =========================================================================
  async function unlockPatch(idx: number) {
    if (unlockedPatches.has(idx)) return;

    // Wallet must be connected for MPP payment (or session active)
    if (!mppFetchRef.current && !isSessionActive) {
      setPaymentRequired(true);
      return;
    }

    setUnlockingIdx(idx);

    try {
      const patchPrice = 1; // 1 USDC
      const useSession = isSessionActive && sessionToken && sessionAllowance >= patchPrice;

      let fetchFn: typeof globalThis.fetch;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (useSession) {
        fetchFn = globalThis.fetch;
        headers["x-session-token"] = sessionToken!;
      } else {
        fetchFn = mppFetchRef.current ?? globalThis.fetch;
      }

      const res = await fetchFn("/api/unlock-patch", {
        method: "POST",
        headers,
        body: JSON.stringify({ issueIndex: idx }),
      });

      // Update session allowance from response header
      const remainingHeader = res.headers.get("X-Session-Remaining");
      if (remainingHeader !== null && useSession) {
        const remaining = parseFloat(remainingHeader);
        setSessionAllowance(remaining);
        if (remaining <= 0) {
          setIsSessionActive(false);
          setSessionToken(null);
        }
      }

      if (res.status === 402) {
        setPaymentRequired(true);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[unlockPatch] Failed:", body);
        return;
      }

      // Payment confirmed — reveal the patch
      setUnlockedPatches((prev) => new Set(prev).add(idx));
      toast.success("Patch unlocked", { description: "Remediation code revealed" });
    } catch (err: any) {
      console.error("[unlockPatch] Error:", err?.message ?? err);
      toast.error("Patch unlock failed");
    } finally {
      setUnlockingIdx(null);
    }
  }

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div className="flex flex-col min-h-screen font-sans selection:bg-zinc-700 dark:selection:bg-zinc-700 bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
      {/* --------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* --------------------------------------------------------------- */}
      <header className="border-b border-zinc-200 dark:border-zinc-800/60 bg-white/80 dark:bg-transparent backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            {/* Icon-only on mobile, full logo on sm+ */}
            <img
              src="/lumina-icon.svg"
              alt="Lumina Scan"
              className="h-8 w-8 sm:hidden"
              draggable={false}
            />
            <img
              src="/lumina-logo.svg"
              alt="Lumina Scan"
              className="hidden h-10 w-auto opacity-90 transition-opacity hover:opacity-100 sm:block"
              draggable={false}
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden text-xs tracking-widest uppercase text-zinc-400 dark:text-zinc-600 lg:block">
              Autonomous Web3 Security Auditor
            </span>

            {/* Documentation link */}
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-[11px] font-medium tracking-wider text-zinc-500 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 hover:text-zinc-700 dark:hover:text-zinc-300 sm:flex"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Docs
            </a>

            {/* Theme toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-1.5 text-zinc-500 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 hover:text-zinc-700 dark:hover:text-zinc-300"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* Wallet button + onboarding badge */}
            {walletAddress ? (
              <div className="flex flex-wrap items-center gap-2">
                {/* Onboarding status badge */}
                {onboardingStatus === "checking" && (
                  <span className="flex items-center gap-1.5 rounded-full border border-zinc-700/50 bg-zinc-800/40 px-2.5 py-1 text-[10px] font-medium tracking-wider text-zinc-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking…
                  </span>
                )}
                {onboardingStatus === "sponsoring" && (
                  <span className="flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/5 px-2.5 py-1 text-[10px] font-medium tracking-wider text-sky-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Sponsoring…
                  </span>
                )}
                {onboardingStatus === "sponsored" && (
                  <span className="animate-fade-up flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[10px] font-medium tracking-wider text-emerald-400">
                    <Sparkles className="h-3 w-3" />
                    Sponsored Identity
                  </span>
                )}
                {onboardingStatus === "failed" && (
                  <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[10px] font-medium tracking-wider text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    Setup skipped
                  </span>
                )}

                {/* Feature 1 — Pro Session badge or Start Session button */}
                {isSessionActive ? (
                  <div className="flex items-center gap-1.5">
                    <span className="animate-fade-up flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-300 shadow-lg shadow-indigo-500/5 backdrop-blur">
                      <Zap className="h-3 w-3 text-indigo-400" />
                      Pro
                      <span className="ml-0.5 font-mono tabular-nums tabular-transition text-indigo-400/80">
                        {animatedBalance.toFixed(2)}
                      </span>
                      <span className="text-indigo-500/60">USDC</span>
                    </span>
                    <button
                      onClick={endSession}
                      className="rounded-md p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-400"
                      title="End Pro session"
                    >
                      <CreditCard className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startSession(5)}
                    disabled={sessionLoading}
                    className="flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-indigo-400/80 transition-all hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Deposit 5 USDC for frictionless scanning"
                  >
                    {sessionLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3" />
                    )}
                    {sessionLoading ? "Starting…" : "Go Pro · 5 USDC"}
                  </button>
                )}

                <span className="hidden rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 font-mono text-xs text-zinc-400 sm:block">
                  {truncateAddress(walletAddress)}
                </span>
                <button
                  onClick={disconnectWallet}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
                  title="Disconnect wallet"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={!walletReady}
                className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Wallet className="h-3.5 w-3.5" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------- */}
      {/* Main content                                                    */}
      {/* --------------------------------------------------------------- */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-12">
        {/* Hero section — visible only in input state */}
        {!report && (
          <section className="flex flex-col items-center gap-4 pt-6 text-center">
            <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs text-zinc-400">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by AI &amp; Stellar Network
            </div>
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl md:text-5xl">
              Smart Contract
              <br />
              <span className="text-zinc-400 dark:text-zinc-500">Security Audit</span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-zinc-500">
              Paste your Solidity, Rust, or Soroban contract below. Our autonomous
              auditor will analyse it for vulnerabilities in seconds.
            </p>
          </section>
        )}

        {/* ----- Input area ----- */}
        {!report && (
          <section className="mx-auto w-full max-w-3xl">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 shadow-2xl shadow-zinc-200/50 dark:shadow-black/20 backdrop-blur">
              {/* Editor header */}
              <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/50 px-5 py-3">
                <FileCode2 className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Contract Source
                </span>
              </div>

              {/* Textarea */}
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={14}
                spellCheck={false}
                placeholder={`// Paste your smart contract code here...\n\npragma solidity ^0.8.0;\n\ncontract Vault {\n    mapping(address => uint256) public balances;\n    ...\n}`}
                className="w-full resize-none bg-transparent px-5 py-4 font-mono text-sm leading-relaxed text-zinc-300 placeholder:text-zinc-700 focus:outline-none"
              />

              {/* Footer with action + dynamic pricing taximeter */}
              <div className="flex flex-col gap-3 border-t border-zinc-800/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <span className="text-xs text-zinc-600">
                    {code.length > 0 ? `${code.split("\n").length} lines` : "Ready"}
                  </span>

                  {/* Dynamic pricing taximeter */}
                  {code.trim().length > 0 && (
                    <div className={`flex items-center gap-2.5 rounded-full border px-3.5 py-1 ${
                      isPriority
                        ? "border-violet-500/30 bg-violet-950/30"
                        : "border-zinc-800/60 bg-zinc-950/40"
                    }`}>
                      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">
                        Est.
                      </span>
                      <span className={`font-mono text-xs tabular-nums tracking-tight ${
                        isPriority ? "text-violet-300" : "text-zinc-300"
                      }`}>
                        {formatPrice(calculatePrice(code, isPriority))}
                      </span>
                      <span className="text-[10px] font-medium tracking-wider text-zinc-600">
                        USDC
                      </span>
                      {isPriority && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400">
                          · VIP
                        </span>
                      )}
                      {isSessionActive && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-indigo-400/70">
                          · session
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex w-full items-center gap-3 sm:w-auto">
                  {/* Feature 9 — Priority Queue toggle */}
                  <button
                    onClick={() => setIsPriority((v) => !v)}
                    className={`group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all ${
                      isPriority
                        ? "border-violet-500/40 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 text-violet-300 shadow-lg shadow-violet-500/10"
                        : "border-zinc-800/60 bg-zinc-900/40 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
                    }`}
                    title={isPriority ? "VIP Lane active — skip the queue" : "Enable Priority Mode (+0.50 USDC)"}
                  >
                    <Zap className={`h-3 w-3 transition-colors ${isPriority ? "text-violet-400" : "text-zinc-600 group-hover:text-zinc-400"}`} />
                    {isPriority ? "⚡ VIP Lane" : "Priority"}
                  </button>

                  <button
                    onClick={handleScan}
                    disabled={loading || !code.trim()}
                    className={`group flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                      isPriority
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-fuchsia-500"
                        : isSessionActive
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500"
                        : "bg-zinc-100 text-zinc-900 hover:bg-white"
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isPriority ? "VIP Analysing…" : "Analysing…"}
                      </>
                    ) : isPriority ? (
                      <>
                        <Zap className="h-4 w-4" />
                        VIP Scan
                      </>
                    ) : isSessionActive ? (
                      <>
                        <Zap className="h-4 w-4" />
                        Pro Scan
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        Scan &amp; Audit
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Payment required notice */}
            {paymentRequired && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-5 py-3.5 text-sm text-amber-300/90">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-400" />
                  <span>
                    <strong className="font-medium">Stellar Payment Required:</strong>{" "}
                    {formatPrice(calculatePrice(code, isPriority))} USDC for this audit.
                  </span>
                </div>
                {!walletAddress && (
                  <button
                    onClick={connectWallet}
                    disabled={!walletReady}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-40"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Connect &amp; Pay
                  </button>
                )}
              </div>
            )}

            {/* Generic error */}
            {error && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-5 py-3.5 text-sm text-red-300/90">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}
          </section>
        )}

        {/* ----- Skeleton while loading ----- */}
        {loading && !report && (
          <section className="mx-auto w-full max-w-4xl animate-fade-up">
            <ReportSkeleton />
          </section>
        )}

        {/* ----- Report ----- */}
        {report && (
          <section className="mx-auto w-full max-w-4xl">
            {/* Report header */}
            <div className="animate-fade-up mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
                Audit Report
              </h2>
              <div className="flex items-center gap-2">
                {/* CSV Export */}
                <button
                  onClick={exportCsv}
                  disabled={!report}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400 transition-all hover:border-violet-300 dark:hover:border-violet-500/30 hover:bg-violet-50 dark:hover:bg-violet-500/5 hover:text-violet-600 dark:hover:text-violet-300 disabled:opacity-40"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Export CSV
                </button>
                {/* New Scan */}
                <button
                  onClick={() => {
                    setReport(null);
                    setCode("");
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 px-4 py-2 text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400 transition-all hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  New Scan
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Proof of Audit — on-chain verification link */}
            {report.auditProofTxHash && (
              <div
                className="animate-fade-up mt-1 mb-6 flex items-center justify-center"
                style={{ animationDelay: "0.03s" }}
              >
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${report.auditProofTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 rounded-full border border-zinc-800/50 bg-zinc-900/40 px-5 py-2 text-[11px] font-medium tracking-wide text-zinc-400 backdrop-blur transition-all hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-sky-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-3.5 w-3.5 text-sky-400/60 transition-colors group-hover:text-sky-400"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <path d="M6.5 10v4M17.5 10v4M10 6.5h4M10 17.5h4" />
                  </svg>
                  <span>
                    Proof of Audit —{" "}
                    <span className="font-mono text-[10px] text-zinc-500 group-hover:text-sky-300/80">
                      {report.auditProofTxHash.slice(0, 8)}…{report.auditProofTxHash.slice(-6)}
                    </span>
                  </span>
                  <ExternalLink className="h-3 w-3 opacity-40 transition-opacity group-hover:opacity-100" />
                </a>
              </div>
            )}

            {/* Score + Risk overview — glassmorphism cards */}
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
              {/* Vulnerability score card */}
              <div
                className="animate-fade-up flex flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-700/30 bg-gradient-to-b from-zinc-900/80 to-zinc-950/60 p-8 shadow-xl shadow-black/20 backdrop-blur-xl"
                style={{ animationDelay: "0.05s" }}
              >
                <ScoreGauge score={report.vulnerabilityScore} riskLevel={report.riskLevel} />
                <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-500">
                  Vulnerability Score
                </span>
              </div>

              {/* Risk level card */}
              <div
                className="animate-fade-up flex flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-700/30 bg-gradient-to-b from-zinc-900/80 to-zinc-950/60 p-8 shadow-xl shadow-black/20 backdrop-blur-xl"
                style={{ animationDelay: "0.1s" }}
              >
                {(() => {
                  const Icon = RISK_ICONS[report.riskLevel];
                  return (
                    <Icon
                      className={`h-12 w-12 ${RISK_COLORS[report.riskLevel].split(" ")[0]} drop-shadow-lg`}
                    />
                  );
                })()}
                <div
                  className={`rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] ${RISK_COLORS[report.riskLevel]}`}
                >
                  {report.riskLevel}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-500">
                  Risk Classification
                </span>
              </div>
            </div>

            {/* Issues list */}
            {report.issues.length > 0 && (
              <div className="mt-10">
                <h3
                  className="animate-fade-up mb-5 flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400"
                  style={{ animationDelay: "0.15s" }}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Issues Identified
                  <span className="ml-1 rounded-full bg-zinc-800/80 px-2.5 py-0.5 font-mono text-[10px] text-zinc-500 ring-1 ring-zinc-700/50">
                    {report.issues.length}
                  </span>
                </h3>

                <div className="flex flex-col gap-4">
                  {report.issues.map((issue, idx) => {
                    const isCritical = issue.severity === "CRITICAL";
                    return (
                      <div
                        key={idx}
                        className={`animate-fade-up rounded-2xl border p-5 transition-all duration-300 ${
                          isCritical
                            ? "animate-critical-glow border-red-500/20 bg-gradient-to-br from-red-950/20 via-zinc-950/60 to-zinc-950/80 hover:border-red-500/30"
                            : "border-zinc-800/40 bg-gradient-to-br from-zinc-900/50 via-zinc-950/40 to-zinc-950/60 hover:border-zinc-700/50"
                        } backdrop-blur-xl`}
                        style={{ animationDelay: `${0.2 + idx * 0.08}s` }}
                      >
                        <div className="flex items-start gap-3.5">
                          <div className={`mt-0.5 rounded-lg p-1.5 ${
                            isCritical
                              ? "bg-red-500/10"
                              : issue.severity === "HIGH"
                              ? "bg-orange-500/10"
                              : issue.severity === "MEDIUM"
                              ? "bg-yellow-500/10"
                              : "bg-emerald-500/10"
                          }`}>
                            <ShieldAlert className={`h-3.5 w-3.5 ${
                              isCritical
                                ? "text-red-400"
                                : issue.severity === "HIGH"
                                ? "text-orange-400"
                                : issue.severity === "MEDIUM"
                                ? "text-yellow-400"
                                : "text-emerald-400"
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Title + severity badge */}
                            <div className="flex items-center gap-2.5">
                              <h4 className="text-sm font-semibold tracking-wide text-zinc-100">
                                {issue.title}
                              </h4>
                              {issue.severity && (
                                <span
                                  className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] ${
                                    isCritical
                                      ? "animate-pulse bg-red-500 text-white shadow-lg shadow-red-500/20"
                                      : issue.severity === "HIGH"
                                      ? "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30"
                                      : issue.severity === "MEDIUM"
                                      ? "bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30"
                                      : "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                                  }`}
                                >
                                  {issue.severity}
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            <p className="mt-2 text-[13px] leading-relaxed tracking-wide text-zinc-400">
                              {issue.description}
                            </p>

                            {/* Suggestion */}
                            <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-zinc-800/30 bg-zinc-800/15 px-4 py-3">
                              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500/60" />
                              <p className="text-xs leading-relaxed tracking-wide text-zinc-400/90">
                                {issue.suggestion}
                              </p>
                            </div>

                            {/* Remediation — IDE-style code block */}
                            {issue.remediation && (() => {
                              const isLocked =
                                (issue.severity === "CRITICAL" || issue.severity === "HIGH") &&
                                !unlockedPatches.has(idx);
                              const isUnlocking = unlockingIdx === idx;

                              return (
                                <div className="group/code mt-3 overflow-hidden rounded-xl border border-zinc-800/40 bg-zinc-950 shadow-inner relative">
                                  {/* Terminal header bar */}
                                  <div className="flex items-center justify-between border-b border-zinc-800/40 bg-zinc-900/40 px-4 py-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700/60" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700/60" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700/60" />
                                      </div>
                                      <div className="flex items-center gap-1.5 ml-2">
                                        <FileCode2 className="h-3 w-3 text-sky-400/70" />
                                        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-sky-400/70">
                                          Suggested Fix
                                        </span>
                                      </div>
                                    </div>
                                    {/* Copy button — only visible when unlocked */}
                                    {!isLocked && (
                                      <button
                                        onClick={async () => {
                                          await navigator.clipboard.writeText(issue.remediation ?? "");
                                          setCopiedIdx(idx);
                                          setTimeout(() => setCopiedIdx(null), 2000);
                                        }}
                                        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[9px] font-medium uppercase tracking-[0.15em] text-zinc-500 opacity-0 transition-all duration-200 hover:bg-zinc-800/60 hover:text-zinc-300 group-hover/code:opacity-100"
                                        title="Copy to clipboard"
                                      >
                                        {copiedIdx === idx ? (
                                          <>
                                            <Check className="h-3 w-3 text-emerald-400" />
                                            <span className="text-emerald-400">Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="h-3 w-3" />
                                            <span>Copy</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                    {/* Locked badge */}
                                    {isLocked && (
                                      <span className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-amber-400/80">
                                        <Lock className="h-3 w-3" />
                                        Premium
                                      </span>
                                    )}
                                  </div>

                                  {/* Code content — clamped height so Unlock is always visible */}
                                  {isLocked ? (
                                    /* Locked state: fixed-height container with overlay */
                                    <div className="relative h-[250px] overflow-hidden">
                                      {/* Blurred code underneath */}
                                      <div className="p-4">
                                        <pre className="select-none blur-[6px] text-[12px] leading-relaxed">
                                          <code className="font-mono text-emerald-300/80">
                                            {issue.remediation}
                                          </code>
                                        </pre>
                                      </div>

                                      {/* Glassmorphism unlock overlay — fixed to the 250px container */}
                                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-xl bg-gradient-to-b from-zinc-950/30 via-zinc-900/50 to-zinc-950/70 backdrop-blur-sm">
                                        <div className="flex flex-col items-center gap-2 py-6">
                                          <div className="rounded-xl border border-amber-500/20 bg-zinc-800/40 p-3 shadow-lg shadow-amber-500/5 backdrop-blur-xl">
                                            <Lock className="h-5 w-5 text-amber-400/80" />
                                          </div>
                                          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                                            Premium Solution
                                          </span>
                                          <button
                                            onClick={() => unlockPatch(idx)}
                                            disabled={isUnlocking}
                                            className={`mt-1 flex items-center gap-2 rounded-lg border px-6 py-2.5 text-xs font-semibold tracking-wide backdrop-blur-xl transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                                              isSessionActive && sessionAllowance >= 1
                                                ? "border-indigo-500/30 bg-gradient-to-r from-indigo-500/15 to-violet-500/15 text-indigo-300 shadow-xl shadow-indigo-500/15 hover:border-indigo-400/50 hover:from-indigo-500/25 hover:to-violet-500/25 hover:text-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/25"
                                                : "border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-300 shadow-xl shadow-amber-500/15 hover:border-amber-400/50 hover:from-amber-500/25 hover:to-orange-500/25 hover:text-amber-200 hover:shadow-2xl hover:shadow-amber-500/25"
                                            }`}
                                          >
                                            {isUnlocking ? (
                                              <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                Unlocking…
                                              </>
                                            ) : isSessionActive && sessionAllowance >= 1 ? (
                                              <>
                                                <Zap className="h-3.5 w-3.5" />
                                                Instant Unlock
                                              </>
                                            ) : (
                                              <>
                                                <Unlock className="h-3.5 w-3.5" />
                                                Unlock Solution — 1 USDC
                                              </>
                                            )}
                                          </button>
                                          {!walletAddress && (
                                            <span className="mt-0.5 text-[10px] text-zinc-600">
                                              Connect wallet to unlock
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Unlocked state: scrollable code */
                                    <div className="max-h-[250px] overflow-y-auto overflow-x-auto p-4">
                                      <pre className="blur-0 text-[12px] leading-relaxed transition-all duration-500">
                                        <code className="font-mono text-emerald-300/80 selection:bg-emerald-500/20">
                                          {issue.remediation}
                                        </code>
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state — no issues */}
            {report.issues.length === 0 && (
              <div
                className="animate-fade-up mt-10 flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/10 bg-gradient-to-b from-emerald-950/10 to-zinc-950/60 p-12 text-center backdrop-blur-xl"
                style={{ animationDelay: "0.15s" }}
              >
                <div className="rounded-2xl bg-emerald-500/10 p-4">
                  <ShieldCheck className="h-10 w-10 text-emerald-400/80" />
                </div>
                <p className="text-sm tracking-wide text-zinc-400">
                  No security issues were identified. Your contract looks clean.
                </p>
              </div>
            )}
          </section>
        )}
      </main>

      {/* --------------------------------------------------------------- */}
      {/* Dev Tools Panel — Feature 10                                    */}
      {/* --------------------------------------------------------------- */}
      {devToolsOpen && (
        <section className="border-t border-emerald-500/10 bg-gradient-to-b from-zinc-950 via-zinc-950/95 to-black">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
                <Terminal className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-emerald-300">
                  Developer Tools
                </h3>
                <p className="text-[11px] tracking-wider text-zinc-500">
                  Integrate Lumina Scan into your AI agents &amp; pipelines
                </p>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              {/* API Endpoint Card */}
              <div className="group rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 backdrop-blur transition-all hover:border-emerald-500/20 hover:bg-emerald-500/[0.02]">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  <Code2 className="h-3.5 w-3.5 text-emerald-500/60" />
                  API Endpoint
                </div>
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-zinc-700/40 bg-black/40 px-3 py-2 font-mono text-[12px] text-emerald-400/90">
                  <span className="truncate select-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}/api/scan
                  </span>
                </div>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/api/scan`;
                    navigator.clipboard.writeText(url);
                    setCopiedEndpoint(true);
                    setTimeout(() => setCopiedEndpoint(false), 2000);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-[11px] font-semibold tracking-wider text-emerald-400 transition-all hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  {copiedEndpoint ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy API Endpoint
                    </>
                  )}
                </button>
              </div>

              {/* OpenClaw Spec Card */}
              <a
                href="/openclaw.json"
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 backdrop-blur transition-all hover:border-emerald-500/20 hover:bg-emerald-500/[0.02]"
              >
                <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  <BookOpen className="h-3.5 w-3.5 text-emerald-500/60" />
                  OpenClaw / API Spec
                </div>
                <p className="mb-2 text-[12px] leading-relaxed text-zinc-400">
                  Full OpenAPI 3.1 definition with tool schemas for LangChain, CrewAI, AutoGen, and OpenAI Functions.
                </p>
                <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400/70 transition-colors group-hover:text-emerald-300">
                  View openclaw.json
                  <ExternalLink className="h-3 w-3" />
                </div>
              </a>

              {/* Python SDK Card */}
              <a
                href="/lumina-sdk-example.py"
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 backdrop-blur transition-all hover:border-emerald-500/20 hover:bg-emerald-500/[0.02]"
              >
                <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  <FileCode2 className="h-3.5 w-3.5 text-emerald-500/60" />
                  Python SDK Example
                </div>
                <p className="mb-2 text-[12px] leading-relaxed text-zinc-400">
                  Minimalist Python script — scan, unlock patches, manage sessions, verify on-chain proofs.
                </p>
                <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400/70 transition-colors group-hover:text-emerald-300">
                  View lumina-sdk-example.py
                  <ExternalLink className="h-3 w-3" />
                </div>
              </a>
            </div>

            {/* Quick pricing reference */}
            <div className="mt-5 rounded-xl border border-zinc-800/30 bg-black/30 p-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                Pricing Formula
              </div>
              <code className="block font-mono text-[12px] leading-relaxed text-emerald-400/70">
                price = max(0.10, min(50.00, 0.10 + characters × 0.005)){" "}
                <span className="text-zinc-600">+</span>{" "}
                <span className="text-violet-400/70">(0.50 if priority)</span>
              </code>
              <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-zinc-600">
                <span>100 chars → <span className="text-emerald-500/60">0.60 USDC</span></span>
                <span>500 chars → <span className="text-emerald-500/60">2.60 USDC</span></span>
                <span>1k chars → <span className="text-emerald-500/60">5.10 USDC</span></span>
                <span>Patch unlock → <span className="text-amber-500/60">1.00 USDC</span></span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* --------------------------------------------------------------- */}
      {/* Audit History Panel — Suggestion 3                              */}
      {/* --------------------------------------------------------------- */}
      {historyOpen && (
        <section className="border-t border-amber-500/10 bg-gradient-to-b from-zinc-950 via-zinc-950/95 to-black">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                  <History className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-wide text-amber-300">
                    Audit History
                  </h3>
                  <p className="text-[11px] tracking-wider text-zinc-500">
                    Recent scans from this session
                  </p>
                </div>
              </div>

              {auditHistory.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportHistory}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500 transition-all hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400"
                  >
                    <Download className="h-3 w-3" />
                    Export JSON
                  </button>
                  <button
                    onClick={() => {
                      clearHistory();
                      setAuditHistory([]);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500 transition-all hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {auditHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800/40 bg-zinc-900/20 py-12 text-center">
                <History className="mb-3 h-8 w-8 text-zinc-700" />
                <p className="text-sm text-zinc-500">No audits yet</p>
                <p className="mt-1 text-[11px] text-zinc-600">
                  Scan a contract to start building your history
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="group flex items-center gap-4 rounded-xl border border-zinc-800/40 bg-zinc-900/20 px-4 py-3 backdrop-blur transition-all hover:border-amber-500/20 hover:bg-amber-500/[0.02]"
                  >
                    {/* Risk dot */}
                    <span
                      className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                        RISK_DOT[entry.riskLevel] ?? "bg-zinc-600"
                      }`}
                    />

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-zinc-200">
                          Score {entry.score}/100
                        </span>
                        <span className="rounded-full border border-zinc-700/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                          {entry.riskLevel}
                        </span>
                        <span className="text-zinc-600">
                          {entry.issueCount} issue{entry.issueCount !== 1 && "s"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-600">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.timestamp).toLocaleTimeString()}
                        {entry.txHash && (
                          <>
                            <span className="text-zinc-700">&middot;</span>
                            <a
                              href={`https://stellar.expert/explorer/testnet/tx/${entry.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-amber-500/70 transition-colors hover:text-amber-400"
                            >
                              {entry.txHash.slice(0, 8)}…
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {/* Restore */}
                      <button
                        onClick={() => {
                          setCode(entry.code);
                          setReport(entry.report);
                          setHistoryOpen(false);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-1 text-[10px] font-medium text-zinc-400 transition-all hover:border-amber-500/30 hover:text-amber-300"
                      >
                        Restore
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => {
                          removeFromHistory(entry.id);
                          setAuditHistory(loadHistory());
                        }}
                        className="rounded-md p-1 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        title="Remove from history"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* --------------------------------------------------------------- */}
      {/* Footer                                                          */}
      {/* --------------------------------------------------------------- */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/40">
        <div className="mx-auto flex h-auto max-w-6xl flex-col items-center gap-3 px-4 py-4 sm:h-14 sm:flex-row sm:justify-between sm:gap-0 sm:px-6 sm:py-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/lumina-icon.svg"
              alt="Lumina Scan"
              className="h-5 w-5 opacity-50 transition-opacity hover:opacity-80"
              draggable={false}
            />
            <span className="text-[11px] tracking-wider text-zinc-600">
              &copy; {new Date().getFullYear()}
            </span>

            {/* Social links */}
            <span className="mx-1 hidden h-3 w-px bg-zinc-300 dark:bg-zinc-800 sm:inline-block" />
            <a
              href="https://x.com/wjmdiary"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter / X"
              className="text-zinc-400 transition-colors hover:text-zinc-200"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://github.com/midasbal/lumina-scan"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-zinc-400 transition-colors hover:text-zinc-200"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {/* Audit History toggle */}
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className={`group flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-medium tracking-wider backdrop-blur transition-all ${
                historyOpen
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/10"
                  : "border-zinc-800/50 bg-zinc-900/40 text-zinc-500 hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400"
              }`}
            >
              <History className="h-3 w-3" />
              History{auditHistory.length > 0 && ` (${auditHistory.length})`}
            </button>

            {/* Dev Tools toggle — Matrix Green accent */}
            <button
              onClick={() => setDevToolsOpen((v) => !v)}
              className={`group flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-medium tracking-wider backdrop-blur transition-all ${
                devToolsOpen
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10"
                  : "border-zinc-800/50 bg-zinc-900/40 text-zinc-500 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400"
              }`}
            >
              <Terminal className="h-3 w-3" />
              Dev Tools
            </button>

            {/* MCP Ready badge — signals AI agent discoverability */}
            <a
              href="/mcp.json"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 rounded-full border border-zinc-800/50 bg-zinc-900/40 px-3 py-1 text-[10px] font-medium tracking-wider text-zinc-500 backdrop-blur transition-all hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-sky-400"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
              </span>
              MCP Ready
            </a>

            <span className="hidden text-[11px] tracking-wider text-zinc-700 sm:block">
              Built on Stellar &middot; Secured by AI
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
