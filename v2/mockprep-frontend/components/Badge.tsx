"use client";

import { colors } from "@/lib/colors";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}

export default function Badge({ children, color = colors.accent, style = {} }: BadgeProps) {
  const getBg = () => {
    if (color === colors.accent) return colors.accentDim;
    if (color === colors.green) return colors.greenDim;
    if (color === colors.amber) return colors.amberDim;
    if (color === colors.red) return colors.redDim;
    // For lime, orange, or custom colors, generate a dim version
    return `${color}1F`;
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 500,
        color,
        background: getBg(),
        letterSpacing: 0.3,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
