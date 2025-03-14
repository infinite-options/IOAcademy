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
}

const InterviewTranscript: React.FC = () => {
  const { messages } = useInterviewStore() as InterviewStoreState;

  if (messages.length === 0) {
    return (
      <div className="interview-transcript-empty">No transcript available.</div>
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
      </div>
    </div>
  );
};

export default InterviewTranscript;
