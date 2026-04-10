import type { ScanReport } from "@/types";

// ---------------------------------------------------------------------------
// Groq API — fast, free, OpenAI-compatible inference.
// ---------------------------------------------------------------------------
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

// System prompt for the AI auditor
const SYSTEM_PROMPT =
  "You are an elite Web3 Security Auditor. Analyze the provided code for security flaws " +
  "(reentrancy, overflow, access control, front-running, unchecked external calls, etc.). " +
  "Return ONLY a valid JSON object with this exact structure:\n" +
  "{\n" +
  '  "vulnerabilityScore": <number 0-100>,\n' +
  '  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",\n' +
  '  "issues": [\n' +
  "    {\n" +
  '      "title": "<short title>",\n' +
  '      "description": "<detailed explanation>",\n' +
  '      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",\n' +
  '      "suggestion": "<how to fix>",\n' +
  '      "remediation": "<code-level fix recommendation>"\n' +
  "    }\n" +
  "  ]\n" +
  "}\n\n" +
  "STRICT SCORING RULES (you MUST follow these):\n" +
  "- vulnerabilityScore represents SAFETY, not danger. 100 = perfectly safe, 0 = extremely dangerous.\n" +
  "- If there is at least one CRITICAL severity issue, vulnerabilityScore MUST be between 0 and 20.\n" +
  "- If the highest severity is HIGH (no CRITICAL), vulnerabilityScore MUST be between 21 and 50.\n" +
  "- If the highest severity is MEDIUM (no HIGH or CRITICAL), vulnerabilityScore MUST be between 51 and 75.\n" +
  "- If there are only LOW severity issues, vulnerabilityScore MUST be between 76 and 95.\n" +
  "- Only a perfectly clean contract with ZERO issues should get a score of 96-100.\n" +
  "- The riskLevel field MUST match the highest severity found among all issues.\n" +
  "  For example, if issues contain one CRITICAL and two LOW, riskLevel must be CRITICAL.\n" +
  "  If there are no issues, riskLevel must be LOW and score must be 96-100.\n\n" +
  "Do not include markdown formatting, backticks, or any text outside the JSON object.";

/**
 * Default fallback report when the AI service is unreachable.
 */
