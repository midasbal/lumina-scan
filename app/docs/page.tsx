"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  Zap,
  CreditCard,
  Lock,
  FileCode2,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Layers,
  Globe,
  Cpu,
  Eye,
  Users,
  Code2,
  BadgeCheck,
  Rocket,
  Gem,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Sidebar navigation items
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { id: "mission", label: "Mission", icon: Eye },
  { id: "features", label: "10 Features", icon: Layers },
  { id: "ux", label: "Premium UX", icon: Gem },
  { id: "stack", label: "Tech Stack", icon: Cpu },
  { id: "api", label: "API Reference", icon: Terminal },
  { id: "quickstart", label: "Quick Start", icon: Rocket },
] as const;

// ---------------------------------------------------------------------------
// Feature data
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    number: 1,
    title: "MPP Session (Pay-as-you-go)",
    benefit:
      "Developers deposit USDC once and scan dozens of contracts without per-request wallet signatures — zero friction for batch audits.",
    tech: "In-memory session store with crypto-random tokens. Atomic balance deduction. X-Session-Token header bypasses MPP challenge-response flow.",
    accent: "indigo",
    icon: Zap,
  },
  {
    number: 2,
    title: "Sponsored Onboarding",
    benefit:
      "New users never need to hold XLM. Lumina creates their Stellar account and USDC trustline, fully sponsored — removing every barrier to entry.",
    tech: "3-case detection (no account / no trustline / ready). beginSponsoringFutureReserves + changeTrust + endSponsoring, all fee-bumped by the server keypair.",
    accent: "sky",
    icon: Users,
  },
  {
    number: 3,
    title: "MCP Protocol",
    benefit:
      "Any MCP-compatible AI agent can discover and call Lumina Scan autonomously — no human integration needed.",
    tech: "Static /mcp.json manifest with tool definitions, pricing, and session info. /api/mcp/config endpoint with CORS. <link rel='mcp-manifest'> in HTML head.",
    accent: "sky",
    icon: Globe,
  },
  {
    number: 4,
    title: "Fee Sponsoring (FeeBumpTransaction)",
    benefit:
      "On-chain audit proofs are recorded at zero cost to the user. The server absorbs all Stellar network fees and reserve requirements.",
    tech: "Inner tx (3 ops: beginSponsoring → manageData → endSponsoring) signed by both keypairs, wrapped in FeeBumpTransaction with sponsor as feeSource. SPONSOR_FEE = 10× BASE_FEE.",
    accent: "emerald",
    icon: CreditCard,
  },
  {
    number: 5,
    title: "Dynamic Pricing",
    benefit:
      "Fair pay-per-complexity model. Small contracts cost pennies; enterprise audits scale proportionally up to a $50 cap.",
    tech: "Shared pricing module (lib/pricing.ts) used by both frontend taximeter and backend charge. Formula: max(0.10, min(50, 0.10 + chars × 0.005)).",
    accent: "amber",
    icon: Sparkles,
  },
  {
    number: 6,
    title: "On-Chain Audit Proof",
    benefit:
      "Every scan produces a tamper-proof SHA-256 fingerprint anchored to the Stellar blockchain — verifiable by anyone, forever.",
    tech: "SHA-256 of the full JSON report → Memo.hash (32 bytes). manageData operation stores the hex hash. Viewable on Stellar Expert.",
    accent: "emerald",
    icon: ShieldCheck,
  },
  {
    number: 7,
    title: "AI-Powered Analysis (Llama 3.3)",
    benefit:
      "Enterprise-grade vulnerability detection powered by a 70B parameter model — identifies reentrancy, access control flaws, overflow risks, and more.",
    tech: "Groq API with llama-3.3-70b-versatile. Structured JSON output. Server-side score enforcement: CRITICAL=0-20, HIGH=21-50, MEDIUM=51-75, LOW=76-95.",
    accent: "violet",
    icon: Cpu,
  },
  {
    number: 8,
    title: "Pay-for-Patch",
    benefit:
      "CRITICAL and HIGH severity issues include locked remediation code. Developers pay 1 USDC to unlock production-ready fix — monetising the most valuable insight.",
    tech: "Glassmorphism blur overlay on locked code. /api/unlock-patch endpoint with MPP or session deduction. Fixed 1 USDC pricing.",
    accent: "amber",
    icon: Lock,
  },
  {
    number: 9,
    title: "Priority Queue (VIP Lane)",
    benefit:
      "Skip the 4-second standard queue. Priority scans execute instantly for an extra 0.50 USDC — time is money for professional auditors.",
    tech: "PRIORITY_SURCHARGE = 0.50. Server-side queue delay bypass. Violet/fuchsia gradient UI toggle.",
    accent: "violet",
    icon: Rocket,
  },
  {
    number: 10,
    title: "OpenClaw / LangChain Compatibility",
    benefit:
      "Full OpenAPI 3.1 spec + Python SDK + LangChain tool definitions — Lumina becomes a platform that any AI agent can consume.",
    tech: "openclaw.json with x-tool-definition for each endpoint. lumina-sdk-example.py with MPP handling, session management, and LangChain StructuredTool integration.",
    accent: "emerald",
    icon: Code2,
  },
] as const;

