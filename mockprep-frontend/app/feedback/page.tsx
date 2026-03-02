"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { colors } from "@/lib/colors";
import { getAllDomainItems } from "@/lib/domains";
import Badge from "@/components/Badge";
import ScoreRing from "@/components/ScoreRing";
import SkillBreakdown from "@/components/SkillBreakdown";
import QuestionCard from "@/components/QuestionCard";
import type { InterviewFeedback } from "@/lib/types";

/* ── Mock data used when no real feedback exists ── */
const MOCK_FEEDBACK: InterviewFeedback = {
  type: "interview_complete",
  overall_score: 7.2,
  category_averages: {
    technical_accuracy: 7.5,
    depth: 6.8,
    communication: 8.0,
    problem_solving: 7.0,
    practical_experience: 6.7,
  },
  questions: [
    {
      question_number: 1,
      question_text: "Can you explain the virtual DOM in React and why it exists?",
      scores: { technical_accuracy: 8, depth: 7, communication: 8, problem_solving: 7, practical_experience: 7 },
      strengths: ["Clear explanation of reconciliation", "Good real-world analogy"],
      improvements: ["Could mention Fiber architecture", "Discuss trade-offs vs Svelte's approach"],
      difficulty_at_time: "mid",
    },
    {
      question_number: 2,
      question_text: "How would you optimize a React app that's rendering slowly?",
      scores: { technical_accuracy: 7, depth: 7, communication: 8, problem_solving: 7, practical_experience: 6 },
      strengths: ["Mentioned React.memo and useMemo", "Good debugging approach"],
      improvements: ["Explore React DevTools profiler more", "Discuss code splitting strategies"],
      difficulty_at_time: "mid",
    },
    {
      question_number: 3,
      question_text: "Walk me through how you'd design a component library from scratch.",
      scores: { technical_accuracy: 7, depth: 6, communication: 8, problem_solving: 7, practical_experience: 7 },
      strengths: ["Solid understanding of composition patterns", "Good API design instincts"],
      improvements: ["More on accessibility from the start", "Discuss versioning and documentation strategy"],
      difficulty_at_time: "senior",
    },
  ],
  difficulty_progression: ["mid", "mid", "senior"],
  overall_strengths: ["Strong communication", "Good practical examples"],
  areas_to_improve: ["Deeper system design knowledge", "More advanced patterns"],
  recommended_next: {
    difficulty: "senior",
    focus_areas: ["System design", "Performance optimization", "Architecture patterns"],
  },
};

export default function FeedbackPage() {
  const router = useRouter();
  const [fb, setFb] = useState<InterviewFeedback | null>(null);
  const [domainLabel, setDomainLabel] = useState("");
  const [diffLabel, setDiffLabel] = useState("");
  const [durLabel, setDurLabel] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("interviewFeedback");
    if (stored) {
      try {
        setFb(JSON.parse(stored));
      } catch {
        setFb(MOCK_FEEDBACK);
      }
    } else {
      setFb(MOCK_FEEDBACK);
    }

    const domainKey = sessionStorage.getItem("interviewDomain") || "frontend";
    const allItems = getAllDomainItems();
    setDomainLabel(allItems[domainKey]?.label || domainKey);

    const diff = sessionStorage.getItem("interviewDifficulty") || "mid";
    setDiffLabel(diff.charAt(0).toUpperCase() + diff.slice(1));

    const dur = sessionStorage.getItem("interviewDuration") || "30";
    setDurLabel(`${dur} min`);
  }, []);

  if (!fb) return null;

  const radarData = Object.entries(fb.category_averages).map(([key, val]) => ({
    category: key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace("Technical Accuracy", "Accuracy")
      .replace("Practical Experience", "Experience"),
    score: val,
    fullMark: 10,
  }));

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px 80px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", marginBottom: 48 }}
        >
          <Badge color={colors.green} style={{ marginBottom: 16 }}>
            Interview Complete
          </Badge>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: colors.text,
              letterSpacing: -1,
              margin: "8px 0 0",
            }}
          >
            Your Performance Report
          </h1>
          <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}>
            {domainLabel} · {diffLabel} · {durLabel}
          </p>
        </motion.div>

        {/* Score + Radar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            display: "flex",
            gap: 32,
            alignItems: "center",
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 20,
            padding: "32px 40px",
            marginBottom: 24,
          }}
        >
          <ScoreRing score={fb.overall_score} size={140} label="Overall" />
          <div style={{ flex: 1, height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke={colors.border} />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: colors.textMuted, fontSize: 11 }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
                <Radar
                  dataKey="score"
                  stroke={colors.accent}
                  fill={colors.accent}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={{ fill: colors.accent, r: 3 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Skill Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SkillBreakdown categories={fb.category_averages} />
        </motion.div>

        {/* Question-by-Question */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: colors.text,
              marginBottom: 16,
              letterSpacing: -0.3,
            }}
          >
            Question-by-Question
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {fb.questions.map((q, i) => (
              <QuestionCard
                key={i}
                question={{
                  number: q.question_number,
                  text: q.question_text,
                  scores: q.scores,
                  strengths: q.strengths,
                  improvements: q.improvements,
                }}
                difficultyId={fb.difficulty_progression[i] || q.difficulty_at_time}
                index={i}
              />
            ))}
          </div>
        </motion.div>

        {/* Recommendation */}
        {fb.recommended_next && <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            background: `linear-gradient(135deg, ${colors.accentDim}, transparent)`,
            border: `1px solid ${colors.accent}30`,
            borderRadius: 20,
            padding: "24px 28px",
            marginTop: 24,
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: colors.accent,
              margin: "0 0 8px",
              letterSpacing: -0.3,
            }}
          >
            Next Steps
          </h3>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            Ready to level up to{" "}
            <strong style={{ color: colors.text }}>{fb.recommended_next && fb.recommended_next.difficulty}</strong>{" "}
            difficulty. Focus on: {fb.recommended_next.focus_areas && fb.recommended_next.focus_areas.join(", ")}.
          </p>
        </motion.div>}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, marginTop: 32, justifyContent: "center" }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              sessionStorage.removeItem("interviewFeedback");
              router.push("/");
            }}
            style={{
              background: `linear-gradient(135deg, ${colors.accent}, #06B6D4)`,
              border: "none",
              borderRadius: 12,
              padding: "14px 32px",
              fontSize: 15,
              fontWeight: 600,
              color: colors.bg,
              cursor: "pointer",
              letterSpacing: -0.3,
            }}
          >
            Practice Again
          </motion.button>
          <button
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: "14px 32px",
              fontSize: 15,
              fontWeight: 600,
              color: colors.textSecondary,
              cursor: "pointer",
              letterSpacing: -0.3,
            }}
          >
            Share Results
          </button>
        </div>
      </div>
    </div>
  );
}
