import { NextResponse } from "next/server";
import { z } from "zod";

import { runAudit } from "@/lib/audit/run-audit";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  url: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a website URL." }, { status: 400 });
    }

    const report = await runAudit(parsed.data.url);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The scan failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
