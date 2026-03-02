"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useDataChannel,
  useLocalParticipant,
  useRoomContext,
  useVoiceAssistant,
} from "@livekit/components-react";
// import "@livekit/components-styles";
import { colors } from "@/lib/colors";
import { getAllDomainItems, getDifficultyById, DIFFICULTIES } from "@/lib/domains";
import Logo from "@/components/Logo";
import Badge from "@/components/Badge";
import AudioVisualizer from "@/components/AudioVisualizer";
import TranscriptPanel from "@/components/TranscriptPanel";
import type { InterviewConfig, RoomMetadata, InterviewFeedback, TranscriptMessage } from "@/lib/types";

export default function InterviewPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("interviewConfig");
    if (!stored) {
      router.push("/");
      return;
    }

    const cfg: InterviewConfig = JSON.parse(stored);
    setConfig(cfg);

    const roomName = `interview-${Date.now()}`;
    const metadata: RoomMetadata = {
      domain: cfg.domain,
      topics: cfg.topics,
      difficulty: cfg.difficulty,
      length_mode: cfg.lengthMode,
      ...(cfg.duration && { duration: cfg.duration }),
      ...(cfg.questionCount && { question_count: cfg.questionCount }),
    };

    fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName, participantName: "user", metadata }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setToken(data.token);
        setUrl(data.url);
      })
      .catch((e) => setError(e.message));
  }, [router]);

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <p style={{ color: colors.red, fontSize: 16 }}>Connection failed: {error}</p>
        <button
          onClick={() => router.push("/")}
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: "10px 24px",
            color: colors.text,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Back to setup
        </button>
      </div>
    );
  }

  if (!token || !url || !config) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ color: colors.accent, fontSize: 16, fontWeight: 500 }}
        >
          Connecting to interviewer...
        </motion.div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect={true}
      audio={true}
      style={{ height: "100vh" }}
    >
      <RoomAudioRenderer />
      <InterviewRoom config={config} />
    </LiveKitRoom>
  );
}

/* ──────────────────── Interview Room (inside LiveKit context) ──────────────────── */

