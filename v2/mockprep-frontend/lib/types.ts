export interface Topic {
  id: string;
  label: string;
}

export interface DomainItem {
  label: string;
  icon: string;
  topics: Topic[];
}

export interface CategoryGroup {
  label: string;
  items: Record<string, DomainItem>;
}

export interface Difficulty {
  id: string;
  label: string;
  desc: string;
  color: string;
}

export interface Duration {
  value: number;
  label: string;
  desc: string;
}

export type LengthMode = "duration" | "questions";

export interface InterviewConfig {
  domain: string;
  category: string;
  topics: string[];
  difficulty: string;
  lengthMode: LengthMode;
  duration: number | null;       // set when lengthMode = "duration"
  questionCount: number | null;  // set when lengthMode = "questions"
}

// Room metadata sent to the LiveKit agent
export interface RoomMetadata {
  domain: string;
  topics: string[];
  difficulty: string;
  length_mode: LengthMode;
  duration?: number;
  question_count?: number;
}

export interface ScoreEntry {
  question_number: number;
  question_text: string;
  scores: Record<string, number>;
  strengths: string[];
  improvements: string[];
  difficulty_at_time: string;
}

export interface InterviewFeedback {
  type: "interview_complete";
  overall_score: number;
  category_averages: Record<string, number>;
  questions: ScoreEntry[];
  difficulty_progression: string[];
  overall_strengths: string[];
  areas_to_improve: string[];
  recommended_next: {
    difficulty: string;
    focus_areas: string[];
  };
}

export interface TranscriptMessage {
  role: "agent" | "user";
  text: string;
  time: Date;
  isFinal?: boolean;
}
