import axe from "axe-core";

import { launchBrowser } from "@/lib/audit/browser";
import { formatWcagTags, inferDisabilities } from "@/lib/audit/catalog";
import { createIssue } from "@/lib/audit/helpers";
import type { AuditIssue } from "@/lib/audit/types";

const axeTags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];

type AxePageContext = typeof globalThis & {
  axe?: {
    run: typeof axe.run;
  };
};

async function injectAxe(page: Awaited<ReturnType<Awaited<ReturnType<typeof launchBrowser>>["newPage"]>>) {
  await page.evaluate((source) => {
    const globalScope = globalThis as AxePageContext;

    if (!globalScope.axe) {
      const bootstrap = new Function(
        "bundleSource",
        `
          const module = { exports: {} };
          const exports = module.exports;
          eval(bundleSource);
          return globalThis.axe ?? module.exports;
        `,
      );

      const axeHandle = bootstrap(source) as AxePageContext["axe"];

      if (!globalScope.axe && axeHandle && typeof axeHandle.run === "function") {
        globalScope.axe = axeHandle;
      }
    }
  }, axe.source);
}

async function dismissConsentBanners(page: Awaited<ReturnType<Awaited<ReturnType<typeof launchBrowser>>["newPage"]>>) {
  const candidateLabels = [
    "Accept",
    "Accept all",
    "I agree",
    "Agree",
    "Got it",
    "Allow all",
  ];

  for (const label of candidateLabels) {
    const button = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first();

    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => {});
      await page.waitForTimeout(400);
      return;
    }
  }
}

async function waitForRenderedPage(page: Awaited<ReturnType<Awaited<ReturnType<typeof launchBrowser>>["newPage"]>>) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("body").waitFor({ state: "attached", timeout: 10000 });
  await page.waitForTimeout(1200);
  await dismissConsentBanners(page);
  await page.waitForTimeout(600);
}

async function runAxe(page: Awaited<ReturnType<Awaited<ReturnType<typeof launchBrowser>>["newPage"]>>) {
  await injectAxe(page);

  return await page.evaluate(async (tags) => {
    const axeHandle = (globalThis as AxePageContext).axe;

    if (!axeHandle) {
      throw new Error("axe-core failed to initialize in the rendered audit.");
    }

    return await axeHandle.run(document, {
      runOnly: {
        type: "tag",
        values: tags,
      },
      resultTypes: ["violations", "passes", "inapplicable"],
    });
  }, axeTags);
}

function stringifySelector(target: unknown): string {
  if (typeof target === "string") {
    return target;
  }

  if (Array.isArray(target)) {
    return target.join(" ");
  }

  return JSON.stringify(target);
}

export async function runRenderedChecks(normalizedUrl: string): Promise<AuditIssue[]> {
  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1024 },
      deviceScaleFactor: 1,
    });

    await page.goto(normalizedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await waitForRenderedPage(page);

    let results;

    try {
      results = await runAxe(page);
    } catch {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
      await waitForRenderedPage(page);
      results = await runAxe(page);
    }

    const violations = results.violations.map((violation) =>
      createIssue({
        id: violation.id,
        source: "rendered",
        title: violation.help,
        description: violation.description,
        status: "critical",
        severity: violation.impact ?? "serious",
        failingElementsCount: violation.nodes.length,
        disabilitiesAffected: inferDisabilities(violation.id, violation.impact),
        wcagCriteria: formatWcagTags(violation.tags),
        fixRecommendation: violation.help,
        selectors: violation.nodes.flatMap((node) => node.target.map(stringifySelector)).slice(0, 8),
        helpUrl: violation.helpUrl,
      }),
    );

    const passes = results.passes.map((pass) =>
      createIssue({
        id: pass.id,
        source: "rendered",
        title: pass.help,
        description: pass.description,
        status: "passed",
        severity: "none",
        failingElementsCount: 0,
        disabilitiesAffected: inferDisabilities(pass.id, pass.impact),
        wcagCriteria: formatWcagTags(pass.tags),
        fixRecommendation: "No action needed for this rendered-page check.",
        selectors: [],
        helpUrl: pass.helpUrl,
      }),
    );

    const notApplicable = results.inapplicable.map((item) =>
      createIssue({
        id: item.id,
        source: "rendered",
        title: item.help,
        description: item.description,
        status: "not_applicable",
        severity: "none",
        failingElementsCount: 0,
        disabilitiesAffected: inferDisabilities(item.id, item.impact),
        wcagCriteria: formatWcagTags(item.tags),
        fixRecommendation: "This rendered-page rule did not apply to the current page.",
        selectors: [],
        helpUrl: item.helpUrl,
      }),
    );

    return [...violations, ...passes, ...notApplicable];
  } catch (error) {
    console.error("Rendered audit failed", {
      url: normalizedUrl,
      message: error instanceof Error ? error.message : "Unknown rendered audit error",
      environment: process.env.VERCEL ? "vercel" : "local",
    });
    return [];
  } finally {
    await browser?.close();
  }
}
