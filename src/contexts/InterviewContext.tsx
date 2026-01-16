/**
 * Interview Context for managing interview state
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  InterviewSession,
  Question,
  Evaluation,
  SessionState,
  DifficultyLevel,
  FeedbackResponse,
} from "../types/interview";
import { interviewAPI, APIError } from "../services/api/client";

interface InterviewContextType {
  // State
  session: InterviewSession | null;
  currentQuestion: Question | null;
  currentQuestionNumber: number | null;
  currentEvaluation: Evaluation | null;
  isLoading: boolean;
  error: string | null;
  feedback: FeedbackResponse | null;

  // Actions
  startInterview: (candidateName?: string) => Promise<void>;
  getNextQuestion: () => Promise<void>;
  submitAnswer: (answer: string) => Promise<boolean>; // Returns true if more questions available
  getFeedback: () => Promise<void>;
  cancelInterview: () => Promise<void>;
  clearError: () => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(
  undefined
);

const STORAGE_KEY = "interview_session";

function createEmptySession(
  sessionId: string,
  candidateName: string = "Anonymous"
): InterviewSession {
  return {
    sessionId,
    candidateName,
    state: "not_started",
    startTime: null,
    endTime: null,
    currentDifficulty: "medium",
    questionsAsked: [],
    answersGiven: [],
    scores: [],
    topicCoverage: {},
    topicScores: {},
    askedQuestionIds: new Set(),
    currentQuestion: null,
  };
}

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(
    null
  );
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number | null>(null);
  const [currentEvaluation, setCurrentEvaluation] =
    useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert askedQuestionIds from array back to Set
        if (parsed.askedQuestionIds) {
          parsed.askedQuestionIds = new Set(parsed.askedQuestionIds);
        }
        // Convert dates
        if (parsed.startTime) parsed.startTime = new Date(parsed.startTime);
        if (parsed.endTime) parsed.endTime = new Date(parsed.endTime);
        setSession(parsed);
      }
    } catch (e) {
      console.error("Failed to load session from storage:", e);
    }
  }, []);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (session) {
      try {
        // Convert Set to array for JSON serialization
        const toStore = {
          ...session,
          askedQuestionIds: Array.from(session.askedQuestionIds),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch (e) {
        console.error("Failed to save session to storage:", e);
      }
    }
  }, [session]);

  const startInterview = useCallback(async (candidateName?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await interviewAPI.startInterview({ candidate_name: candidateName });
      const newSession = createEmptySession(
        response.session_id,
        candidateName || "Anonymous"
      );
      newSession.state = response.status as SessionState;
      newSession.startTime = new Date();
      setSession(newSession);
      setCurrentQuestion(null);
      setCurrentEvaluation(null);
      setFeedback(null);
    } catch (e) {
      const message =
        e instanceof APIError ? e.detail || e.message : "Failed to start interview";
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getNextQuestion = useCallback(async () => {
    if (!session) {
      throw new Error("No active session");
    }

    // Don't allow getting more questions if interview is completed
    if (session.state === "completed") {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await interviewAPI.getQuestion(session.sessionId);
      setCurrentQuestion(response.question);
      setCurrentQuestionNumber(response.question_number);
      setCurrentEvaluation(null);
      
      // Update session state
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          state: response.session_status as SessionState,
          currentQuestion: response.question,
        };
      });
    } catch (e) {
      if (e instanceof APIError && e.status === 404) {
        // No more questions - interview complete
        setSession((prev) => {
          if (!prev) return null;
          return { ...prev, state: "completed", endTime: new Date() };
        });
        setCurrentQuestion(null);
        setCurrentQuestionNumber(null);
        setError(null); // Not really an error
        // Don't throw - this is expected when interview is complete
        return;
      } else {
        const message =
          e instanceof APIError ? e.detail || e.message : "Failed to get question";
        setError(message);
        throw e;
      }
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const submitAnswer = useCallback(
    async (answer: string): Promise<boolean> => {
      if (!session) {
        throw new Error("No active session");
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await interviewAPI.submitAnswer(session.sessionId, {
          answer,
        });

        setCurrentEvaluation(response.evaluation);

        // Update session with answer and score
        setSession((prev) => {
          if (!prev || !currentQuestion) return null;

          const updatedSession = { ...prev };
          updatedSession.questionsAsked.push(currentQuestion);
          updatedSession.answersGiven.push(answer);
          updatedSession.scores.push(response.evaluation.score);
          updatedSession.askedQuestionIds.add(currentQuestion.id);
          updatedSession.currentDifficulty =
            response.session_status === "completed"
              ? prev.currentDifficulty
              : (prev.currentDifficulty as DifficultyLevel);
          updatedSession.state = response.session_status as SessionState;

          // Update topic coverage
          const topic = currentQuestion.topic;
          updatedSession.topicCoverage[topic] =
            (updatedSession.topicCoverage[topic] || 0) + 1;

          // Update topic scores
          if (!updatedSession.topicScores[topic]) {
            updatedSession.topicScores[topic] = [];
          }
          updatedSession.topicScores[topic].push(response.evaluation.score);

          if (response.session_status === "completed") {
            updatedSession.endTime = new Date();
          }

          return updatedSession;
        });

        setCurrentQuestion(null);
        setCurrentQuestionNumber(null);
        return response.next_question_available;
      } catch (e) {
        const message =
          e instanceof APIError ? e.detail || e.message : "Failed to submit answer";
        setError(message);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [session, currentQuestion]
  );

  const getFeedback = useCallback(async () => {
    if (!session) {
      throw new Error("No active session");
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await interviewAPI.getFeedback(session.sessionId);
      setFeedback(response);
    } catch (e) {
      const message =
        e instanceof APIError ? e.detail || e.message : "Failed to get feedback";
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const cancelInterview = useCallback(async () => {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await interviewAPI.cancelInterview(session.sessionId);
      localStorage.removeItem(STORAGE_KEY);
      setSession(null);
      setCurrentQuestion(null);
      setCurrentEvaluation(null);
      setFeedback(null);
    } catch (e) {
      const message =
        e instanceof APIError ? e.detail || e.message : "Failed to cancel interview";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <InterviewContext.Provider
      value={{
        session,
        currentQuestion,
        currentQuestionNumber,
        currentEvaluation,
        isLoading,
        error,
        feedback,
        startInterview,
        getNextQuestion,
        submitAnswer,
        getFeedback,
        cancelInterview,
        clearError,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (context === undefined) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }
  return context;
};

