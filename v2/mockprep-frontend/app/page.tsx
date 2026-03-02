"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { colors } from "@/lib/colors";
import Logo from "@/components/Logo";
import DomainPicker from "@/components/DomainPicker";
import InterviewConfig from "@/components/InterviewConfig";
import type { InterviewConfig as IConfig } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<"domain" | "config">("domain");
  const [domain, setDomain] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("domain");

  const handleDomainSelect = (d: string, cat: string) => {
    setDomain(d);
    setCategory(cat);
    setStep("config");
  };

  const handleStart = async (config: IConfig) => {
    // Store config and navigate to interview room
    sessionStorage.setItem("interviewConfig", JSON.stringify(config));
    router.push("/interview");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 24px 80px",
      }}
    >
      {/* Top glow */}
      <div
        style={{
          position: "fixed",
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${colors.accentGlow} 0%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
          filter: "blur(60px)",
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: "center", marginBottom: 56, maxWidth: 600, position: "relative", zIndex: 1 }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Logo />
        </div>
        <h1
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: colors.text,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            margin: 0,
          }}
        >
          Practice makes
          <br />
          <span style={{ color: colors.accent }}>permanent</span>
        </h1>
        <p style={{ fontSize: 16, color: colors.textSecondary, marginTop: 16, lineHeight: 1.6 }}>
          AI-powered mock interviews that adapt to your level.
          <br />
          Choose your domain and start practicing.
        </p>
      </motion.div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", display: "flex", justifyContent: "center" }}>
        <AnimatePresence mode="wait">
          {step === "domain" && (
            <motion.div
              key="domain"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{ width: "100%", maxWidth: 720 }}
            >
              <DomainPicker onSelect={handleDomainSelect} />
            </motion.div>
          )}
          {step === "config" && domain && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <InterviewConfig
                domain={domain}
                category={category}
                onBack={() => setStep("domain")}
                onStart={handleStart}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
