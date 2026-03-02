"use client";

import { motion } from "framer-motion";
import { colors } from "@/lib/colors";

interface SkillBreakdownProps {
  categories: Record<string, number>;
}

const getScoreColor = (s: number) =>
  s >= 7.5 ? colors.green : s >= 5 ? colors.accent : colors.red;

export default function SkillBreakdown({ categories }: SkillBreakdownProps) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 20,
        padding: "24px 28px",
        marginBottom: 24,
      }}
    >
      <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.text, margin: "0 0 20px", letterSpacing: -0.3 }}>
        Skill Breakdown
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Object.entries(categories).map(([key, val], i) => {
          const color = getScoreColor(val);
          return (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 500 }}>
                  {key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>
                  {val.toFixed(1)}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: colors.borderSubtle,
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(val / 10) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                  style={{ height: "100%", borderRadius: 3, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
