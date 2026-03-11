export const disabilityMap: Record<string, string[]> = {
  "color-contrast": ["Low vision", "Color blindness"],
  "link-name": ["Blind", "Low vision"],
  "button-name": ["Blind", "Motor"],
  "image-alt": ["Blind"],
  label: ["Blind", "Cognitive", "Low vision"],
  "heading-order": ["Blind", "Deafblind", "Cognitive"],
  "frame-title": ["Blind"],
  "html-has-lang": ["Blind", "Cognitive"],
  "html-lang-valid": ["Blind", "Cognitive"],
  "input-image-alt": ["Blind"],
  list: ["Blind", "Cognitive"],
  "meta-viewport": ["Low vision", "Motor"],
  "meta-viewport-large": ["Low vision"],
  region: ["Blind", "Cognitive"],
  tabindex: ["Motor", "Blind"],
  "nested-interactive": ["Blind", "Motor"],
};

export function inferDisabilities(ruleId: string, impact: string | null | undefined): string[] {
  if (disabilityMap[ruleId]) {
    return disabilityMap[ruleId];
  }

  switch (impact) {
    case "critical":
      return ["Blind", "Low vision", "Motor"];
    case "serious":
      return ["Blind", "Low vision"];
    case "moderate":
      return ["Blind", "Cognitive"];
    case "minor":
      return ["Cognitive"];
    default:
      return ["Multiple assistive needs"];
  }
}

export function formatWcagTags(tags: string[]): string[] {
  return tags
    .filter((tag) => /^wcag\d/.test(tag))
    .map((tag) => {
      const match = tag.match(/^wcag(\d)(\d+)([a-z]+)$/);

      if (!match) {
        return tag.toUpperCase();
      }

      const [, major, criteria, level] = match;
      const criterion = criteria.length === 1 ? `${criteria}.0` : `${criteria[0]}.${criteria.slice(1)}`;

      return `WCAG ${major}.${criterion} ${level.toUpperCase()}`;
    });
}
