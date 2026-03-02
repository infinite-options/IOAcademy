"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { colors } from "@/lib/colors";
import { CATEGORIES } from "@/lib/domains";

interface DomainPickerProps {
  onSelect: (domain: string, category: string) => void;
}

export default function DomainPicker({ onSelect }: DomainPickerProps) {
  const [category, setCategory] = useState<string>("domain");
  const [domain, setDomain] = useState<string | null>(null);

  const currentItems = CATEGORIES[category].items;

  return (
    <div style={{ width: "100%", maxWidth: 720 }}>
      {/* Category Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          width: "fit-content",
          background: colors.surface,
          borderRadius: 12,
          padding: 4,
          border: `1px solid ${colors.borderSubtle}`,
        }}
      >
        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const sel = category === key;
          return (
            <button
              key={key}
              onClick={() => {
                setCategory(key);
                setDomain(null);
              }}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: sel ? colors.accentDim : "transparent",
                color: sel ? colors.accent : colors.textMuted,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: -0.2,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Section Label */}
      <p
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          marginBottom: 16,
        }}
      >
        Select {category === "domain" ? "Domain" : "Language"}
      </p>

      {/* Domain Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: 12,
        }}
      >
        {Object.entries(currentItems).map(([key, d], i) => {
          const selected = domain === key;
          return (
            <motion.button
              key={key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setDomain(key)}
              style={{
                background: selected ? colors.accentDim : colors.surface,
                border: `1px solid ${selected ? colors.accent : colors.border}`,
                borderRadius: 14,
                padding: "20px 18px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                outline: "none",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (!selected) e.currentTarget.style.borderColor = colors.textMuted;
              }}
              onMouseLeave={(e) => {
                if (!selected) e.currentTarget.style.borderColor = colors.border;
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 10, opacity: 0.8 }}>{d.icon}</div>
              <div
                style={{ fontSize: 15, fontWeight: 600, color: colors.text, letterSpacing: -0.3 }}
              >
                {d.label}
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                {d.topics.length} topics
              </div>
              {selected && (
                <motion.div
                  layoutId="domain-check"
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: colors.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: colors.bg,
                  }}
                >
                  ✓
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Continue Button */}
      {domain && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: "flex", justifyContent: "center", marginTop: 32 }}
        >
          <button
            onClick={() => onSelect(domain, category)}
            style={{
              background: `linear-gradient(135deg, ${colors.accent}, #06B6D4)`,
              border: "none",
              borderRadius: 12,
              padding: "14px 36px",
              fontSize: 15,
              fontWeight: 600,
              color: colors.bg,
              cursor: "pointer",
              letterSpacing: -0.3,
            }}
          >
            Configure Interview →
          </button>
        </motion.div>
      )}
    </div>
  );
}