const FALLBACK_REPORT: ScanReport = {
  vulnerabilityScore: 0,
  riskLevel: "LOW",
  issues: [
    {
      title: "Analysis Unavailable",
      description:
        "The AI auditor could not reach the Groq API. This may be due to a service outage or an invalid API key.",
      suggestion:
        "Please try again later or verify the GROQ_API_KEY configuration.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Technical error sanitizer — turns raw runtime/chain errors into
// professional security findings instead of exposing internal details.
// ---------------------------------------------------------------------------
const TECHNICAL_ERROR_PATTERNS = [
  /HostError/i,
  /Panic/i,
  /Error\(Contract,?\s*#?\d+\)/i,
  /balance\s+not\s+in\s+range/i,
  /runtime\s+error/i,
  /out\s+of\s+bounds/i,
  /stack\s+overflow/i,
  /integer\s+overflow/i,
  /underflow/i,
  /assertion\s+failed/i,
  /unreachable\s+executed/i,
  /wasm\s+trap/i,
];

/**
 * Check whether a string contains raw technical error output.
 */
function containsTechnicalError(text: string): boolean {
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Sanitize a ScanReport: if any issue title or description contains raw
 * technical errors, replace them with a professionally-written finding.
 * Also injects a synthetic issue if the entire report text looks like a crash.
 */
function sanitizeReport(report: ScanReport): ScanReport {
  const sanitizedIssues = report.issues.map((issue) => {
    const raw = `${issue.title} ${issue.description ?? ""} ${issue.suggestion ?? ""}`;
    if (containsTechnicalError(raw)) {
      return {
        title: "Critical Runtime Logic Failure (DoS Potential)",
        severity: "CRITICAL" as string,
        description:
          "The contract logic contains a state-transition violation or a resource boundary error " +
          "that causes a runtime panic. This is a severe vulnerability that can lead to permanent " +
          "Denial of Service (DoS) or locked assets.",
        suggestion:
          "Add explicit bounds checks, validate all arithmetic operations, and implement graceful " +
          "error handling to prevent runtime panics.",
        remediation: issue.remediation,
      };
    }
    return issue;
  });

  return { ...report, issues: sanitizedIssues };
}

// ---------------------------------------------------------------------------
// Core public API
// ---------------------------------------------------------------------------

/**
 * Analyze the provided source code for security vulnerabilities
 * using Groq Llama-3.3 70B.
 *
 * @param code - The raw source code string to audit.
 * @returns A structured ScanReport with vulnerability score, risk level, and individual issues.
 */
export async function analyzeCode(code: string): Promise<ScanReport> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[analyzeCode] GROQ_API_KEY is not configured");
    return FALLBACK_REPORT;
  }

  console.log("[analyzeCode] Calling Groq Llama 3.3...");

  const payload = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Analyze the following code for security vulnerabilities:\n\n${code}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 4096,
  };

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      console.error(
        `[analyzeCode] Groq API error: ${res.status} ${res.statusText}`,
        errorBody
      );
      return FALLBACK_REPORT;
    }

    const data = await res.json();
    const responseText = data?.choices?.[0]?.message?.content ?? "";

    if (!responseText) {
      console.warn("[analyzeCode] Groq returned empty content.");
      return FALLBACK_REPORT;
    }

    console.log("[analyzeCode] Success — received response from Groq Llama 3.3");

    // Sanitize any raw technical errors before returning
    const report = parseReport(responseText);
    return sanitizeReport(report);
  } catch (err) {
    console.error("[analyzeCode] Fetch failed:", err);

    // If the error message itself is a technical crash, return a professional finding
    const errMsg = String((err as Error)?.message ?? err);
    if (containsTechnicalError(errMsg)) {
      return sanitizeReport({
        vulnerabilityScore: 5,
        riskLevel: "CRITICAL",
        issues: [
          {
            title: errMsg,
            description: errMsg,
            suggestion: "Investigate the runtime failure.",
          },
        ],
      });
    }

    return FALLBACK_REPORT;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse the raw Groq/Llama text into a validated ScanReport.
 * Enforces strict scoring rules server-side regardless of AI output.
 */
function parseReport(raw: string): ScanReport {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as ScanReport;

    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.map(normalizeIssue)
      : [];

    // Determine the highest severity from all issues
    const highestSeverity = deriveHighestSeverity(issues);

    // Enforce scoring rules based on highest severity
    const rawScore = Math.max(0, Math.min(100, Number(parsed.vulnerabilityScore) || 0));
    const clampedScore = clampScoreBySeverity(rawScore, highestSeverity, issues.length, issues);

    return {
      vulnerabilityScore: clampedScore,
      riskLevel: highestSeverity,
      issues,
    };
  } catch (err) {
    console.error("[analyzeCode] Failed to parse Groq response:", err, raw);
    return FALLBACK_REPORT;
  }
}

/**
 * Derive the highest severity level from the issues array.
 */
const SEVERITY_ORDER: ScanReport["riskLevel"][] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function deriveHighestSeverity(
  issues: ScanReport["issues"]
): ScanReport["riskLevel"] {
  if (issues.length === 0) return "LOW";

  let highest = 0;
  for (const issue of issues) {
    const sev = (issue.severity ?? "LOW").toUpperCase() as ScanReport["riskLevel"];
    const idx = SEVERITY_ORDER.indexOf(sev);
    if (idx > highest) highest = idx;
  }
  return SEVERITY_ORDER[highest];
}

/**
 * Clamp the vulnerability score into the correct range based on severity.
 * Score = safety metric: 100 = safe, 0 = critical.
 *
 * Uses a weighted deduction model:
 *   CRITICAL → -40 to -50 pts   |  HIGH → -20 to -25 pts
 *   MEDIUM   → -10 to -15 pts   |  LOW  → -5 pts
 *
 * The final score is the maximum of 0 and the deducted value, then clamped
 * into the severity-appropriate range for visual consistency.
 */
function clampScoreBySeverity(
  _score: number,
  severity: ScanReport["riskLevel"],
  issueCount: number,
  issues: ScanReport["issues"]
): number {
  if (issueCount === 0) return 100;

  // --- Weighted deduction from a perfect 100 ---
  const DEDUCTIONS: Record<string, [number, number]> = {
    CRITICAL: [40, 50],
    HIGH: [20, 25],
    MEDIUM: [10, 15],
    LOW: [5, 5],
  };

  let totalDeduction = 0;
  for (const issue of issues) {
    const sev = (issue.severity ?? "LOW").toUpperCase();
    const [min, max] = DEDUCTIONS[sev] ?? [5, 5];
    // Deterministic midpoint to keep scoring stable across re-runs
    totalDeduction += Math.round((min + max) / 2);
  }

  const weightedScore = Math.max(0, Math.min(100, 100 - totalDeduction));

  // Ensure the final score stays within the severity-appropriate band
  switch (severity) {
    case "CRITICAL":
      return Math.max(0, Math.min(20, weightedScore));
    case "HIGH":
      return Math.max(21, Math.min(50, weightedScore));
    case "MEDIUM":
      return Math.max(51, Math.min(75, weightedScore));
    case "LOW":
      return Math.max(76, Math.min(95, weightedScore));
    default:
      return weightedScore;
  }
}

/**
 * Normalize a single issue entry to ensure all required fields are present.
 */
function normalizeIssue(issue: unknown): ScanReport["issues"][number] {
  const obj = issue as Record<string, unknown>;
  return {
    title: typeof obj?.title === "string" ? obj.title : "Unknown Issue",
    description:
      typeof obj?.description === "string"
        ? obj.description
        : "No description provided.",
    severity:
      typeof obj?.severity === "string" ? obj.severity : undefined,
    suggestion:
      typeof obj?.suggestion === "string"
        ? obj.suggestion
        : "Review the code manually.",
    remediation:
      typeof obj?.remediation === "string" ? obj.remediation : undefined,
  };
}
