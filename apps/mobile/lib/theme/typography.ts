// lib/theme/typography.ts
// Typography variants with consistent sizing and weights.
// Pure data - no logic, no React, no hooks.

export const typography = {
  // Display — מסכי hero, מספרים גדולים
  display: {
    fontSize: 40,
    fontWeight: "700" as const,
    lineHeight: 48,
  },
  // Title — כותרות מסכים
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    lineHeight: 34,
  },
  // Headline — כותרות sections
  headline: {
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 26,
  },
  // Subtitle — כותרות משניות
  subtitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    lineHeight: 22,
  },
  // Body — טקסט רגיל
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  // Label — כפתורים, tabs, badges
  label: {
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  // Caption — metadata, timestamps
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
  // Overline — קטגוריות, section headers קטנים
  overline: {
    fontSize: 10,
    fontWeight: "600" as const,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
} as const;
