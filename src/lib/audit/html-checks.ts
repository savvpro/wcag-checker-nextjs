import { load } from "cheerio";

import { getManualChecks } from "@/lib/audit/manual-checks";
import type { AuditIssue } from "@/lib/audit/types";
import { collapseWhitespace, collectSelectors, createIssue } from "@/lib/audit/helpers";

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

export function runHtmlChecks(html: string, normalizedUrl: string): { pageTitle: string; issues: AuditIssue[] } {
  const $ = load(html);
  const htmlTag = $("html");
  const pageTitle = collapseWhitespace($("title").first().text()) || normalizedUrl;
  const issues: AuditIssue[] = [];

  const titleText = collapseWhitespace($("title").first().text());
  issues.push(
    createIssue({
      id: "document-title",
      source: "html",
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
  const hasValidLang = isValidLang(lang);
  issues.push(
    createIssue({
      id: "html-lang",
      source: "html",
      title: "The root html element should declare a valid language",
      description: "Assistive technologies rely on the page language to apply correct pronunciation and parsing rules.",
      status: hasValidLang ? "passed" : "critical",
      severity: hasValidLang ? "none" : "serious",
      failingElementsCount: hasValidLang ? 0 : 1,
      disabilitiesAffected: ["Blind", "Cognitive"],
      wcagCriteria: ["WCAG 3.1.1 A"],
      fixRecommendation: "Add a valid lang attribute to the <html> element, for example lang=\"en\".",
      selectors: hasValidLang ? [] : ["html"],
    }),
  );

  const headings = $("h1, h2, h3, h4, h5, h6").toArray();
  const headingLevels = headings.map((node) => Number(node.tagName[1]));
  const hasH1 = headingLevels.includes(1);
  issues.push(
    createIssue({
      id: "page-h1",
      source: "html",
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
      source: "html",
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
      source: "html",
      title: "Images should have alt text or an explicit empty alt attribute",
      description: "Informative images need alternatives, while decorative images should use alt=\"\".",
      status: images.length === 0 ? "not_applicable" : missingAlt.length === 0 ? "passed" : "critical",
      severity: images.length === 0 ? "none" : missingAlt.length === 0 ? "none" : "serious",
      failingElementsCount: missingAlt.length,
      disabilitiesAffected: ["Blind"],
      wcagCriteria: ["WCAG 1.1.1 A"],
      fixRecommendation: "Add alt text for informative images and alt=\"\" for decorative images.",
      selectors: collectSelectors(missingAlt.map((node, index) => `${node.tagName}:nth-of-type(${index + 1})`)),
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
      source: "html",
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
      source: "html",
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
      source: "html",
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
      source: "html",
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
      source: "html",
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
      source: "html",
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
      source: "html",
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
      source: "html",
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
