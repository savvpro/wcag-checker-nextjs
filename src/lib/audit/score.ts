import type { AuditIssue, AuditReport, AuditScoreStatus, AuditTab } from "@/lib/audit/types";

const severityPenalty: Record<AuditIssue["severity"], number> = {
  critical: 18,
  serious: 11,
  moderate: 6,
  minor: 3,
  manual: 0,
  none: 0,
};

export function calculateScore(issues: AuditIssue[]): number {
  const penalties = issues
    .filter((issue) => issue.status === "critical")
    .reduce((sum, issue) => sum + severityPenalty[issue.severity] + Math.min(issue.failingElementsCount, 8), 0);

  return Math.max(0, Math.min(100, 100 - penalties));
}

export function resolveStatus(score: number, criticalCount: number): AuditScoreStatus {
  if (criticalCount === 0 && score >= 92) {
    return "No automated issues detected";
  }

  if (criticalCount <= 2 && score >= 75) {
    return "Needs manual review";
  }

  return "Automated accessibility issues detected";
}

export function summarizeReport(status: AuditScoreStatus, counts: Record<AuditTab, number>): string {
  if (status === "No automated issues detected") {
    return "Automated checks passed on this page, but a manual review is still required before you claim WCAG compliance.";
  }

  if (status === "Needs manual review") {
    return `A small number of automated issues were found. Resolve the ${counts.critical} flagged checks, then complete the manual audit set.`;
  }

  return `This page has ${counts.critical} automated failures that need remediation before it is safe to describe the experience as accessible.`;
}

export function createCounts(issues: AuditIssue[]): Record<AuditTab, number> {
  return {
    critical: issues.filter((issue) => issue.status === "critical").length,
    passed: issues.filter((issue) => issue.status === "passed").length,
    manual: issues.filter((issue) => issue.status === "manual").length,
    not_applicable: issues.filter((issue) => issue.status === "not_applicable").length,
  };
}

export function buildScoreSummary(url: string, normalizedUrl: string, pageTitle: string, issues: AuditIssue[]): AuditReport {
  const counts = createCounts(issues);
  const score = calculateScore(issues);
  const status = resolveStatus(score, counts.critical);

  return {
    url,
    normalizedUrl,
    pageTitle,
    scannedAt: new Date().toISOString(),
    score,
    status,
    summary: summarizeReport(status, counts),
    counts,
    issues,
  };
}