function InterviewRoom({ config }: { config: InterviewConfig }) {
  const router = useRouter();
  const room = useRoomContext();
  const { state: agentState } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();

  const [elapsed, setElapsed] = useState(0);
  const [micActive, setMicActive] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [currentDifficulty, setCurrentDifficulty] = useState(config.difficulty);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  const allItems = getAllDomainItems();
  const domainData = allItems[config.domain];
  const diffColor = getDifficultyById(currentDifficulty)?.color || colors.accent;
  const agentSpeaking = agentState === "speaking";

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle data from agent
  const onDataReceived = useCallback(
    (msg: {payload: Uint8Array}) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(msg.payload));

        if (data.type === "interview_state") {
          if (data.current_question) setCurrentQuestion(data.current_question);
          if (data.difficulty) setCurrentDifficulty(data.difficulty);
        }

        if (data.type === "interview_complete") {
          sessionStorage.setItem("interviewFeedback", JSON.stringify(data));
          sessionStorage.setItem("interviewDomain", config.domain);
          sessionStorage.setItem("interviewDifficulty", config.difficulty);
          sessionStorage.setItem(
            "interviewDuration",
            String(config.duration || config.questionCount || 0)
          );
          setTimeout(() => router.push("/feedback"), 1500);
        }
      } catch {
        // ignore non-JSON messages
      }
    },
    [config, router]
  );

  useDataChannel("interview_state", onDataReceived);
  useDataChannel("interview_feedback", onDataReceived);

  // Collect transcript from LiveKit transcription events
  useEffect(() => {
    if (!room) return;
    const segmentMap = new Map<string, { role: string; text: string; final: boolean }>();

    const handler = (segments: any, participant: any) => {
      const role = participant?.identity === "user" ? "user" : "agent";

      for (const seg of segments) {
        segmentMap.set(seg.id, { role, text: seg.text, final: seg.final });
      }

      // Rebuild transcript from all final segments, grouped by consecutive role
      const finalSegs = Array.from(segmentMap.values()).filter((s) => s.final);
      const grouped: TranscriptMessage[] = [];

      for (const seg of finalSegs) {
        const last = grouped[grouped.length - 1];
        if (last && last.role === seg.role) {
          last.text += " " + seg.text;
        } else {
          grouped.push({ role: seg.role as "agent" | "user", text: seg.text, time: new Date() });
        }
      }

      setTranscript(grouped);
    };

    room.on("transcriptionReceived", handler);
    return () => { room.off("transcriptionReceived", handler); };
  }, [room]);

  const toggleMic = () => {
    localParticipant.setMicrophoneEnabled(!micActive);
    setMicActive(!micActive);
  };

  const handleEnd = async () => {
    try {
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "end_interview" })),
        { topic: "user_command" }
      );
      setTimeout(() => {
        if (!sessionStorage.getItem("interviewFeedback")) {
          room.disconnect();
          router.push("/feedback");
        }
      }, 5000);
    } catch {
      room.disconnect();
      router.push("/feedback");
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const totalSec = (config.duration || 30) * 60;
  const progress = Math.min(elapsed / totalSec, 1);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: colors.bg }}>
      {/* Top Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: `1px solid ${colors.borderSubtle}`,
          background: "rgba(10,10,11,0.9)",
          backdropFilter: "blur(12px)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo size="sm" />
          <div style={{ width: 1, height: 20, background: colors.border }} />
          <Badge color={diffColor}>
            {currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}
          </Badge>
          <span style={{ fontSize: 13, color: colors.textMuted }}>
            {domainData?.label || config.domain}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {config.lengthMode === "duration" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 120,
                  height: 4,
                  borderRadius: 2,
                  background: colors.border,
                  overflow: "hidden",
                }}
              >
                <motion.div
                  animate={{ width: `${progress * 100}%` }}
                  style={{
                    height: "100%",
                    background: progress > 0.85 ? colors.red : colors.accent,
                    borderRadius: 2,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: progress > 0.85 ? colors.red : colors.textSecondary,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatTime(elapsed)} / {config.duration}:00
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 600 }}>
              Q{currentQuestion} / {config.questionCount}
            </span>
          )}
          <span style={{ fontSize: 13, color: colors.textMuted }}>Q{currentQuestion}</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Center: Agent + Visualizer */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Agent avatar */}
          <motion.div
            animate={{
              boxShadow: agentSpeaking
                ? `0 0 60px ${colors.accentGlow}, 0 0 120px ${colors.accentDim}`
                : `0 0 0px transparent`,
            }}
            transition={{ duration: 0.3 }}
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${colors.surface}, ${colors.bg})`,
              border: `2px solid ${agentSpeaking ? colors.accent : colors.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              transition: "border-color 0.3s",
            }}
          >
            <div style={{ fontSize: 48, opacity: 0.9 }}>🎯</div>
          </motion.div>

          <AudioVisualizer active={true} speaking={agentSpeaking} />

          <p
            style={{
              fontSize: 14,
              color: agentSpeaking ? colors.accent : colors.textMuted,
              marginTop: 16,
              fontWeight: 500,
            }}
          >
            {agentSpeaking ? "Interviewer is speaking..." : "Listening..."}
          </p>

          {/* Controls */}
          <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
            <button
              onClick={toggleMic}
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: micActive ? colors.surface : colors.redDim,
                border: `1px solid ${micActive ? colors.border : colors.red}`,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                transition: "all 0.15s",
              }}
            >
              {micActive ? "🎤" : "🔇"}
            </button>
            <button
              onClick={handleEnd}
              style={{
                height: 52,
                borderRadius: 26,
                background: colors.redDim,
                border: `1px solid ${colors.red}`,
                padding: "0 28px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
                color: colors.red,
                transition: "all 0.15s",
              }}
            >
              End Interview
            </button>
          </div>
        </div>

        {/* Right: Transcript */}
        <TranscriptPanel messages={transcript} />
      </div>
    </div>
  );
}
