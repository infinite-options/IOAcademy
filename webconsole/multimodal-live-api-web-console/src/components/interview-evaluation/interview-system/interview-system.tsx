// src/components/interview-evaluation/interview-system/InterviewSystem.tsx
import React, { useState, useEffect } from "react";
import { useLiveAPIContext } from "../../../contexts/LiveAPIContext";
import InterviewMenu, {
  InterviewType,
  SkillLevel,
} from "../interview-menu/InterviewMenu";
import { generateInterviewPrompt } from "./interviewPrompts";
import { isModelTurn } from "../../../multimodal-live-types";
import "./interview-system.scss";

const InterviewSystem: React.FC = () => {
  const { client, connected, connect, config, setConfig } = useLiveAPIContext();
  const [interviewType, setInterviewType] = useState<InterviewType | null>(
    null
  );
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);
  const [interviewInProgress, setInterviewInProgress] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [evaluationFeedback, setEvaluationFeedback] = useState<string | null>(
    null
  );
  const [isRequestingEvaluation, setIsRequestingEvaluation] = useState(false);

  // Modify the function that listens for model responses
  useEffect(() => {
    const handleModelResponse = (content: any) => {
      if (isModelTurn(content)) {
        const responseText = content.modelTurn.parts
          .filter((part: { text?: string }) => part.text)
          .map((part: { text?: string }) => part.text || "")
          .join("");

        // If we're waiting for evaluation, capture this response as feedback
        if (
          isRequestingEvaluation &&
          (responseText.includes("TECHNICAL SKILLS ASSESSMENT") ||
            responseText.includes("Score:") ||
            responseText.toLowerCase().includes("evaluation"))
        ) {
          setEvaluationFeedback(responseText);
          setIsRequestingEvaluation(false);
        }
      }
    };

    client.on("content", handleModelResponse);
    return () => {
      client.off("content", handleModelResponse);
    };
  }, [client, isRequestingEvaluation]);

  const handleSelectionComplete = async (
    type: InterviewType,
    level: SkillLevel
  ) => {
    setInterviewType(type);
    setSkillLevel(level);

    // Generate the appropriate prompt
    const prompt = generateInterviewPrompt(type, level);

    // Configure the AI with the appropriate system prompt
    setConfig({
      ...config,
      systemInstruction: {
        parts: [{ text: prompt.systemPrompt }],
      },
    });

    setInterviewInProgress(true);
  };

  const startInterview = async () => {
    if (!connected) {
      await connect();
    }

    // Start the interview with the initial question
    if (interviewType && skillLevel) {
      const initialQuestion = generateInterviewPrompt(
        interviewType,
        skillLevel
      ).initialQuestion;
      client.send([{ text: "QUESTION TO ASK: " + initialQuestion }]);
      setInterviewStarted(true);
    }
  };

  const resetInterview = () => {
    setInterviewType(null);
    setSkillLevel(null);
    setInterviewInProgress(false);
    setInterviewStarted(false);
  };

  return (
    <div className="interview-system">
      {!interviewInProgress && (
        <InterviewMenu onSelectionComplete={handleSelectionComplete} />
      )}

      {interviewInProgress && !interviewStarted && (
        <div className="interview-preparation">
          <h2>Interview Setup Complete</h2>

          <div className="interview-details">
            <p>
              <strong>Interview Type:</strong>{" "}
              {interviewType === "general"
                ? "General Interview "
                : interviewType === "frontend"
                ? "Front End Engineer "
                : interviewType === "backend"
                ? "Backend Engineer "
                : interviewType === "fullstack"
                ? "Fullstack Developer "
                : "Data Engineer "}
            </p>
            <p>
              <strong>Starting Difficulty Level:</strong> {skillLevel}/10
            </p>
          </div>

          <p className="instructions">
            When you click "Start Interview", the system will begin with
            questions appropriate for your selected skill level. The AI
            interviewer will adjust difficulty based on your responses. At the
            end, you'll receive a comprehensive evaluation of your performance.
          </p>

          <div className="action-buttons">
            <button className="secondary-button" onClick={resetInterview}>
              Change Selection
            </button>
            <button className="primary-button" onClick={startInterview}>
              Start Interview
            </button>
          </div>
        </div>
      )}

      {interviewStarted && (
        <div className="interview-in-progress">
          <div className="interview-header">
            <div className="interview-type">
              {interviewType === "general"
                ? "General Interview  "
                : interviewType === "frontend"
                ? "Front End Engineer Interview "
                : interviewType === "backend"
                ? "Backend Engineer Interview "
                : interviewType === "fullstack"
                ? "Fullstack Developer Interview "
                : "Data Engineer Interview "}
            </div>
            <button
              className="end-interview-button"
              onClick={() => {
                setIsRequestingEvaluation(true);
                client.send([
                  {
                    text: `
It's time to conclude this interview. Please provide a comprehensive evaluation of my performance with the following format:

## TECHNICAL SKILLS ASSESSMENT
[Score: X/10]
[Detailed feedback with specific examples from my responses]

## COMMUNICATION ASSESSMENT
[Score: X/10] 
[Feedback on clarity, engagement, and professionalism]

## OVERALL FEEDBACK
[Summary assessment and improvement recommendations]

Please be specific and actionable in your feedback, referencing particular responses or techniques I demonstrated.`,
                  },
                ]);
              }}
            >
              End Interview & Get Feedback
            </button>
          </div>
        </div>
      )}

      {evaluationFeedback && (
        <div className="evaluation-feedback-container">
          <h2>Interview Evaluation</h2>
          <div className="feedback-content">
            {evaluationFeedback.split("\n").map((line, index) => {
              if (
                line.startsWith("##") ||
                line.includes("ASSESSMENT") ||
                line.includes("FEEDBACK")
              ) {
                return <h3 key={index}>{line.replace("##", "")}</h3>;
              } else if (line.includes("Score:")) {
                return (
                  <div className="score-line" key={index}>
                    {line}
                  </div>
                );
              } else {
                return <p key={index}>{line}</p>;
              }
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewSystem;
