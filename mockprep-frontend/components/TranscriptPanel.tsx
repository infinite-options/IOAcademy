"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { colors } from "@/lib/colors";

interface Message {
  role: string;
  text: string;
  time: Date;
}

interface TranscriptPanelProps {
  messages: Message[];
}

export default function TranscriptPanel({ messages }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div
      style={{
        width: 380,
        borderLeft: `1px solid ${colors.borderSubtle}`,
        display: "flex",
        flexDirection: "column",
        background: "rgba(17,17,19,0.5)",
      }}
    >
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.borderSubtle}` }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary }}>
          Live Transcript
        </span>
      </div>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: m.role === "agent" ? colors.accent : colors.green,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                {m.role === "agent" ? "Interviewer" : "You"}
              </span>
              <span style={{ fontSize: 11, color: colors.textMuted }}>
                {m.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
              {m.text}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
