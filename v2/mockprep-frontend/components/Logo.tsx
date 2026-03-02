"use client";

import { colors } from "@/lib/colors";

interface LogoProps {
  size?: "sm" | "md";
}

export default function Logo({ size = "md" }: LogoProps) {
  const s = size === "sm" ? 28 : 36;
  const fs = size === "sm" ? 12 : 15;
  const ts = size === "sm" ? 14 : 18;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: size === "sm" ? 8 : 10 }}>
      <div
        style={{
          width: s,
          height: s,
          borderRadius: s * 0.28,
          background: `linear-gradient(135deg, ${colors.accent}, #06B6D4)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: fs,
          fontWeight: 800,
          color: colors.bg,
          letterSpacing: -0.5,
        }}
      >
        IO
      </div>
      <span style={{ fontSize: ts, fontWeight: 600, color: colors.text, letterSpacing: -0.5 }}>
        MockPrep
      </span>
    </div>
  );
}
