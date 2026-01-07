// theme/typography.ts
// Typography variants with consistent sizing and weights.

export const typography = {
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
} as const;

