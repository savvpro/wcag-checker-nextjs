import OpenAI from "openai";

import type { AuditReport } from "@/lib/audit/types";

export async function buildAiSummary(report: AuditReport): Promise<string | undefined> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return undefined;
  }

  try {
    const client = new OpenAI({ apiKey });
    const criticalIssues = report.issues
      .filter((issue) => issue.status === "critical")
      .slice(0, 8)
      .map((issue) => ({
        title: issue.title,
        count: issue.failingElementsCount,
        criteria: issue.wcagCriteria,
        fix: issue.fixRecommendation,
      }));

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You summarize automated accessibility audit findings. Do not claim legal compliance. Keep the result under 120 words.",
        },
        {
          role: "user",
          content: JSON.stringify({
            url: report.normalizedUrl,
            score: report.score,
            status: report.status,
            criticalIssues,
          }),
        },
      ],
    });

    return response.output_text || undefined;
  } catch {
    return undefined;
  }
}
