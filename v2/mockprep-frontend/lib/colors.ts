export const colors = {
  bg: "#0A0A0B",
  surface: "#111113",
  surfaceHover: "#18181B",
  border: "#27272A",
  borderSubtle: "#1E1E21",
  text: "#FAFAFA",
  textSecondary: "#A1A1AA",
  textMuted: "#52525B",
  accent: "#22D3EE",
  accentDim: "rgba(34,211,238,0.12)",
  accentGlow: "rgba(34,211,238,0.25)",
  green: "#4ADE80",
  greenDim: "rgba(74,222,128,0.12)",
  lime: "#A3E635",
  limeDim: "rgba(163,230,53,0.12)",
  amber: "#FBBF24",
  amberDim: "rgba(251,191,36,0.12)",
  orange: "#FB923C",
  orangeDim: "rgba(251,146,60,0.12)",
  red: "#F87171",
  redDim: "rgba(248,113,113,0.12)",
} as const;

export type ColorKey = keyof typeof colors;

export function badgeBg(color: string): string {
  if (color === colors.accent) return colors.accentDim;
  if (color === colors.green) return colors.greenDim;
  if (color === colors.lime) return colors.limeDim;
  if (color === colors.amber) return colors.amberDim;
  if (color === colors.orange) return colors.orangeDim;
  return colors.redDim;
}

export function scoreColor(score: number): string {
  if (score >= 7.5) return colors.green;
  if (score >= 5) return colors.accent;
  return colors.red;
}
