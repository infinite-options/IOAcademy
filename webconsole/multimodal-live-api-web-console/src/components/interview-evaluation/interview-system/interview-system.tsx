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
  type ToolCall,
  type LiveConfig,
  type LiveFunctionCall,
} from "../../../multimodal-live-types";
import { useLoggerStore } from "../../../lib/store-logger";
import { useInterviewStore } from "../../../stores/interviewStore";
import InterviewTranscript from "../interview-transcript/InterviewTranscript";
import "./interview-system.scss";
import { transcribeAudioDeclaration } from "./transcriptionFunction";
import { Tool } from "@google/generative-ai";
import {
  generateAllQuestions,
  saveQuestionBank,
  loadQuestionBank,
  clearQuestionBank,
  hasQuestionBank,
  type QuestionBank,
} from "./questionGenerator";
import { MultimodalLiveClient } from "../../../lib/multimodal-live-client";

// Define a type that includes functionDeclarations
interface FunctionDeclarationTool {
  functionDeclarations: any[];
}

// Type guard to check if a tool is a FunctionDeclarationTool
function hasFunctionDeclarations(tool: any): tool is FunctionDeclarationTool {
  return "functionDeclarations" in tool;
}

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
  const [prompt, setPrompt] = useState<{ systemPrompt: string } | null>(null);
  const [pendingAudioTimestamp, setPendingAudioTimestamp] = useState<
    number | null
  >(null);
  const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [questionBank, setQuestionBank] = useState<QuestionBank | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionGenerationError, setQuestionGenerationError] = useState<
    string | null
  >(null);

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

  // New useEffect to handle configuration with transcribeAudioDeclaration
  useEffect(() => {
    if (!prompt) return;

    // Get existing tools or initialize empty array
    const existingTools = config.tools || [];

    // Check if we already have the transcribeAudioDeclaration
    let alreadyHasDeclaration = false;

    for (const tool of existingTools) {
      if (hasFunctionDeclarations(tool)) {
        const declarations = tool.functionDeclarations;
        if (
          declarations.some(
            (dec) => dec.name === transcribeAudioDeclaration.name
          )
        ) {
          alreadyHasDeclaration = true;
          break;
        }
      }
    }

    if (!alreadyHasDeclaration) {
      // Create new copy of config with updated tools
      let updatedTools;

      // Find if we already have functionDeclarations
      const existingFuncDecIdx = existingTools.findIndex((tool) =>
        hasFunctionDeclarations(tool)
      );

      if (existingFuncDecIdx >= 0) {
        // Update existing functionDeclarations
        updatedTools = [...existingTools];
        const existingTool = updatedTools[
          existingFuncDecIdx
        ] as FunctionDeclarationTool;
        const existingFuncDecs = existingTool.functionDeclarations || [];
        updatedTools[existingFuncDecIdx] = {
          functionDeclarations: [
            ...existingFuncDecs,
            transcribeAudioDeclaration,
          ],
        };
      } else {
        // Add new functionDeclarations tool
        updatedTools = [
          ...existingTools,
          { functionDeclarations: [transcribeAudioDeclaration] },
        ];
      }

      // Create and set the new config
      const newConfig: LiveConfig = {
        ...config,
        systemInstruction: {
          parts: [{ text: prompt.systemPrompt }],
        },
        tools: updatedTools,
      };

      setConfig(newConfig);
    } else {
      // Just update the system prompt if we already have the function declaration
      setConfig({
        ...config,
        systemInstruction: {
          parts: [{ text: prompt.systemPrompt }],
        },
      });
    }
  }, [prompt, config, setConfig]);

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
    setQuestionGenerationError(null);

    // Update interview store
    interviewStore.setInterviewType(type);
    interviewStore.setSkillLevel(level);

    // QUESTION GENERATOR FEATURE DISABLED
    // Using fallback questions from getInitialQuestion() instead
    // To re-enable: uncomment the code below and comment out the simple version
    
    // Simple version: Use fallback questions (no LLM generation)
    const generatedPrompt = generateInterviewPrompt(type, level, null);
    setPrompt(generatedPrompt);
    setInterviewInProgress(true);

    /* QUESTION GENERATOR CODE (DISABLED)
    // Generate questions BEFORE setting up the interview
    setIsGeneratingQuestions(true);
    try {
      // Clear any existing question bank first
      clearQuestionBank();

      // Create a separate client instance for question generation to avoid conflicts
      // Get API key from environment
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("REACT_APP_GEMINI_API_KEY not found");
      }

      const questionGenClient = new MultimodalLiveClient({
        url: undefined, // Use default URL
        apiKey: apiKey,
      });

      console.log("🤖 Starting to generate all interview questions...");
      console.log(`📝 Using model: ${config.model || "default"}`);
      console.log(`📋 Interview type: ${type}, Skill level: ${level}`);

      // Connect the question generation client
      const questionGenConfig: LiveConfig = {
        ...config,
        systemInstruction: {
          parts: [
            {
              text: `You are a technical interview question generator. Generate questions in JSON format only.`,
            },
          ],
        },
      };

      console.log("🔌 Connecting question generation client...");
      await questionGenClient.connect(questionGenConfig);
      console.log("✅ Question generation client connected");
      
      // Wait a moment for the connection to be fully established
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("⏳ Waited for connection stabilization");

      // Generate all questions using LLM (including initial question)
      console.log("🚀 Calling generateAllQuestions...");
      const newQuestionBank = await generateAllQuestions(
        type,
        level,
        questionGenClient,
        questionGenConfig
      );

      console.log("🎉 Question generation completed successfully!");
      console.log(`📊 Generated initial question + ${newQuestionBank.followUpQuestions.length} follow-up questions`);

      // Disconnect the question generation client
      questionGenClient.disconnect();
      console.log("🔌 Question generation client disconnected");

      // Save the question bank
      saveQuestionBank(newQuestionBank);
      setQuestionBank(newQuestionBank);

      // Generate the appropriate prompt with question bank
      const generatedPrompt = generateInterviewPrompt(type, level, newQuestionBank);
      setPrompt(generatedPrompt);

      setInterviewInProgress(true);
    } catch (error: any) {
      console.error("❌ Error generating questions:", error);
      console.error("📋 Error details:", {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      });
      setQuestionGenerationError(
        error.message || "Failed to generate questions. Will use fallback question."
      );
      // Fall back to default behavior with fallback question
      const generatedPrompt = generateInterviewPrompt(type, level, null);
      setPrompt(generatedPrompt);
      setInterviewInProgress(true);
    } finally {
      setIsGeneratingQuestions(false);
      console.log("🏁 Question generation process finished (success or error)");
    }
    */
  };

  // Add a handler for tool calls
  useEffect(() => {
    const handleToolCall = (toolCall: ToolCall) => {
      console.log("Tool call received:", toolCall);

      if (toolCall && toolCall.functionCalls) {
        const functionCall = toolCall.functionCalls.find(
          (fc: LiveFunctionCall) => fc.name === transcribeAudioDeclaration.name
        );

        if (functionCall && functionCall.args) {
          console.log(
            "FUNCTION CALLED with transcription:",
            (functionCall.args as any).transcription
          );

          const args = functionCall.args as { transcription: string };
          const transcription = args.transcription;

          if (transcription && interviewStarted && !isRequestingEvaluation) {
            // Clear the pending audio timestamp when transcription arrives
            setPendingAudioTimestamp(null);

            // Add the transcription to the interview store
            interviewStore.addMessage("candidate", transcription);

            // Respond to the tool call
            client.sendToolResponse({
              functionResponses: [
                {
                  response: { success: true },
                  id: functionCall.id,
                },
              ],
            });
          }
        }
      }
    };

    client.on("toolcall", handleToolCall);
    return () => {
      client.off("toolcall", handleToolCall);
    };
  }, [client, interviewStore, interviewStarted, isRequestingEvaluation]);

  // Handle audio input events
  useEffect(() => {
    const handleAudioContent = () => {
      // Record that we received audio
      const timestamp = Date.now();
      console.log("Audio detected, setting pendingAudioTimestamp:", timestamp);
      setPendingAudioTimestamp(timestamp);

      // Clear any existing timeout
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
      }

      // Set a new timeout
      audioTimeoutRef.current = setTimeout(() => {
        // Check if this is still the latest audio and no transcription was added
        if (pendingAudioTimestamp === timestamp) {
          console.log("Fallback triggered, adding placeholder message");
          interviewStore.addMessage(
            "candidate",
            "[Audio response captured - transcription pending]"
          );
          setPendingAudioTimestamp(null);
        }
      }, 3000); // Wait 3 seconds for transcription
    };

    client.on("audio", handleAudioContent);
    return () => {
      client.off("audio", handleAudioContent);
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
      }
    };
  }, [client, interviewStore, pendingAudioTimestamp]);

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
    // QUESTION GENERATOR DISABLED: Always use fallback question
    if (interviewType && skillLevel) {
      const promptData = generateInterviewPrompt(interviewType, skillLevel, null);
      const initialQuestion = promptData.initialQuestion;
      
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
                : interviewType === "data"
                ? "Data Engineer "
                : interviewType === "python"
                ? "Python Programming "
                : interviewType === "java"
                ? "Java Programming "
                : "Unknown"}
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
                : interviewType === "data"
                ? "Data Engineer Interview "
                : interviewType === "python"
                ? "Python Programming Interview "
                : interviewType === "java"
                ? "Java Programming Interview "
                : "Unknown Interview"}
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
