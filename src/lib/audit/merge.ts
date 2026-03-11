import type { AuditIssue } from "@/lib/audit/types";

const severityRank: Record<AuditIssue["severity"], number> = {
  none: 0,
  minor: 1,
  moderate: 2,
  serious: 3,
  critical: 4,
  manual: 0,
};

const statusRank: Record<AuditIssue["status"], number> = {
  passed: 0,
  not_applicable: 1,
  manual: 2,
  critical: 3,
};

function mergeArrays(left: string[], right: string[]): string[] {
  return Array.from(new Set([...left, ...right]));
}

function pickPreferredIssue(current: AuditIssue, incoming: AuditIssue): AuditIssue {
  if (statusRank[incoming.status] > statusRank[current.status]) {
    return incoming;
  }

  if (statusRank[incoming.status] < statusRank[current.status]) {
    return current;
  }

  if (severityRank[incoming.severity] > severityRank[current.severity]) {
    return incoming;
  }

  return current;
}

export function mergeIssues(issueGroups: AuditIssue[][]): AuditIssue[] {
  const merged = new Map<string, AuditIssue>();

  for (const issues of issueGroups) {
    for (const issue of issues) {
      const key = `${issue.ruleId}:${issue.status === "manual" ? issue.id : issue.ruleId}`;
      const existing = merged.get(key);

      if (!existing) {
        merged.set(key, issue);
        continue;
      }

      const preferred = pickPreferredIssue(existing, issue);
      merged.set(key, {
        ...preferred,
        source: preferred.source === existing.source ? preferred.source : preferred.source,
        failingElementsCount: Math.max(existing.failingElementsCount, issue.failingElementsCount),
        disabilitiesAffected: mergeArrays(existing.disabilitiesAffected, issue.disabilitiesAffected),
        wcagCriteria: mergeArrays(existing.wcagCriteria, issue.wcagCriteria),
        selectors: mergeArrays(existing.selectors, issue.selectors).slice(0, 8),
        helpUrl: preferred.helpUrl ?? existing.helpUrl ?? issue.helpUrl,
      });
    }
  }

  return Array.from(merged.values()).sort((left, right) => {
    const statusDelta = statusRank[right.status] - statusRank[left.status];
    if (statusDelta !== 0) {
      return statusDelta;
    }

    const severityDelta = severityRank[right.severity] - severityRank[left.severity];
    if (severityDelta !== 0) {
      return severityDelta;
    }

    return left.title.localeCompare(right.title);
  });
}
