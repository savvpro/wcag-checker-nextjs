export type AuditTab = "critical" | "passed" | "manual" | "not_applicable";

export type AuditScoreStatus =
  | "No automated issues detected"
  | "Needs manual review"
  | "Automated accessibility issues detected";

export type AuditIssueStatus = "critical" | "passed" | "manual" | "not_applicable";

export type AuditIssue = {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  status: AuditIssueStatus;
  severity: "critical" | "serious" | "moderate" | "minor" | "manual" | "none";
  impactLabel: string;
  failingElementsCount: number;
  disabilitiesAffected: string[];
  wcagCriteria: string[];
  fixRecommendation: string;
  helpUrl?: string;
  selectors: string[];
};

export type AuditReport = {
  url: string;
  normalizedUrl: string;
  pageTitle: string;
  screenshotDataUrl?: string;
  scannedAt: string;
  score: number;
  status: AuditScoreStatus;
  summary: string;
  aiSummary?: string;
  counts: Record<AuditTab, number>;
  issues: AuditIssue[];
};
