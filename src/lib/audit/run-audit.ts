import { z } from "zod";

import { buildAiSummary } from "@/lib/audit/ai-summary";
import { runHtmlChecks } from "@/lib/audit/html-checks";
import { fetchHtml, normalizeUrl } from "@/lib/audit/helpers";
import { mergeIssues } from "@/lib/audit/merge";
import { runRenderedChecks } from "@/lib/audit/rendered-checks";
import { buildScoreSummary } from "@/lib/audit/score";
import { captureScreenshot } from "@/lib/audit/screenshot";
import type { AuditReport } from "@/lib/audit/types";

const inputSchema = z.object({
  url: z.string().trim().url(),
});

export async function runAudit(rawUrl: string): Promise<AuditReport> {
  const parsedInput = inputSchema.safeParse({
    url: /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`,
  });

  if (!parsedInput.success) {
    throw new Error("Enter a valid website URL.");
  }

  const normalizedUrl = normalizeUrl(parsedInput.data.url);

  try {
    const html = await fetchHtml(normalizedUrl);
    const { pageTitle, issues: htmlIssues } = runHtmlChecks(html, normalizedUrl);
    const [renderedIssues, screenshotDataUrl] = await Promise.all([
      runRenderedChecks(normalizedUrl),
      captureScreenshot(normalizedUrl),
    ]);
    const report = buildScoreSummary(rawUrl, normalizedUrl, pageTitle, mergeIssues([htmlIssues, renderedIssues]));
    const aiSummary = await buildAiSummary(report);

    return {
      ...report,
      ...(screenshotDataUrl ? { screenshotDataUrl } : {}),
      ...(aiSummary ? { aiSummary } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The scan failed unexpectedly.";
    throw new Error(`Scan failed for ${normalizedUrl}: ${message}`);
  }
}
