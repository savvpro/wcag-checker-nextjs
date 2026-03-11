import { load } from "cheerio";
import OpenAI from "openai";
import chromium from "@sparticuz/chromium";
import { z } from "zod";

import { getManualChecks } from "@/lib/audit/manual-checks";
import { buildScoreSummary } from "@/lib/audit/score";
import type { AuditIssue, AuditReport } from "@/lib/audit/types";

const inputSchema = z.object({
  url: z.string().trim().url(),
});

const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 WCAGAuditWorkbench/1.0";

function normalizeUrl(rawUrl: string): string {
  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const parsed = new URL(withProtocol);
  parsed.hash = "";
  return parsed.toString();
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function createIssue({
  id,
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

function isValidLang(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value.trim());
}

function findVisibleLabelText($: ReturnType<typeof load>, control: ReturnType<ReturnType<typeof load>>) {
  const id = control.attr("id");
  const ariaLabel = collapseWhitespace(control.attr("aria-label") ?? "");
  const ariaLabelledBy = collapseWhitespace(control.attr("aria-labelledby") ?? "");
  const title = collapseWhitespace(control.attr("title") ?? "");

  if (ariaLabel || ariaLabelledBy || title) {
    return true;
  }

  if (id) {
    const forLabel = collapseWhitespace($(`label[for="${id}"]`).first().text());
    if (forLabel) {
      return true;
    }
  }

  const wrappedLabel = collapseWhitespace(control.closest("label").text());
  return Boolean(wrappedLabel);
}

function hasAccessibleText(nodeText: string, attrs: Array<string | undefined>) {
  if (collapseWhitespace(nodeText)) {
    return true;
  }

  return attrs.some((value) => collapseWhitespace(value ?? "").length > 0);
}

function collectSelectors(elements: string[]): string[] {
  return elements.slice(0, 8);
}

function evaluateChecks(html: string, normalizedUrl: string): { pageTitle: string; issues: AuditIssue[] } {
  const $ = load(html);
  const htmlTag = $("html");
  const pageTitle = collapseWhitespace($("title").first().text()) || normalizedUrl;
  const issues: AuditIssue[] = [];

  const titleText = collapseWhitespace($("title").first().text());
  issues.push(
    createIssue({
      id: "document-title",
      title: "Each page should have a non-empty title element",
      description: "A descriptive title helps screen reader users and browser users understand where they are.",
      status: titleText ? "passed" : "critical",
      severity: titleText ? "none" : "serious",
      failingElementsCount: titleText ? 0 : 1,
      disabilitiesAffected: ["Blind", "Cognitive"],
      wcagCriteria: ["WCAG 2.4.2 A"],
      fixRecommendation: "Add a unique and descriptive <title> element for the page.",
      selectors: titleText ? [] : ["head > title"],
    }),
  );

  const lang = htmlTag.attr("lang");
  issues.push(
    createIssue({
      id: "html-lang",
      title: "The root html element should declare a valid language",
      description: "Assistive technologies rely on the page language to apply correct pronunciation and parsing rules.",
      status: isValidLang(lang) ? "passed" : "critical",
      severity: isValidLang(lang) ? "none" : "serious",
      failingElementsCount: isValidLang(lang) ? 0 : 1,
      disabilitiesAffected: ["Blind", "Cognitive"],
      wcagCriteria: ["WCAG 3.1.1 A"],
      fixRecommendation: "Add a valid lang attribute to the <html> element, for example lang=\"en\".",
      selectors: isValidLang(lang) ? [] : ["html"],
    }),
  );

  const headings = $("h1, h2, h3, h4, h5, h6").toArray();
  const headingLevels = headings.map((node) => Number(node.tagName[1]));
  const hasH1 = headingLevels.includes(1);
  issues.push(
    createIssue({
      id: "page-h1",
      title: "The page should contain at least one level-one heading",
      description: "A top-level heading gives structure to the page and helps users navigate.",
      status: hasH1 ? "passed" : "critical",
      severity: hasH1 ? "none" : "moderate",
      failingElementsCount: hasH1 ? 0 : 1,
      disabilitiesAffected: ["Blind", "Cognitive"],
      wcagCriteria: ["WCAG 1.3.1 A", "WCAG 2.4.6 AA"],
      fixRecommendation: "Add a meaningful <h1> that describes the primary purpose of the page.",
      selectors: hasH1 ? [] : ["body"],
    }),
  );

  const headingSkips = headingLevels.reduce<number[]>((acc, level, index) => {
    if (index === 0) {
      return acc;
    }

    const previous = headingLevels[index - 1];
    if (level - previous > 1) {
      acc.push(index);
    }

    return acc;
  }, []);

  issues.push(
    createIssue({
      id: "heading-order",
      title: "Headings should progress in a logical order",
      description: "Skipping heading levels can create a confusing document outline for assistive technologies.",
      status: headings.length === 0 ? "not_applicable" : headingSkips.length === 0 ? "passed" : "critical",
      severity: headings.length === 0 ? "none" : headingSkips.length === 0 ? "none" : "moderate",
      failingElementsCount: headingSkips.length,
      disabilitiesAffected: ["Blind", "Deafblind", "Cognitive"],
      wcagCriteria: ["WCAG 1.3.1 A", "Best Practice"],
      fixRecommendation: "Avoid jumping from one heading level to a much deeper level unless the content hierarchy truly requires it.",
      selectors: headingSkips.length > 0 ? collectSelectors(headingSkips.map((index) => headings[index].tagName)) : [],
    }),
  );

  const images = $("img").toArray();
  const missingAlt = images.filter((node) => $(node).attr("alt") === undefined);
  issues.push(
    createIssue({
      id: "image-alt",
      title: "Images should have alt text or an explicit empty alt attribute",
      description: "Informative images need alternatives, while decorative images should use alt=\"\".",
      status: images.length === 0 ? "not_applicable" : missingAlt.length === 0 ? "passed" : "critical",
      severity: images.length === 0 ? "none" : missingAlt.length === 0 ? "none" : "serious",
      failingElementsCount: missingAlt.length,
      disabilitiesAffected: ["Blind"],
      wcagCriteria: ["WCAG 1.1.1 A"],
      fixRecommendation: "Add alt text for informative images and alt=\"\" for decorative images.",
      selectors: collectSelectors(
        missingAlt.map((node, index) => `${node.tagName}:nth-of-type(${index + 1})`),
      ),
    }),
  );

  const controls = $("input, textarea, select")
    .toArray()
    .filter((node) => {
      const element = $(node);
      const type = (element.attr("type") ?? "").toLowerCase();
      return !["hidden", "submit", "reset", "button", "image"].includes(type);
    });
  const unlabeledControls = controls.filter((node) => !findVisibleLabelText($, $(node)));
  issues.push(
    createIssue({
      id: "form-labels",
      title: "Form controls should have associated labels or accessible names",
      description: "Inputs, textareas, and selects need labels that assistive technology can announce.",
      status: controls.length === 0 ? "not_applicable" : unlabeledControls.length === 0 ? "passed" : "critical",
      severity: controls.length === 0 ? "none" : unlabeledControls.length === 0 ? "none" : "serious",
      failingElementsCount: unlabeledControls.length,
      disabilitiesAffected: ["Blind", "Cognitive", "Low vision"],
      wcagCriteria: ["WCAG 1.3.1 A", "WCAG 3.3.2 A", "WCAG 4.1.2 A"],
      fixRecommendation: "Associate a visible label with each form control or provide a valid accessible name.",
      selectors: collectSelectors(unlabeledControls.map((node) => node.tagName)),
    }),
  );

  const buttons = $("button, input[type='button'], input[type='submit'], input[type='reset'], input[type='image']").toArray();
  const unnamedButtons = buttons.filter((node) => {
    const element = $(node);
    return !hasAccessibleText(element.text(), [element.attr("value"), element.attr("aria-label"), element.attr("title"), element.attr("alt")]);
  });
  issues.push(
    createIssue({
      id: "button-name",
      title: "Buttons should have discernible text",
      description: "Controls need names that can be announced by assistive technology.",
      status: buttons.length === 0 ? "not_applicable" : unnamedButtons.length === 0 ? "passed" : "critical",
      severity: buttons.length === 0 ? "none" : unnamedButtons.length === 0 ? "none" : "serious",
      failingElementsCount: unnamedButtons.length,
      disabilitiesAffected: ["Blind", "Motor"],
      wcagCriteria: ["WCAG 4.1.2 A", "WCAG 2.4.6 AA"],
      fixRecommendation: "Add visible text or a valid accessible name to every button control.",
      selectors: collectSelectors(unnamedButtons.map((node) => node.tagName)),
    }),
  );

  const links = $("a[href]").toArray();
  const unnamedLinks = links.filter((node) => {
    const element = $(node);
    return !hasAccessibleText(element.text(), [element.attr("aria-label"), element.attr("title")]);
  });
  issues.push(
    createIssue({
      id: "link-name",
      title: "Links should have discernible text",
      description: "Users need to understand the destination or purpose of each link.",
      status: links.length === 0 ? "not_applicable" : unnamedLinks.length === 0 ? "passed" : "critical",
      severity: links.length === 0 ? "none" : unnamedLinks.length === 0 ? "none" : "serious",
      failingElementsCount: unnamedLinks.length,
      disabilitiesAffected: ["Blind", "Low vision"],
      wcagCriteria: ["WCAG 2.4.4 A", "WCAG 4.1.2 A"],
      fixRecommendation: "Ensure each link has visible text or an accessible name that describes its destination.",
      selectors: collectSelectors(unnamedLinks.map((node) => node.tagName)),
    }),
  );

  const iframes = $("iframe").toArray();
  const untitledIframes = iframes.filter((node) => !collapseWhitespace($(node).attr("title") ?? ""));
  issues.push(
    createIssue({
      id: "iframe-title",
      title: "Iframes should have titles",
      description: "Frame titles help users understand the purpose of embedded content.",
      status: iframes.length === 0 ? "not_applicable" : untitledIframes.length === 0 ? "passed" : "critical",
      severity: iframes.length === 0 ? "none" : untitledIframes.length === 0 ? "none" : "moderate",
      failingElementsCount: untitledIframes.length,
      disabilitiesAffected: ["Blind"],
      wcagCriteria: ["WCAG 4.1.2 A", "WCAG 2.4.1 A"],
      fixRecommendation: "Add a concise title attribute to each iframe.",
      selectors: collectSelectors(untitledIframes.map((node) => node.tagName)),
    }),
  );

  const hasMain = $("main, [role='main']").length > 0;
  issues.push(
    createIssue({
      id: "main-landmark",
      title: "Pages should expose a main landmark",
      description: "A main landmark helps keyboard and screen reader users jump directly to primary content.",
      status: hasMain ? "passed" : "critical",
      severity: hasMain ? "none" : "moderate",
      failingElementsCount: hasMain ? 0 : 1,
      disabilitiesAffected: ["Blind", "Cognitive"],
      wcagCriteria: ["WCAG 1.3.1 A", "WCAG 2.4.1 A"],
      fixRecommendation: "Wrap the main content in a <main> element or role=\"main\" landmark.",
      selectors: hasMain ? [] : ["body"],
    }),
  );

  const viewport = $("meta[name='viewport']").attr("content") ?? "";
  const viewportDisablesZoom =
    /user-scalable\s*=\s*no/i.test(viewport) ||
    /maximum-scale\s*=\s*1(\.0+)?/i.test(viewport) ||
    /maximum-scale\s*=\s*[01](?!\d)/i.test(viewport);
  issues.push(
    createIssue({
      id: "viewport-zoom",
      title: "Viewport settings should not disable zoom",
      description: "Users with low vision may need to zoom in significantly to read and operate the page.",
      status: viewport ? (viewportDisablesZoom ? "critical" : "passed") : "not_applicable",
      severity: viewport ? (viewportDisablesZoom ? "serious" : "none") : "none",
      failingElementsCount: viewport && viewportDisablesZoom ? 1 : 0,
      disabilitiesAffected: ["Low vision", "Motor"],
      wcagCriteria: ["WCAG 1.4.4 AA", "WCAG 1.4.10 AA"],
      fixRecommendation: "Remove user-scalable=no and avoid locking maximum-scale to 1.",
      selectors: viewport && viewportDisablesZoom ? ["meta[name='viewport']"] : [],
    }),
  );

  const ids = $("[id]")
    .toArray()
    .map((node) => collapseWhitespace($(node).attr("id") ?? ""))
    .filter(Boolean);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  issues.push(
    createIssue({
      id: "duplicate-id",
      title: "ID values should be unique within the page",
      description: "Duplicate IDs can break label associations, scripting hooks, and assistive technology references.",
      status: ids.length === 0 ? "not_applicable" : duplicateIds.length === 0 ? "passed" : "critical",
      severity: ids.length === 0 ? "none" : duplicateIds.length === 0 ? "none" : "moderate",
      failingElementsCount: duplicateIds.length,
      disabilitiesAffected: ["Blind", "Cognitive"],
      wcagCriteria: ["WCAG 4.1.2 A", "Best Practice"],
      fixRecommendation: "Ensure every id value is unique on the page.",
      selectors: collectSelectors(duplicateIds.map((id) => `#${id}`)),
    }),
  );

  const tables = $("table").toArray();
  const tablesWithoutHeaders = tables.filter((node) => $(node).find("th").length === 0);
  issues.push(
    createIssue({
      id: "table-headers",
      title: "Data tables should expose header cells",
      description: "Tables with data need header relationships so users can understand cell context.",
      status: tables.length === 0 ? "not_applicable" : tablesWithoutHeaders.length === 0 ? "passed" : "critical",
      severity: tables.length === 0 ? "none" : tablesWithoutHeaders.length === 0 ? "none" : "moderate",
      failingElementsCount: tablesWithoutHeaders.length,
      disabilitiesAffected: ["Blind", "Cognitive"],
      wcagCriteria: ["WCAG 1.3.1 A"],
      fixRecommendation: "Use <th> elements and proper table semantics for data tables.",
      selectors: collectSelectors(tablesWithoutHeaders.map((node) => node.tagName)),
    }),
  );

  return {
    pageTitle,
    issues: [...issues, ...getManualChecks()],
  };
}

async function fetchHtml(normalizedUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        "user-agent": userAgent,
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

async function launchScreenshotBrowser() {
  if (process.env.VERCEL) {
    const { chromium: playwrightChromium } = await import("playwright-core");
    const executablePath = await chromium.executablePath();

    return playwrightChromium.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
  }

  const { chromium: localChromium } = await import("playwright");
  return localChromium.launch({ headless: true });
}

async function captureScreenshot(normalizedUrl: string): Promise<string | undefined> {
  let browser: Awaited<ReturnType<typeof launchScreenshotBrowser>> | undefined;

  try {
    browser = await launchScreenshotBrowser();
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1024 },
      deviceScaleFactor: 1,
    });

    await page.goto(normalizedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(1500);

    const buffer = await page.screenshot({
      type: "jpeg",
      quality: 70,
      fullPage: false,
    });

    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("Screenshot capture failed", {
      url: normalizedUrl,
      message: error instanceof Error ? error.message : "Unknown screenshot error",
      environment: process.env.VERCEL ? "vercel" : "local",
    });
    return undefined;
  } finally {
    await browser?.close();
  }
}

async function buildAiSummary(report: AuditReport): Promise<string | undefined> {
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
    const { pageTitle, issues } = evaluateChecks(html, normalizedUrl);
    const report = buildScoreSummary(rawUrl, normalizedUrl, pageTitle, issues);
    const screenshotDataUrl = await captureScreenshot(normalizedUrl);
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
