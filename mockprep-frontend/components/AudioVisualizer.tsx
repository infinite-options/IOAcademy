"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { colors } from "@/lib/colors";

interface AudioVisualizerProps {
  active: boolean;
  speaking: boolean;
}

export default function AudioVisualizer({ active, speaking }: AudioVisualizerProps) {
  const [bars, setBars] = useState(Array(32).fill(0));

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setBars(
        Array(32)
          .fill(0)
          .map((_, i) => {
            if (!speaking) return Math.random() * 0.05 + 0.02;
            const center = 16;
            const dist = Math.abs(i - center) / center;
            return Math.random() * (1 - dist * 0.6) * 0.8 + 0.1;
          })
      );
    }, 80);
    return () => clearInterval(interval);
  }, [active, speaking]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, height: 60 }}>
      {bars.map((h, i) => (
        <motion.div
          key={i}
          animate={{ height: h * 56 + 4 }}
          transition={{ duration: 0.08, ease: "easeOut" }}
          style={{
            width: 3,
            borderRadius: 2,
            background: speaking
              ? `linear-gradient(180deg, ${colors.accent}, ${colors.accentGlow})`
              : colors.border,
          }}
        />
      ))}
    </div>
  );
}
