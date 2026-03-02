"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { colors } from "@/lib/colors";
import { CATEGORIES, DIFFICULTIES, DURATIONS, getAllDomainItems } from "@/lib/domains";
import Badge from "./Badge";
import type { InterviewConfig as IConfig, LengthMode } from "@/lib/types";

interface InterviewConfigProps {
  domain: string;
  category: string;
  onBack: () => void;
  onStart: (config: IConfig) => void;
}

export default function InterviewConfig({
  domain,
  category,
  onBack,
  onStart,
}: InterviewConfigProps) {
  const [topics, setTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("mid");
  const [lengthMode, setLengthMode] = useState<LengthMode>("duration");
  const [duration, setDuration] = useState(30);
  const [questionCount, setQuestionCount] = useState(5);

  const allItems = getAllDomainItems();
  const domainData = allItems[domain];

  const toggleTopic = (id: string) =>
    setTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const handleStart = () =>
    onStart({
      domain,
      category,
      topics,
      difficulty,
      lengthMode,
      duration: lengthMode === "duration" ? duration : null,
      questionCount: lengthMode === "questions" ? questionCount : null,
    });

  if (!domainData) return null;

  return (
    <div style={{ width: "100%", maxWidth: 640 }}>
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: colors.textSecondary,
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 24,
          padding: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        ← Back
      </button>

      {/* Domain Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 32,
          padding: "16px 20px",
          background: colors.surface,
          borderRadius: 14,
          border: `1px solid ${colors.border}`,
        }}
      >
        <span style={{ fontSize: 24 }}>{domainData.icon}</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>
            {domainData.label}
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted }}>
            Configure your interview settings
          </div>
        </div>
      </div>

      {/* ── Topics ── */}
      <Section label="Focus Topics" hint="(optional — leave empty for all)">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {domainData.topics.map((t) => {
            const sel = topics.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggleTopic(t.id)}
                style={{
                  background: sel ? colors.accentDim : "transparent",
                  border: `1px solid ${sel ? colors.accent : colors.border}`,
                  borderRadius: 100,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: sel ? colors.accent : colors.textSecondary,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Difficulty ── */}
      <Section label="Starting Difficulty">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {DIFFICULTIES.map((d) => {
            const sel = difficulty === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                style={{
                  background: sel ? colors.surface : "transparent",
                  border: `1px solid ${sel ? d.color : "transparent"}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: sel ? d.color : colors.textMuted,
                    boxShadow: sel ? `0 0 8px ${d.color}` : "none",
                    transition: "all 0.15s",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <span
                    style={{ fontSize: 14, fontWeight: 600, color: sel ? colors.text : colors.textSecondary }}
                  >
                    {d.label}
                  </span>
                  <span style={{ fontSize: 12, color: colors.textMuted, marginLeft: 10 }}>
                    {d.desc}
                  </span>
                </div>
                {sel && <Badge color={d.color}>Selected</Badge>}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Interview Length ── */}
      <Section label="Interview Length">
        {/* Mode toggle */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 16,
            width: "fit-content",
            background: colors.surface,
            borderRadius: 10,
            padding: 4,
            border: `1px solid ${colors.borderSubtle}`,
          }}
        >
          {(["duration", "questions"] as const).map((m) => {
            const sel = lengthMode === m;
            return (
              <button
                key={m}
                onClick={() => setLengthMode(m)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 7,
                  border: "none",
                  background: sel ? colors.accentDim : "transparent",
                  color: sel ? colors.accent : colors.textMuted,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {m === "duration" ? "By Duration" : "By Questions"}
              </button>
            );
          })}
        </div>

        {lengthMode === "duration" ? (
          <div style={{ display: "flex", gap: 10 }}>
            {DURATIONS.map((d) => {
              const sel = duration === d.value;
              return (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  style={{
                    flex: 1,
                    background: sel ? colors.accentDim : colors.surface,
                    border: `1px solid ${sel ? colors.accent : colors.border}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: sel ? colors.accent : colors.text }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {d.desc}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: colors.accent,
                  minWidth: 50,
                  textAlign: "center",
                }}
              >
                {questionCount}
              </span>
              <span style={{ fontSize: 14, color: colors.textSecondary }}>questions</span>
            </div>
            <input
              type="range"
              min={3}
              max={10}
              value={questionCount}
              onChange={(e) => setQuestionCount(+e.target.value)}
              style={{ width: "100%", accentColor: colors.accent, height: 6, cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 11, color: colors.textMuted }}>3 (quick)</span>
              <span style={{ fontSize: 11, color: colors.textMuted }}>10 (thorough)</span>
            </div>
          </div>
        )}
      </Section>

      {/* ── Start Button ── */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleStart}
        style={{
          width: "100%",
          background: `linear-gradient(135deg, ${colors.accent}, #06B6D4)`,
          border: "none",
          borderRadius: 14,
          padding: "18px 36px",
          fontSize: 16,
          fontWeight: 700,
          color: colors.bg,
          cursor: "pointer",
          letterSpacing: -0.3,
          marginTop: 8,
        }}
      >
        Start Interview
      </motion.button>
    </div>
  );
}

/* ── Helper ── */
function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <p
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          marginBottom: 12,
        }}
      >
        {label}{" "}
        {hint && (
          <span style={{ textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>
            {hint}
          </span>
        )}
      </p>
      {children}
    </div>
  );
}
