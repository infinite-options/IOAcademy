/**
 * TypeScript types for interview system
 * Matching Python backend API models
 */

export type DifficultyLevel = "easy" | "medium" | "hard";
export type SessionState = "not_started" | "in_progress" | "completed" | "cancelled";

export interface Question {
  id: string;
  question: string;
  difficulty: DifficultyLevel;
  topic: string;
  key_points?: string[];
}

export interface Rubric {
  difficulty: DifficultyLevel;
  evaluation_criteria: {
    [key: string]: {
      weight: number;
      description: string;
    };
  };
}

export interface Evaluation {
  score: number; // 0.0 - 1.0
  strengths: string[];
  weaknesses: string[];
  key_points_covered: string[];
  key_points_missing: string[];
  explanation: string;
}

export interface InterviewSession {
  sessionId: string;
  candidateName: string;
  state: SessionState;
  startTime: Date | null;
  endTime: Date | null;
  currentDifficulty: DifficultyLevel;
  questionsAsked: Question[];
  answersGiven: string[];
  scores: number[];
  topicCoverage: Record<string, number>;
  topicScores: Record<string, number[]>;
  askedQuestionIds: Set<string>;
  currentQuestion: Question | null;
}

// API Request/Response Types
export interface StartInterviewRequest {
  candidate_name?: string;
}

export interface StartInterviewResponse {
  session_id: string;
  status: string;
  message: string;
}

export interface QuestionResponse {
  question: Question;
  question_number: number;
  total_questions: number;
  session_status: string;
}

export interface SubmitAnswerRequest {
  answer: string;
}

export interface EvaluationResponse {
  evaluation: Evaluation;
  next_question_available: boolean;
  session_status: string;
  question_number: number;
  total_questions: number;
}

export interface SessionStatusResponse {
  session_id: string;
  status: string;
  current_difficulty: string | null;
  questions_asked: number;
  total_questions: number;
  overall_score: number | null;
}

export interface FeedbackResponse {
  feedback: {
    overall_assessment?: string;
    strengths?: string[];
    weaknesses?: string[];
    recommendations?: string[];
    [key: string]: any;
  };
  final_scores: {
    overall_score?: number;
    topic_scores?: Record<string, number>;
    [key: string]: any;
  };
  session_id: string;
}

export interface ErrorResponse {
  error: string;
  detail?: string;
}

