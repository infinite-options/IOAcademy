// src/components/interview-evaluation/interview-transcript/InterviewTranscript.tsx
import React from "react";
import { useInterviewStore } from "../../../stores/interviewStore";
import "./interview-transcript.scss";

interface Message {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: number;
}

interface InterviewStoreState {
  messages: Message[];
  pendingInterviewerContent: string;
  pendingCandidateContent: string;
}

const InterviewTranscript: React.FC = () => {
  const {
    messages,
    pendingInterviewerContent,
    pendingCandidateContent,
  } = useInterviewStore() as InterviewStoreState;

  const hasAnyContent =
    messages.length > 0 ||
    pendingInterviewerContent.length > 0 ||
    pendingCandidateContent.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="interview-transcript">
        <h3>Interview Transcript</h3>
        <div className="interview-transcript-empty">
          No transcript available.
        </div>
      </div>
    );
  }

  return (
    <div className="interview-transcript">
      <h3>Interview Transcript</h3>
      <div className="transcript-messages">
        {messages.map((message: Message, index: number) => (
          <div
            key={index}
            className={`transcript-message ${
              message.role === "interviewer"
                ? "interviewer-message"
                : "candidate-message"
            }`}
          >
            <div className="message-header">
              <span className="message-role">
                {message.role === "interviewer" ? "Interviewer" : "You"}
              </span>
              <span className="message-time">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        {pendingCandidateContent ? (
          <div
            key="pending-candidate"
            className="transcript-message candidate-message transcript-message--streaming"
          >
            <div className="message-header">
              <span className="message-role">You</span>
              <span className="message-time">...</span>
            </div>
            <div className="message-content">{pendingCandidateContent}</div>
          </div>
        ) : null}
        {pendingInterviewerContent ? (
          <div
            key="pending-interviewer"
            className="transcript-message interviewer-message transcript-message--streaming"
          >
            <div className="message-header">
              <span className="message-role">Interviewer</span>
              <span className="message-time">...</span>
            </div>
            <div className="message-content">{pendingInterviewerContent}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default InterviewTranscript;
