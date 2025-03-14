// Updated src/components/interview-evaluation/interview-system/interview-system.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLiveAPIContext } from "../../../contexts/LiveAPIContext";
import InterviewMenu, {
  InterviewType,
  SkillLevel,
} from "../interview-menu/InterviewMenu";
import { generateInterviewPrompt } from "./interviewPrompts";
import {
  isModelTurn,
  isClientContentMessage,
  ServerContentMessage,
} from "../../../multimodal-live-types";
import { useLoggerStore } from "../../../lib/store-logger";
import { useInterviewStore } from "../../../stores/interviewStore";
import InterviewTranscript from "../interview-transcript/InterviewTranscript";
import "./interview-system.scss";

const InterviewSystem: React.FC = () => {
  const { client, connected, connect, config, setConfig } = useLiveAPIContext();
  const { logs } = useLoggerStore();
  const interviewStore = useInterviewStore();
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
  const [interviewTranscript, setInterviewTranscript] = useState<string | null>(
    null
  );
  const [showTranscript, setShowTranscript] = useState(false);
  const evaluationResponseRef = useRef<string>("");
  const hasGeneratedTranscript = useRef<boolean>(false);

  // Generate transcript from logs - memoized to avoid regenerating unnecessarily
  const generateTranscript = useCallback(() => {
    console.log("Generating transcript from logs:", logs.length);
    let formattedTranscript = "# Interview Transcript\n\n";

    logs.forEach((log) => {
      const timestamp = log.date.toLocaleTimeString();

      try {
        // Handle user messages (client content)
        if (isClientContentMessage(log.message)) {
          const { turns } = log.message.clientContent;
          turns.forEach((turn) => {
            const userText = turn.parts
              .filter((part) => part.text)
              .map((part) => part.text)
              .join(" ");

            if (userText.trim()) {
              formattedTranscript += `[${timestamp}] **Candidate:** ${userText}\n\n`;

              // Also add to interview store for the transcript component
              interviewStore.addMessage("candidate", userText);
            }
          });
        }

        // Handle model responses
        if (
          typeof log.message === "object" &&
          "serverContent" in log.message &&
          log.message.serverContent &&
          "modelTurn" in log.message.serverContent
        ) {
          const modelText = log.message.serverContent.modelTurn.parts
            .filter((part) => part.text)
            .map((part) => part.text)
            .join(" ");

          if (modelText.trim()) {
            formattedTranscript += `[${timestamp}] **Interviewer:** ${modelText}\n\n`;

            // Also add to interview store for the transcript component
            interviewStore.addMessage("interviewer", modelText);
          }
        }
      } catch (err) {
        console.error("Error processing log entry:", err, log);
      }
    });

    return formattedTranscript;
  }, [logs, interviewStore]);

  // Process logs and generate transcript when interview concludes
  useEffect(() => {
    if (
      isRequestingEvaluation &&
      logs.length > 0 &&
      !hasGeneratedTranscript.current
    ) {
      const transcript = generateTranscript();
      console.log(
        "Generated transcript:",
        transcript.substring(0, 100) + "..."
      );

      if (transcript.length > 30) {
        // Ensure the transcript has meaningful content
        setInterviewTranscript(transcript);
        hasGeneratedTranscript.current = true;
      }
    }
  }, [logs, isRequestingEvaluation, generateTranscript]);

  // Modify the function that listens for model responses
  useEffect(() => {
    const handleModelResponse = (content: any) => {
      if (isModelTurn(content)) {
        const responseText = content.modelTurn.parts
          .filter((part: { text?: string }) => part.text)
          .map((part: { text?: string }) => part.text || "")
          .join("");

        // Add interviewer response to the interview store in real-time
        if (
          responseText.trim() &&
          interviewStarted &&
          !isRequestingEvaluation
        ) {
          interviewStore.addMessage("interviewer", responseText);
        }

        // If we're waiting for evaluation, capture this response
        if (isRequestingEvaluation) {
          evaluationResponseRef.current += responseText;
          console.log(
            "Collecting evaluation response:",
            responseText.substring(0, 50) + "..."
          );

          // Check if the response contains evaluation content using more flexible criteria
          if (
            responseText.includes("ASSESSMENT") ||
            responseText.includes("Score:") ||
            responseText.includes("FEEDBACK") ||
            responseText.toLowerCase().includes("evaluation") ||
            responseText.includes("/10") ||
            responseText.toLowerCase().includes("technical") ||
            responseText.toLowerCase().includes("communication")
          ) {
            // Wait for the full response to arrive
            setTimeout(() => {
              console.log(
                "Setting evaluation feedback:",
                evaluationResponseRef.current.substring(0, 100) + "..."
              );
              setEvaluationFeedback(evaluationResponseRef.current);
              interviewStore.setEvaluationFeedback(
                evaluationResponseRef.current
              );

              // Try to extract scores
              const technicalMatch = evaluationResponseRef.current.match(
                /TECHNICAL.+?Score:\s*(\d+)/is
              );
              const communicationMatch = evaluationResponseRef.current.match(
                /COMMUNICATION.+?Score:\s*(\d+)/is
              );

              if (technicalMatch && communicationMatch) {
                interviewStore.setScores({
                  technical: parseInt(technicalMatch[1]),
                  communication: parseInt(communicationMatch[1]),
                });
              }

              setIsRequestingEvaluation(false);
              interviewStore.endInterview();

              // Generate and save transcript if not already done
              if (!hasGeneratedTranscript.current) {
                const transcript = generateTranscript();
                setInterviewTranscript(transcript);
                hasGeneratedTranscript.current = true;
              }
            }, 1000);
          }
        }
      }
    };

    client.on("content", handleModelResponse);
    return () => {
      client.off("content", handleModelResponse);
    };
  }, [
    client,
    isRequestingEvaluation,
    generateTranscript,
    interviewStarted,
    interviewStore,
  ]);

  // Register for turn complete events to handle end of responses
  useEffect(() => {
    const handleTurnComplete = () => {
      if (isRequestingEvaluation && evaluationResponseRef.current) {
        console.log("Turn complete received while waiting for evaluation");
        // Additional check in case the evaluation detection logic missed the content
        setTimeout(() => {
          if (
            isRequestingEvaluation &&
            evaluationResponseRef.current.length > 100
          ) {
            console.log("Forcing evaluation feedback completion");
            setEvaluationFeedback(evaluationResponseRef.current);
            interviewStore.setEvaluationFeedback(evaluationResponseRef.current);
            setIsRequestingEvaluation(false);
            interviewStore.endInterview();

            // Generate and save transcript if not already done
            if (!hasGeneratedTranscript.current) {
              const transcript = generateTranscript();
              setInterviewTranscript(transcript);
              hasGeneratedTranscript.current = true;
            }
          }
        }, 500);
      }
    };

    client.on("turncomplete", handleTurnComplete);
    return () => {
      client.off("turncomplete", handleTurnComplete);
    };
  }, [client, isRequestingEvaluation, generateTranscript, interviewStore]);

  const handleSelectionComplete = async (
    type: InterviewType,
    level: SkillLevel
  ) => {
    setInterviewType(type);
    setSkillLevel(level);

    // Update interview store
    interviewStore.setInterviewType(type);
    interviewStore.setSkillLevel(level);

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

    // Reset evaluation data from previous interviews
    setEvaluationFeedback(null);
    setInterviewTranscript(null);
    setShowTranscript(false);
    evaluationResponseRef.current = "";
    hasGeneratedTranscript.current = false;

    // Reset and start the interview in the store
    interviewStore.resetInterview();
    interviewStore.startInterview();

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
    setEvaluationFeedback(null);
    setInterviewTranscript(null);
    setShowTranscript(false);
    evaluationResponseRef.current = "";
    hasGeneratedTranscript.current = false;

    // Reset the interview store
    interviewStore.resetInterview();
  };

  const toggleTranscriptView = () => {
    setShowTranscript(!showTranscript);
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

      {interviewStarted && !evaluationFeedback && (
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
                evaluationResponseRef.current = ""; // Reset previous evaluation content
                hasGeneratedTranscript.current = false;
                console.log("Requesting evaluation...");
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

          {/* Show live transcript during the interview */}
          <InterviewTranscript />
        </div>
      )}

      {evaluationFeedback && (
        <div className="evaluation-results-container">
          <div className="evaluation-tabs">
            <button
              className={`tab-button ${!showTranscript ? "active" : ""}`}
              onClick={() => setShowTranscript(false)}
            >
              Evaluation
            </button>
            <button
              className={`tab-button ${showTranscript ? "active" : ""}`}
              onClick={() => setShowTranscript(true)}
            >
              Transcript
            </button>
          </div>

          {!showTranscript && (
            <div className="evaluation-feedback-container">
              <h2>Interview Evaluation</h2>
              <div className="feedback-content">
                {evaluationFeedback.split("\n").map((line, index) => {
                  if (
                    line.includes("ASSESSMENT") ||
                    line.includes("FEEDBACK") ||
                    line.startsWith("##")
                  ) {
                    return <h3 key={index}>{line.replace("##", "").trim()}</h3>;
                  } else if (line.includes("Score:") || line.includes("/10")) {
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

          {showTranscript && <InterviewTranscript />}

          <div className="action-buttons">
            <button className="primary-button" onClick={resetInterview}>
              Start New Interview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewSystem;
