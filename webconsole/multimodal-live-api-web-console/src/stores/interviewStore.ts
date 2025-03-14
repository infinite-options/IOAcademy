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

  // Evaluation
  evaluationFeedback: string | null;
  scores: EvaluationScores | null;

  // Actions
  setInterviewType: (type: InterviewType | null) => void;
  setSkillLevel: (level: SkillLevel | null) => void;
  startInterview: () => void;
  endInterview: () => void;
  addMessage: (role: MessageRole, content: string) => void;
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

      setEvaluationFeedback: (feedback) =>
        set({ evaluationFeedback: feedback }),

      setScores: (scores) => set({ scores }),

      resetInterview: () =>
        set({
          startTime: null,
          endTime: null,
          messages: [],
          evaluationFeedback: null,
          scores: null,
        }),
    }),
    {
      name: "interview-storage", // unique name for localStorage
    }
  )
);
