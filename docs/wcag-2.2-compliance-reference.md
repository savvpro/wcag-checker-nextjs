# WCAG 2.2 Compliance Reference

This document is a product and implementation reference for building a WCAG-focused website auditing tool.

It is based on the official W3C WCAG 2.2 materials. WCAG 2.2 is the current version to target because content that conforms to WCAG 2.2 also conforms to WCAG 2.1 and WCAG 2.0, with the noted exception that `4.1.1 Parsing` is obsolete in WCAG 2.2.

## What WCAG compliance means

WCAG stands for Web Content Accessibility Guidelines.

For a website, "WCAG compliance" means the site meets the relevant WCAG success criteria at a chosen conformance level:

- `Level A`: the minimum baseline accessibility requirements
- `Level AA`: the most common legal and procurement target
- `Level AAA`: the strictest level, usually partial rather than full-site

Important:

- Automated scans do not prove full compliance.
- Real conformance requires a mix of automated testing and human evaluation.
- A safer product status model is:
  - `No automated issues detected`
  - `Automated issues detected`
  - `Manual review required`

## The 4 WCAG principles

WCAG 2.2 is organized under four principles:

1. `Perceivable`
   Content must be presentable to users in ways they can perceive.
2. `Operable`
   Interface controls and navigation must be usable.
3. `Understandable`
   Content and interaction must be clear and predictable.
4. `Robust`
   Content must work reliably with assistive technologies and modern user agents.

## What a website needs in practice

If you want a practical product checklist, a website generally needs:

- Text alternatives for informative images, icons, charts, and controls
- Captions and other equivalents for audio/video content
- Semantic structure using headings, lists, tables, landmarks, and labels
- Good color contrast and non-color cues
- Keyboard accessibility for all interactive features
- Visible and unobscured focus indicators
- Logical focus order and reading order
- Clear page titles, headings, labels, and link/button text
- Predictable navigation and interaction behavior
- Clear form labels, instructions, errors, and recovery paths
- Zoom/reflow support without broken layouts
- Support for touch, pointer, drag, and target-size needs
- Proper language attributes
- Accessible names, roles, values, and status messages for dynamic UI

## Conformance target for most websites

For most business, SaaS, ecommerce, and public-facing websites, the practical target is:

- `WCAG 2.2 Level AA`

That is usually the right standard for:

- accessibility statements
- internal engineering requirements
- enterprise procurement
- many legal risk reviews

## Full WCAG 2.2 guideline and success-criteria map

Below is the complete WCAG 2.2 structure, organized for implementation and audit planning.

### 1. Perceivable

#### 1.1 Text Alternatives

- `1.1.1` Non-text Content

#### 1.2 Time-based Media

- `1.2.1` Audio-only and Video-only (Prerecorded)
- `1.2.2` Captions (Prerecorded)
- `1.2.3` Audio Description or Media Alternative (Prerecorded)
- `1.2.4` Captions (Live)
- `1.2.5` Audio Description (Prerecorded)
- `1.2.6` Sign Language (Prerecorded)
- `1.2.7` Extended Audio Description (Prerecorded)
- `1.2.8` Media Alternative (Prerecorded)
- `1.2.9` Audio-only (Live)

#### 1.3 Adaptable

- `1.3.1` Info and Relationships
- `1.3.2` Meaningful Sequence
- `1.3.3` Sensory Characteristics
- `1.3.4` Orientation
- `1.3.5` Identify Input Purpose
- `1.3.6` Identify Purpose

#### 1.4 Distinguishable

- `1.4.1` Use of Color
- `1.4.2` Audio Control
- `1.4.3` Contrast (Minimum)
- `1.4.4` Resize Text
- `1.4.5` Images of Text
- `1.4.6` Contrast (Enhanced)
- `1.4.7` Low or No Background Audio
- `1.4.8` Visual Presentation
- `1.4.9` Images of Text (No Exception)
- `1.4.10` Reflow
- `1.4.11` Non-text Contrast
- `1.4.12` Text Spacing
- `1.4.13` Content on Hover or Focus

### 2. Operable

#### 2.1 Keyboard Accessible

- `2.1.1` Keyboard
- `2.1.2` No Keyboard Trap
- `2.1.3` Keyboard (No Exception)
- `2.1.4` Character Key Shortcuts

#### 2.2 Enough Time

- `2.2.1` Timing Adjustable
- `2.2.2` Pause, Stop, Hide
- `2.2.3` No Timing
- `2.2.4` Interruptions
- `2.2.5` Re-authenticating
- `2.2.6` Timeouts

#### 2.3 Seizures and Physical Reactions

