import type { AuditIssue } from "@/lib/audit/types";

export const auditUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 WCAGAuditWorkbench/1.0";

export function normalizeUrl(rawUrl: string): string {
  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const parsed = new URL(withProtocol);
  parsed.hash = "";
  return parsed.toString();
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function collectSelectors(elements: string[]): string[] {
  return elements.slice(0, 8);
}

export function createIssue({
  id,
  source,
  title,
  description,
  status,
  severity,
  failingElementsCount,
  disabilitiesAffected,
  wcagCriteria,
  fixRecommendation,
  selectors = [],
  helpUrl,
}: {
  id: string;
  source: AuditIssue["source"];
  title: string;
  description: string;
  status: AuditIssue["status"];
  severity: AuditIssue["severity"];
  failingElementsCount: number;
  disabilitiesAffected: string[];
  wcagCriteria: string[];
  fixRecommendation: string;
  selectors?: string[];
  helpUrl?: string;
}): AuditIssue {
  return {
    id,
    ruleId: id,
    source,
    title,
    description,
    status,
    severity,
    impactLabel: severity === "none" ? "Passed" : severity === "manual" ? "Manual review" : severity,
    failingElementsCount,
    disabilitiesAffected,
    wcagCriteria,
    fixRecommendation,
    selectors,
    helpUrl,
  };
}

export async function fetchHtml(normalizedUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        "user-agent": auditUserAgent,
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Received HTTP ${response.status} from the target site.`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("The target URL did not return an HTML document.");
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
