// src/stores/interviewStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  InterviewType,
  SkillLevel,
} from "../components/interview-evaluation/interview-menu/InterviewMenu";

type MessageRole = "interviewer" | "candidate";

interface Message {
  role: MessageRole;
  content: string;
  timestamp: number;
}

interface EvaluationScores {
  technical: number;
  communication: number;
}

interface InterviewState {
  // Interview metadata
  interviewType: InterviewType | null;
  skillLevel: SkillLevel | null;
  startTime: number | null;
  endTime: number | null;

  // Transcript
  messages: Message[];
  /** In-progress interviewer text (streaming word-by-word in same bubble). */
  pendingInterviewerContent: string;
  /** In-progress candidate text (streaming word-by-word in same bubble). */
  pendingCandidateContent: string;

  // Evaluation
  evaluationFeedback: string | null;
  scores: EvaluationScores | null;

  // Actions
  setInterviewType: (type: InterviewType | null) => void;
  setSkillLevel: (level: SkillLevel | null) => void;
  startInterview: () => void;
  endInterview: () => void;
  addMessage: (role: MessageRole, content: string) => void;
  appendPendingInterviewer: (text: string) => void;
  appendPendingCandidate: (text: string) => void;
  flushPendingInterviewer: () => void;
  flushPendingCandidate: () => void;
  setEvaluationFeedback: (feedback: string) => void;
  setScores: (scores: EvaluationScores) => void;
  resetInterview: () => void;
}

export const useInterviewStore = create<InterviewState>()(
  persist(
    (set) => ({
      // Initial state
      interviewType: null,
      skillLevel: null,
      startTime: null,
      endTime: null,
      messages: [],
      pendingInterviewerContent: "",
      pendingCandidateContent: "",
      evaluationFeedback: null,
      scores: null,

      // Actions
      setInterviewType: (type) => set({ interviewType: type }),
      setSkillLevel: (level) => set({ skillLevel: level }),

      startInterview: () =>
        set({
          startTime: Date.now(),
          endTime: null,
          messages: [],
          pendingInterviewerContent: "",
          pendingCandidateContent: "",
          evaluationFeedback: null,
          scores: null,
        }),

      endInterview: () => set({ endTime: Date.now() }),

      addMessage: (role, content) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              role,
              content,
              timestamp: Date.now(),
            },
          ],
        })),

      appendPendingInterviewer: (text) =>
        set((state) => ({
          pendingInterviewerContent: (state.pendingInterviewerContent + (state.pendingInterviewerContent ? " " : "") + text).trim(),
        })),

      appendPendingCandidate: (text) =>
        set((state) => ({
          pendingCandidateContent: (state.pendingCandidateContent + (state.pendingCandidateContent ? " " : "") + text).trim(),
        })),

      flushPendingInterviewer: () =>
        set((state) => {
          const content = state.pendingInterviewerContent.trim();
          if (!content)
            return { pendingInterviewerContent: "" };
          return {
            messages: [
              ...state.messages,
              { role: "interviewer" as const, content, timestamp: Date.now() },
            ],
            pendingInterviewerContent: "",
          };
        }),

      flushPendingCandidate: () =>
        set((state) => {
          const content = state.pendingCandidateContent.trim();
          if (!content)
            return { pendingCandidateContent: "" };
          return {
            messages: [
              ...state.messages,
              { role: "candidate" as const, content, timestamp: Date.now() },
            ],
            pendingCandidateContent: "",
          };
        }),

      setEvaluationFeedback: (feedback) =>
        set({ evaluationFeedback: feedback }),

      setScores: (scores) => set({ scores }),

      resetInterview: () =>
        set({
          startTime: null,
          endTime: null,
          messages: [],
          pendingInterviewerContent: "",
          pendingCandidateContent: "",
          evaluationFeedback: null,
          scores: null,
        }),
    }),
    {
      name: "interview-storage",
      partialize: (state) => ({
        interviewType: state.interviewType,
        skillLevel: state.skillLevel,
        startTime: state.startTime,
        endTime: state.endTime,
        messages: state.messages,
        evaluationFeedback: state.evaluationFeedback,
        scores: state.scores,
      }),
    }
  )
);
