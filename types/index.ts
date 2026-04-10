/**
 * Represents a single security issue found during code analysis.
 */
export interface ScanIssue {
  title: string;
  description: string;
  severity?: string;
  suggestion: string;
  remediation?: string;
}

/**
 * The structured report returned by the AI security auditor.
 */
export interface ScanReport {
  /** Overall vulnerability score from 0 (safe) to 100 (critical). */
  vulnerabilityScore: number;
  /** Categorical risk classification. */
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  /** List of individual security issues identified in the code. */
  issues: ScanIssue[];
  /** Stellar transaction hash of the on-chain audit proof (memo hash). */
  auditProofTxHash?: string;
}
