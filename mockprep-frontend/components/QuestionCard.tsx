"use client";

import { motion } from "framer-motion";
import { colors } from "@/lib/colors";
import Badge from "./Badge";
import { getDifficultyById } from "@/lib/domains";

interface QuestionCardProps {
  question: {
    number: number;
    text: string;
    scores: Record<string, number>;
    strengths: string[];
    improvements: string[];
  };
  difficultyId: string;
  index: number;
}

const getScoreColor = (s: number) =>
  s >= 7.5 ? colors.green : s >= 5 ? colors.accent : colors.red;

const getDimBg = (color: string) => {
  if (color === colors.green) return colors.greenDim;
  if (color === colors.accent) return colors.accentDim;
  return colors.redDim;
};

function toArray(val: string | string[]): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") return val.split(/,\s*/).filter(Boolean);
  return [];
}

export default function QuestionCard({ question: q, difficultyId, index }: QuestionCardProps) {
  const avg =
    Object.values(q.scores).reduce((a, b) => a + b, 0) / Object.values(q.scores).length;
  const avgColor = getScoreColor(avg);
  const diff = getDifficultyById(difficultyId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.1 }}
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: "20px 24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted }}>
              Q{q.number}
            </span>
            {diff && <Badge color={diff.color}>{difficultyId}</Badge>}
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: colors.text, lineHeight: 1.5, margin: 0 }}>
            {q.text}
          </p>
        </div>
        <div
          style={{
            minWidth: 44,
            height: 44,
            borderRadius: 12,
            background: getDimBg(avgColor),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 700,
            color: avgColor,
            marginLeft: 16,
          }}
        >
          {avg.toFixed(1)}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: colors.green,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Strengths
          </span>
          {toArray(q.strengths).map((s, j) => (
            <p key={j} style={{ fontSize: 13, color: colors.textSecondary, margin: "4px 0 0", lineHeight: 1.5 }}>
              · {s}
            </p>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: colors.amber,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            To Improve
          </span>
          {toArray(q.improvements).map((s, j) => (
            <p key={j} style={{ fontSize: 13, color: colors.textSecondary, margin: "4px 0 0", lineHeight: 1.5 }}>
              · {s}
            </p>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
