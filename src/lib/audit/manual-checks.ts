import type { AuditIssue } from "@/lib/audit/types";

const manualChecks: Array<{
  id: string;
  title: string;
  description: string;
  wcagCriteria: string[];
}> = [
  {
    id: "keyboard-navigation",
    title: "Keyboard navigation and full access",
    description: "Verify every interactive control can be reached and activated using only the keyboard.",
    wcagCriteria: ["WCAG 2.2.1 A", "WCAG 2.1.1 A"],
  },
  {
    id: "focus-order",
    title: "Keyboard focus order and visibility",
    description: "Check that focus moves in a logical order and remains visible through menus, drawers, and dialogs.",
    wcagCriteria: ["WCAG 2.4.3 A", "WCAG 2.4.7 AA"],
  },
  {
    id: "form-errors",
    title: "Form submission and error recovery",
    description: "Trigger validation states and confirm screen readers announce errors, hints, and required fields clearly.",
    wcagCriteria: ["WCAG 3.3.1 A", "WCAG 3.3.3 AA"],
  },
  {
    id: "modal-behavior",
    title: "Modal dialogs and focus trapping",
    description: "Open modal layers and confirm focus is trapped correctly, escape closes the layer, and focus returns to the opener.",
    wcagCriteria: ["WCAG 2.1.2 A", "WCAG 2.4.3 A"],
  },
  {
    id: "zoom-layout",
    title: "Text legibility at 200% zoom",
    description: "Increase zoom and text spacing to confirm content remains readable without clipping or overlap.",
    wcagCriteria: ["WCAG 1.4.4 AA", "WCAG 1.4.12 AA"],
  },
  {
    id: "media-captions",
    title: "Captions, transcripts, and autoplay behavior",
    description: "Review media for caption quality, transcript availability, and safe autoplay controls.",
    wcagCriteria: ["WCAG 1.2.2 A", "WCAG 1.4.2 A"],
  },
  {
    id: "motion",
    title: "Motion, animation, and flashing content",
    description: "Check whether motion can be reduced and whether any flashing content creates seizure risk.",
    wcagCriteria: ["WCAG 2.3.1 A", "WCAG 2.3.3 AAA"],
  },
  {
    id: "timing",
    title: "Timeouts and session controls",
    description: "Review whether time limits can be adjusted, extended, or disabled where the workflow requires it.",
    wcagCriteria: ["WCAG 2.2.1 A"],
  },
  {
    id: "language",
    title: "Language of page parts and alternate content",
    description: "Confirm language changes in multilingual sections are announced correctly to assistive technologies.",
    wcagCriteria: ["WCAG 3.1.1 A", "WCAG 3.1.2 AA"],
  },
  {
    id: "complex-gestures",
    title: "Touch targets and gesture alternatives",
    description: "Review touch interactions, target sizes, and gesture-heavy controls on mobile devices.",
    wcagCriteria: ["WCAG 2.5.1 A", "WCAG 2.5.8 AA"],
  },
  {
    id: "content-changes",
    title: "Live content updates and announcements",
    description: "Test dynamic updates, toasts, loaders, and route changes with assistive technology turned on.",
    wcagCriteria: ["WCAG 4.1.3 AA"],
  },
  {
    id: "reading-flow",
    title: "Reading order and context clarity",
    description: "Navigate with a screen reader to ensure headings, landmarks, and context clues describe the page accurately.",
    wcagCriteria: ["WCAG 1.3.2 A", "WCAG 2.4.6 AA"],
  },
];

export function getManualChecks(): AuditIssue[] {
  return manualChecks.map((check) => ({
    id: `manual-${check.id}`,
    ruleId: check.id,
    title: check.title,
    description: check.description,
    status: "manual",
    severity: "manual",
    impactLabel: "Manual review",
    failingElementsCount: 0,
    disabilitiesAffected: ["Blind", "Low vision", "Motor", "Cognitive"],
    wcagCriteria: check.wcagCriteria,
    fixRecommendation: "Review this flow manually with keyboard navigation, zoom, and at least one screen reader.",
    selectors: [],
  }));
}