// Accent colour classes by name
const ACCENT_MAP: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  emerald: {
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/5",
  },
  indigo: {
    border: "border-indigo-500/20",
    bg: "bg-indigo-500/5",
    text: "text-indigo-400",
    glow: "shadow-indigo-500/5",
  },
  sky: {
    border: "border-sky-500/20",
    bg: "bg-sky-500/5",
    text: "text-sky-400",
    glow: "shadow-sky-500/5",
  },
  amber: {
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
    text: "text-amber-400",
    glow: "shadow-amber-500/5",
  },
  violet: {
    border: "border-violet-500/20",
    bg: "bg-violet-500/5",
    text: "text-violet-400",
    glow: "shadow-violet-500/5",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("mission");
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Intersection observer for active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    for (const item of NAV_ITEMS) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col font-sans selection:bg-zinc-700">
      {/* ----------------------------------------------------------------- */}
      {/* Top bar                                                           */}
      {/* ----------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <img
              src="/lumina-logo.svg"
              alt="Lumina Scan"
              className="h-8 w-auto opacity-80 transition-opacity group-hover:opacity-100"
              draggable={false}
            />
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-zinc-800/50 bg-zinc-900/60 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">
              Documentation v1.0
            </span>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* Body: Sidebar + Content                                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Sticky sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-zinc-800/40 px-4 py-8 lg:block">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium tracking-wider transition-all ${
                    isActive
                      ? "border border-zinc-700/40 bg-zinc-800/40 text-zinc-200 shadow-lg shadow-black/20"
                      : "text-zinc-500 hover:bg-zinc-900/40 hover:text-zinc-300"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-zinc-600"}`} />
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Sidebar bottom badge */}
          <div className="mt-8 rounded-xl border border-zinc-800/30 bg-zinc-900/30 p-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-500/50" />
              10 Features
            </div>
            <div className="mt-1 text-[10px] text-zinc-700">
              All features implemented &amp; verified
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {/* ============================================================= */}
          {/* Section 1 — Mission                                           */}
          {/* ============================================================= */}
          <section id="mission" className="scroll-mt-20 border-b border-zinc-800/30 px-4 py-12 sm:px-6 sm:py-20 lg:px-16">
            {/* Hero */}
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                <Sparkles className="h-3 w-3" />
                Whitepaper
              </div>
              <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-5xl">
                Securing the Stellar Ecosystem
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  via AI-Powered Trust Layers
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400">
                Lumina Scan is an autonomous Web3 security auditor that combines a 70-billion parameter
                language model with Stellar&apos;s machine payment protocol to deliver instant, verifiable,
                and fairly priced smart contract audits — without human intervention.
              </p>
            </div>

            {/* Stats row */}
            <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { value: "10", label: "Features" },
                { value: "70B", label: "Parameters" },
                { value: "<10s", label: "Audit Time" },
                { value: "$0.10", label: "Starting Price" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-zinc-800/40 bg-zinc-900/30 p-4 text-center backdrop-blur"
                >
                  <div className="text-2xl font-bold tracking-tight text-zinc-100">{stat.value}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Problem / Solution */}
            <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-red-500/10 bg-gradient-to-b from-red-950/10 to-zinc-950/60 p-6 backdrop-blur">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400/70">
                  The Problem
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Traditional smart contract audits cost $5,000–$50,000 and take 2–4 weeks.
                  Most DeFi projects launch unaudited. In 2024 alone, over $1.7 billion was lost
                  to smart contract exploits. The security gap is a human bottleneck.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-500/10 bg-gradient-to-b from-emerald-950/10 to-zinc-950/60 p-6 backdrop-blur">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/70">
                  Our Solution
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Replace the human bottleneck with an AI agent that charges micropayments per scan.
                  Lumina Scan delivers an audit report in under 10 seconds, anchors a tamper-proof
                  SHA-256 hash on-chain, and costs as little as $0.10 — making security accessible
                  to every developer in the Stellar ecosystem.
                </p>
              </div>
            </div>
          </section>

          {/* ============================================================= */}
          {/* Section 2 — 10 Features                                       */}
          {/* ============================================================= */}
          <section id="features" className="scroll-mt-20 border-b border-zinc-800/30 px-4 py-12 sm:px-6 sm:py-20 lg:px-16">
            <div className="mx-auto max-w-4xl">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-500/60">
                Platform Capabilities
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-zinc-100">
                The 10-Feature Roadmap
              </h2>
              <p className="mb-12 max-w-2xl text-sm leading-relaxed text-zinc-500">
                Every feature is implemented, tested, and production-ready. Together they form a
                complete machine-payable security auditing platform.
              </p>

              <div className="flex flex-col gap-5">
                {FEATURES.map((f) => {
                  const colors = ACCENT_MAP[f.accent];
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.number}
                      className={`group rounded-2xl border ${colors.border} ${colors.bg} p-6 shadow-lg ${colors.glow} backdrop-blur transition-all hover:shadow-xl`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Number badge */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colors.border} bg-zinc-900/60 text-base font-bold ${colors.text}`}
                        >
                          {f.number}
                        </div>

                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${colors.text}`} />
                            <h3 className="text-sm font-semibold tracking-wide text-zinc-200">
                              {f.title}
                            </h3>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                                Benefit
                              </div>
                              <p className="text-[12px] leading-relaxed text-zinc-400">
                                {f.benefit}
                              </p>
                            </div>
                            <div>
                              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                                Tech
                              </div>
                              <p className="font-mono text-[11px] leading-relaxed text-zinc-500">
                                {f.tech}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ============================================================= */}
          {/* Section — Premium UX/UI Engineering                            */}
          {/* ============================================================= */}
          <section id="ux" className="scroll-mt-20 border-b border-zinc-800/30 px-4 py-12 sm:px-6 sm:py-20 lg:px-16">
            <div className="mx-auto max-w-4xl">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-violet-500/60">
                Experience
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-zinc-100">
                Premium UX/UI Engineering
              </h2>
              <p className="mb-12 max-w-2xl text-sm leading-relaxed text-zinc-500">
                Six enterprise-grade interface features that elevate Lumina Scan from a
                functional prototype to a product with a premium, &ldquo;Quiet Luxury&rdquo; feel.
              </p>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {[
                  {
                    title: "Skeleton Loading Shimmers",
                    desc: "Custom CSS @keyframes shimmerSweep with an emerald/violet linear-gradient sweep. Replaces generic spinners with a full skeleton matching the report layout — gauge, risk cards, and issue cards — so the UI feels alive during AI analysis.",
                    accent: "emerald",
                  },
                  {
                    title: "Live Animated Balance",
                    desc: "A custom useAnimatedNumber hook using requestAnimationFrame with ease-out cubic easing. The MPP session balance animates smoothly as USDC is spent — making machine payments feel tangible and real.",
                    accent: "indigo",
                  },
                  {
                    title: "Audit History Timeline",
                    desc: "Session-persistent audit history stored in sessionStorage (max 10 entries). Each entry stores the full report, code, and optional on-chain proof. Users can restore past scans, delete entries, export to JSON, or clear all — providing platform-level data portability.",
                    accent: "amber",
                  },
                  {
                    title: "Dark / Light Theme",
                    desc: "Seamless theme switching powered by next-themes with class-based toggling. The light mode uses clean whites, zinc-100 surfaces, and sharp emerald contrasts — equally stunning and legible as the signature Cyber-Noir dark mode.",
                    accent: "sky",
                  },
                  {
                    title: "Professional CSV & JSON Exports",
                    desc: "One-click CSV export generates structured vulnerability data (Severity, Title, Description) with UTF-8 BOM for Excel compatibility. Combined with JSON history export for complete data portability — built for developers who parse, not just read.",
                    accent: "violet",
                  },
                  {
                    title: "Interactive Toast Notifications",
                    desc: "Powered by Sonner, styled with the Quiet Luxury aesthetic. Real-time feedback for wallet connections, scan completion, patch unlocks, and file exports — subtle, non-intrusive, and informative.",
                    accent: "rose",
                  },
                ].map((item) => {
                  const accentMap: Record<string, { border: string; bg: string; text: string }> = {
                    emerald: { border: "border-emerald-500/15", bg: "bg-emerald-500/[0.03]", text: "text-emerald-400" },
                    indigo: { border: "border-indigo-500/15", bg: "bg-indigo-500/[0.03]", text: "text-indigo-400" },
                    amber: { border: "border-amber-500/15", bg: "bg-amber-500/[0.03]", text: "text-amber-400" },
                    sky: { border: "border-sky-500/15", bg: "bg-sky-500/[0.03]", text: "text-sky-400" },
                    violet: { border: "border-violet-500/15", bg: "bg-violet-500/[0.03]", text: "text-violet-400" },
                    rose: { border: "border-rose-500/15", bg: "bg-rose-500/[0.03]", text: "text-rose-400" },
                  };
                  const c = accentMap[item.accent] ?? accentMap.emerald;
                  return (
                    <div
                      key={item.title}
                      className={`rounded-xl border ${c.border} ${c.bg} p-5 backdrop-blur transition-all hover:scale-[1.01]`}
                    >
                      <h3 className={`mb-2 text-sm font-semibold ${c.text}`}>{item.title}</h3>
                      <p className="text-[12px] leading-relaxed text-zinc-500">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ============================================================= */}
          {/* Section 3 — Technical Stack                                    */}
          {/* ============================================================= */}
          <section id="stack" className="scroll-mt-20 border-b border-zinc-800/30 px-4 py-12 sm:px-6 sm:py-20 lg:px-16">
            <div className="mx-auto max-w-4xl">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-500/60">
                Architecture
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-zinc-100">
                Technical Stack
              </h2>
              <p className="mb-12 max-w-2xl text-sm leading-relaxed text-zinc-500">
                A carefully selected stack optimised for speed, security, and developer experience.
              </p>

              <div className="grid gap-5 sm:grid-cols-2">
                {/* AI Engine */}
                <div className="rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-950/10 to-zinc-950/60 p-6 backdrop-blur">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-2.5">
                      <Cpu className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-200">AI Engine</h3>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">
                        Vulnerability Detection
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      ["Model", "Llama 3.3 70B Versatile"],
                      ["Provider", "Groq (ultra-low latency)"],
                      ["Output", "Structured JSON with scoring"],
                      ["Scoring", "Server-side severity enforcement"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[12px]">
                        <span className="text-zinc-600">{k}</span>
                        <span className="font-mono text-zinc-400">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Blockchain Layer */}
                <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-950/10 to-zinc-950/60 p-6 backdrop-blur">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                      <Globe className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-200">Blockchain Layer</h3>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">
                        Stellar Network
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      ["SDK", "@stellar/stellar-sdk v14.6.1"],
                      ["Network", "Stellar Testnet (Horizon)"],
                      ["Asset", "USDC (SAC Testnet)"],
                      ["Proof", "SHA-256 → Memo.hash"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[12px]">
                        <span className="text-zinc-600">{k}</span>
                        <span className="font-mono text-zinc-400">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Protocol */}
                <div className="rounded-2xl border border-sky-500/15 bg-gradient-to-br from-sky-950/10 to-zinc-950/60 p-6 backdrop-blur">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-2.5">
                      <CreditCard className="h-5 w-5 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-200">Payment Protocol</h3>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">
                        Machine-Payable
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      ["Protocol", "MPP (mppx v0.4.12)"],
                      ["Server", "@stellar/mpp v0.4.0"],
                      ["Flow", "402 → Payment → Retry"],
                      ["Sponsoring", "FeeBumpTransaction"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[12px]">
                        <span className="text-zinc-600">{k}</span>
                        <span className="font-mono text-zinc-400">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Frontend */}
                <div className="rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-950/10 to-zinc-950/60 p-6 backdrop-blur">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
                      <Layers className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-200">Frontend</h3>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">
                        Application Layer
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      ["Framework", "Next.js 16 (App Router)"],
                      ["UI", "React 19 + Tailwind CSS 4"],
                      ["Wallet", "StellarWalletsKit + Freighter"],
                      ["Design", "Quiet Luxury / Cyber-Noir"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[12px]">
                        <span className="text-zinc-600">{k}</span>
                        <span className="font-mono text-zinc-400">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Architecture flow */}
              <div className="mt-10 rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-6 backdrop-blur">
                <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-600">
                  Request Flow
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 text-[12px]">
                  {[
                    { label: "Developer", color: "text-zinc-300" },
                    { label: "→" , color: "text-zinc-700" },
                    { label: "POST /api/scan", color: "text-emerald-400 font-mono" },
                    { label: "→" , color: "text-zinc-700" },
                    { label: "MPP 402 Challenge", color: "text-sky-400" },
                    { label: "→" , color: "text-zinc-700" },
                    { label: "USDC Payment", color: "text-amber-400" },
                    { label: "→" , color: "text-zinc-700" },
                    { label: "Llama 3.3 Analysis", color: "text-violet-400" },
                    { label: "→" , color: "text-zinc-700" },
                    { label: "Stellar Proof", color: "text-emerald-400" },
                    { label: "→" , color: "text-zinc-700" },
                    { label: "JSON Report", color: "text-zinc-300" },
                  ].map((step, i) => (
                    <span key={i} className={step.color}>
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================= */}
          {/* Section 4 — API Reference                                     */}
          {/* ============================================================= */}
          <section id="api" className="scroll-mt-20 border-b border-zinc-800/30 px-4 py-12 sm:px-6 sm:py-20 lg:px-16">
            <div className="mx-auto max-w-4xl">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-500/60">
                Integration
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-zinc-100">
                API Reference
              </h2>
              <p className="mb-12 max-w-2xl text-sm leading-relaxed text-zinc-500">
                Integrate Lumina Scan into your CI/CD pipeline, AI agent, or development workflow.
              </p>

              {/* Endpoint cards */}
              <div className="space-y-4">
                {/* Scan endpoint */}
                <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-6 backdrop-blur">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-400">
                        POST
                      </span>
                      <code className="font-mono text-sm text-zinc-300">/api/scan</code>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${typeof window !== "undefined" ? window.location.origin : ""}/api/scan`,
                          setCopiedEndpoint
                        )
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-800/50 bg-zinc-900/40 px-3 py-1.5 text-[10px] font-medium text-zinc-500 transition-all hover:border-emerald-500/30 hover:text-emerald-400"
                    >
                      {copiedEndpoint ? (
                        <>
                          <Check className="h-3 w-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy URL
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mb-4 text-[12px] leading-relaxed text-zinc-500">
                    Submit smart contract source code for AI-powered security analysis. Returns a structured
                    report with vulnerability score, risk level, issues, and on-chain audit proof.
                  </p>

                  {/* Request body */}
                  <div className="rounded-xl border border-zinc-800/30 bg-black/30 p-4">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                      Request Body
                    </div>
                    <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-zinc-400">
{`{
  "code": "pragma solidity ^0.8.0; ...",
  "priority": false  // +0.50 USDC for VIP lane
}`}
                    </pre>
                  </div>

                  {/* Headers */}
                  <div className="mt-4 rounded-xl border border-zinc-800/30 bg-black/30 p-4">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                      Optional Headers
                    </div>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="flex gap-3">
                        <span className="text-indigo-400">X-Session-Token</span>
                        <span className="text-zinc-600">— Pre-authorized session token (bypasses MPP)</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="mt-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] p-4">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-500/60">
                      Dynamic Pricing
                    </div>
                    <code className="block font-mono text-[12px] text-emerald-400/70">
                      price = max(0.10, min(50.00, 0.10 + chars × 0.005)) + (0.50 if priority)
                    </code>
                  </div>
                </div>

                {/* Unlock Patch endpoint */}
                <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-6 backdrop-blur">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="rounded-md bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-400">
                      POST
                    </span>
                    <code className="font-mono text-sm text-zinc-300">/api/unlock-patch</code>
                  </div>
                  <p className="mb-3 text-[12px] leading-relaxed text-zinc-500">
                    Unlock premium remediation code for a CRITICAL or HIGH severity issue. Fixed price: 1 USDC.
                  </p>
                  <div className="rounded-xl border border-zinc-800/30 bg-black/30 p-4">
                    <pre className="font-mono text-[11px] leading-relaxed text-zinc-400">
{`{ "issueIndex": 0 }  // zero-based index`}
                    </pre>
                  </div>
                </div>

                {/* Session endpoint */}
                <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-6 backdrop-blur">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-indigo-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-indigo-400">
                      POST
                    </span>
                    <span className="rounded-md bg-sky-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-sky-400">
                      GET
                    </span>
                    <span className="rounded-md bg-red-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-red-400">
                      DELETE
                    </span>
                    <code className="font-mono text-sm text-zinc-300">/api/session</code>
                  </div>
                  <p className="mb-3 text-[12px] leading-relaxed text-zinc-500">
                    Create, check, or destroy a pay-as-you-go session. Deposit tiers: 5, 10, 25, 50 USDC.
                    Use the returned token in <code className="text-indigo-400">X-Session-Token</code> header
                    for frictionless subsequent requests.
                  </p>
                  <div className="rounded-xl border border-zinc-800/30 bg-black/30 p-4">
                    <pre className="font-mono text-[11px] leading-relaxed text-zinc-400">
{`// POST — Create session
{ "depositAmount": 10, "walletAddress": "GABC..." }`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* OpenClaw + Python SDK links */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <a
                  href="/openclaw.json"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-5 backdrop-blur transition-all hover:border-emerald-500/30 hover:bg-emerald-500/[0.06]"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-zinc-200">openclaw.json</span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-zinc-500">
                    Full OpenAPI 3.1 spec with x-tool-definition for LangChain, CrewAI, AutoGen, and OpenAI
                    Functions compatibility.
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-emerald-400/70 transition-colors group-hover:text-emerald-300">
                    View specification <ExternalLink className="h-3 w-3" />
                  </div>
                </a>

                <a
                  href="/lumina-sdk-example.py"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl border border-indigo-500/15 bg-indigo-500/[0.03] p-5 backdrop-blur transition-all hover:border-indigo-500/30 hover:bg-indigo-500/[0.06]"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <FileCode2 className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm font-semibold text-zinc-200">lumina-sdk-example.py</span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-zinc-500">
                    Ready-to-run Python script with scan, unlock, session management, proof verification, and
                    LangChain StructuredTool integration.
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-indigo-400/70 transition-colors group-hover:text-indigo-300">
                    View script <ExternalLink className="h-3 w-3" />
                  </div>
                </a>
              </div>

              {/* cURL example */}
              <div className="mt-8 rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-6 backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-600">
                    Quick Test — cURL
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `curl -X POST ${typeof window !== "undefined" ? window.location.origin : "https://lumina-scan.vercel.app"}/api/scan \\
  -H "Content-Type: application/json" \\
  -d '{"code": "pragma solidity ^0.8.0; contract Test { function hello() public pure returns (string memory) { return \\"hi\\"; } }"}'`,
                        setCopiedCurl
                      )
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-800/50 bg-zinc-900/40 px-3 py-1.5 text-[10px] font-medium text-zinc-500 transition-all hover:border-emerald-500/30 hover:text-emerald-400"
                  >
                    {copiedCurl ? (
                      <>
                        <Check className="h-3 w-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-xl border border-zinc-800/30 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-emerald-400/80">
{`curl -X POST https://lumina-scan.vercel.app/api/scan \\
  -H "Content-Type: application/json" \\
  -d '{"code": "pragma solidity ^0.8.0; ..."}'

# 402 → Complete MPP payment → Retry
# 200 → { vulnerabilityScore, riskLevel, issues, auditProofTxHash }`}
                </pre>
              </div>
            </div>
          </section>

          {/* ============================================================= */}
          {/* Section 5 — Quick Start                                       */}
          {/* ============================================================= */}
          <section id="quickstart" className="scroll-mt-20 px-4 py-12 sm:px-6 sm:py-20 lg:px-16">
            <div className="mx-auto max-w-4xl">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-violet-500/60">
                Get Started
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-zinc-100">
                Quick Start Guide
              </h2>
              <p className="mb-12 max-w-2xl text-sm leading-relaxed text-zinc-500">
                From zero to your first audit in 5 steps.
              </p>

              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: "Connect Wallet",
                    desc: "Connect via Freighter. We'll sponsor your account creation and USDC trustline — zero XLM needed.",
                    accent: "sky",
                  },
                  {
                    step: 2,
                    title: "(Optional) Start a Session",
                    desc: 'Deposit 5-50 USDC for batch scanning. Click "Go Pro" in the header for frictionless pay-as-you-go.',
                    accent: "indigo",
                  },
                  {
                    step: 3,
                    title: "Paste Your Contract",
                    desc: "Paste Solidity, Soroban Rust, Move, or any smart contract code into the editor.",
                    accent: "emerald",
                  },
                  {
                    step: 4,
                    title: "Scan & Pay",
                    desc: "Hit Scan. The dynamic price is shown in the taximeter. Approve the USDC micropayment (or it's auto-deducted from your session).",
                    accent: "amber",
                  },
                  {
                    step: 5,
                    title: "Review & Verify",
                    desc: "Read your audit report. Unlock patches for critical issues. Verify the on-chain proof on Stellar Expert.",
                    accent: "violet",
                  },
                ].map((s) => {
                  const colors = ACCENT_MAP[s.accent];
                  return (
                    <div
                      key={s.step}
                      className={`flex items-start gap-4 rounded-xl border ${colors.border} ${colors.bg} p-5 backdrop-blur`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${colors.border} bg-zinc-900/60 font-mono text-sm font-bold ${colors.text}`}
                      >
                        {s.step}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-200">{s.title}</h3>
                        <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* For Agents section */}
              <div className="mt-12 rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-950/10 to-zinc-950/60 p-6 backdrop-blur">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                    <Cpu className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">For AI Agents</h3>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">
                      Autonomous Integration
                    </p>
                  </div>
                </div>
                <div className="space-y-3 text-[12px] leading-relaxed text-zinc-400">
                  <p>
                    Lumina Scan is designed to be consumed by AI agents without human intervention:
                  </p>
                  <ul className="ml-4 space-y-2 text-zinc-500">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/50" />
                      <span>
                        <strong className="text-zinc-400">MCP Discovery:</strong> Agents find us via{" "}
                        <code className="text-emerald-400/70">&lt;link rel=&quot;mcp-manifest&quot;&gt;</code> or{" "}
                        <code className="text-emerald-400/70">/mcp.json</code>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/50" />
                      <span>
                        <strong className="text-zinc-400">OpenClaw Spec:</strong>{" "}
                        <code className="text-emerald-400/70">/openclaw.json</code> provides full OpenAPI 3.1 + tool definitions
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/50" />
                      <span>
                        <strong className="text-zinc-400">Payment:</strong> MPP 402 challenge-response — agents pay in
                        USDC on Stellar, no API keys needed
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/50" />
                      <span>
                        <strong className="text-zinc-400">Sessions:</strong> Batch-mode via X-Session-Token for high-throughput agent workflows
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================= */}
          {/* Footer                                                        */}
          {/* ============================================================= */}
          <footer className="border-t border-zinc-800/30 px-4 py-8 sm:px-6 lg:px-16">
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-2.5">
                <img
                  src="/lumina-icon.svg"
                  alt="Lumina Scan"
                  className="h-5 w-5 opacity-50"
                  draggable={false}
                />
              </div>
              <p className="max-w-lg text-[12px] leading-relaxed text-zinc-700">
                Built for the Stellar Community Fund Hackathon. 10 core features + 6 premium UX features.
                Machine-payable security for the autonomous future.
              </p>
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-zinc-700">
                <a href="/" className="transition-colors hover:text-zinc-400">
                  Scanner
                </a>
                <span className="text-zinc-800">·</span>
                <a href="/mcp.json" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-zinc-400">
                  MCP
                </a>
                <span className="text-zinc-800">·</span>
                <a href="/openclaw.json" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-zinc-400">
                  OpenClaw
                </a>
                <span className="text-zinc-800">·</span>
                <span>© {new Date().getFullYear()}</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