- `2.3.1` Three Flashes or Below Threshold
- `2.3.2` Three Flashes
- `2.3.3` Animation from Interactions

#### 2.4 Navigable

- `2.4.1` Bypass Blocks
- `2.4.2` Page Titled
- `2.4.3` Focus Order
- `2.4.4` Link Purpose (In Context)
- `2.4.5` Multiple Ways
- `2.4.6` Headings and Labels
- `2.4.7` Focus Visible
- `2.4.8` Location
- `2.4.9` Link Purpose (Link Only)
- `2.4.10` Section Headings
- `2.4.11` Focus Not Obscured (Minimum)
- `2.4.12` Focus Not Obscured (Enhanced)
- `2.4.13` Focus Appearance

#### 2.5 Input Modalities

- `2.5.1` Pointer Gestures
- `2.5.2` Pointer Cancellation
- `2.5.3` Label in Name
- `2.5.4` Motion Actuation
- `2.5.5` Target Size (Enhanced)
- `2.5.6` Concurrent Input Mechanisms
- `2.5.7` Dragging Movements
- `2.5.8` Target Size (Minimum)

### 3. Understandable

#### 3.1 Readable

- `3.1.1` Language of Page
- `3.1.2` Language of Parts
- `3.1.3` Unusual Words
- `3.1.4` Abbreviations
- `3.1.5` Reading Level
- `3.1.6` Pronunciation

#### 3.2 Predictable

- `3.2.1` On Focus
- `3.2.2` On Input
- `3.2.3` Consistent Navigation
- `3.2.4` Consistent Identification
- `3.2.5` Change on Request
- `3.2.6` Consistent Help

#### 3.3 Input Assistance

- `3.3.1` Error Identification
- `3.3.2` Labels or Instructions
- `3.3.3` Error Suggestion
- `3.3.4` Error Prevention (Legal, Financial, Data)
- `3.3.5` Help
- `3.3.6` Error Prevention (All)
- `3.3.7` Redundant Entry
- `3.3.8` Accessible Authentication (Minimum)
- `3.3.9` Accessible Authentication (Enhanced)

### 4. Robust

#### 4.1 Compatible

- `4.1.1` Parsing (obsolete and removed in WCAG 2.2)
- `4.1.2` Name, Role, Value
- `4.1.3` Status Messages

## Build checklist for your product

If you are building a scanner like AccessibilityChecker-style tools, break your product into these categories:

### Automated checks

These are the areas your rules engine can check well with `axe-core`, browser DOM inspection, and custom logic:

- image `alt` presence and decorative image handling
- form labels and accessible names
- color contrast
- heading hierarchy issues
- landmark presence and structure
- link and button discernible text
- ARIA misuse and invalid roles/attributes
- keyboard trap indicators
- title and language attributes
- duplicate IDs and structural semantic issues
- focusable hidden content and nested interactive controls
- viewport and zoom-related anti-patterns

### Manual checks

These are areas your product should list as required manual review:

- full keyboard journey through real workflows
- focus visibility quality and focus loss during dynamic UI changes
- modal/dialog behavior with actual keyboard usage
- screen reader announcements for toasts, validation, and route changes
- meaning and quality of alternative text
- caption quality and transcript quality
- reading order under responsive changes
- zoom and text spacing under real content stress
- complex gestures, drag interactions, and mobile touch ergonomics
- accessible authentication UX
- timeouts, re-authentication, and session preservation

### Reporting buckets

Your current app structure should report:

- `Critical Issues`
- `Passed Audits`
- `Required Manual Audits`
- `Not Applicable`

That matches the right mental model for a one-page scanner.

## What your tool should not claim

Avoid these claims unless you have a much deeper program with manual audits:

- "Fully WCAG compliant"
- "Legally compliant"
- "Certified accessible"
- "ADA compliant" from automation alone

Prefer:

- "Automated accessibility issues detected"
- "No automated issues detected"
- "Manual review required"
- "WCAG 2.2 AA checks run"

## Recommended wording for your UI

- Score label: `Automated accessibility score`
- Verdict label: `Automated audit status`
- Disclaimer: `This result is based on automated checks and does not replace manual WCAG review.`
- Manual tab intro: `These checks require human evaluation and assistive-technology testing.`

## Sources

Official W3C references used for this document:

- WCAG overview: https://www.w3.org/WAI/standards-guidelines/wcag/
- WCAG 2.2 standard: https://www.w3.org/TR/WCAG22/
- Understanding WCAG 2.2: https://www.w3.org/WAI/WCAG22/Understanding/
- WCAG 2 at a glance: https://www.w3.org/WAI/standards-guidelines/wcag/glance/
