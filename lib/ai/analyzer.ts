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
    return parseReport(responseText);
  } catch (err) {
    console.error("[analyzeCode] Fetch failed:", err);
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
    const clampedScore = clampScoreBySeverity(rawScore, highestSeverity, issues.length);

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
 */
function clampScoreBySeverity(
  score: number,
  severity: ScanReport["riskLevel"],
  issueCount: number
): number {
  if (issueCount === 0) return Math.max(96, Math.min(100, score));

  switch (severity) {
    case "CRITICAL":
      return Math.max(0, Math.min(20, score));
    case "HIGH":
      return Math.max(21, Math.min(50, score));
    case "MEDIUM":
      return Math.max(51, Math.min(75, score));
    case "LOW":
      return Math.max(76, Math.min(95, score));
    default:
      return score;
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
