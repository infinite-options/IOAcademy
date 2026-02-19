// Updated src/components/interview-evaluation/interview-system/interview-system.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
import { Tool, GoogleGenerativeAI } from "@google/generative-ai";
import {
  generateAllQuestions,
  saveQuestionBank,
  loadQuestionBank,
  clearQuestionBank,
  hasQuestionBank,
  type QuestionBank,
} from "./questionGenerator";
import { MultimodalLiveClient } from "../../../lib/multimodal-live-client";
import { parseEvaluationScores } from "./utils/modelHelpers";

// Define a type that includes functionDeclarations
interface FunctionDeclarationTool {
  functionDeclarations: any[];
}

// Type guard to check if a tool is a FunctionDeclarationTool
function hasFunctionDeclarations(tool: any): tool is FunctionDeclarationTool {
  return "functionDeclarations" in tool;
}

const InterviewSystem: React.FC = () => {
  const { client, connected, connect, disconnect, config, setConfig } =
    useLiveAPIContext();
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
  const [questionsAsked, setQuestionsAsked] = useState<number>(0);
  const [numQuestions, setNumQuestions] = useState<number>(3);
  const [showEndInterviewPopup, setShowEndInterviewPopup] = useState(false);
  const endInterviewPopupShownRef = useRef(false);
  const waitingForLastAnswerRef = useRef(false);
  const modelTurnsCompletedRef = useRef(0);
  const hasSyncedCandidateFromLogsRef = useRef(false);
  const lastProcessedPromptRef = useRef<string | null>(null);

  // Generate transcript: sync candidate from logs (once), then build from store (spoken + candidate only; no modelTurn/chain of thought)
  const generateTranscript = useCallback(() => {
    if (!hasSyncedCandidateFromLogsRef.current) {
      hasSyncedCandidateFromLogsRef.current = true;
      logs.forEach((log) => {
        try {
          if (isClientContentMessage(log.message)) {
            const { turns } = log.message.clientContent;
            turns.forEach((turn) => {
              const userText = turn.parts
                .filter((part) => part.text)
                .map((part) => part.text)
                .join(" ")
                .trim();
              if (userText) interviewStore.addMessage("candidate", userText);
            });
          }
        } catch (err) {
          console.error("Error processing log for transcript:", err);
        }
      });
    }
    const messages = interviewStore.messages;
    let formattedTranscript = "# Interview Transcript\n\n";
    messages.forEach((m: { role: string; content: string; timestamp: number }) => {
      const timestamp = new Date(m.timestamp).toLocaleTimeString();
      const who = m.role === "candidate" ? "Candidate" : "Interviewer";
      formattedTranscript += `[${timestamp}] **${who}:** ${m.content}\n\n`;
    });
    return formattedTranscript;
  }, [logs, interviewStore]);

  // Regenerate prompt when numQuestions changes (user can change it on setup screen)
  useEffect(() => {
    if (interviewInProgress && interviewType && skillLevel) {
      const generatedPrompt = generateInterviewPrompt(
        interviewType,
        skillLevel,
        null,
        numQuestions
      );
      setPrompt(generatedPrompt);
    }
  }, [interviewInProgress, interviewType, skillLevel, numQuestions]);

  // New useEffect to handle configuration with transcribeAudioDeclaration
  useEffect(() => {
    if (!prompt) return;

    // Check if the prompt has already been applied to avoid infinite loops
    const currentSystemPrompt = config.systemInstruction?.parts?.[0]?.text || "";
    if (currentSystemPrompt === prompt.systemPrompt) {
      // Prompt is already applied, no need to update
      return;
    }

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

      // Create and set the new config (outputAudioTranscription = spoken text only, no chain of thought)
      // Audio-native model requires responseModalities + speechConfig for voice output
      const newConfig: LiveConfig = {
        ...config,
        systemInstruction: {
          parts: [{ text: prompt.systemPrompt }],
        },
        tools: updatedTools,
        generationConfig: {
          ...config.generationConfig,
          responseModalities: "audio",
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
        },
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      };

      setConfig(newConfig);
      lastProcessedPromptRef.current = prompt.systemPrompt;
    } else {
      // Just update the system prompt if we already have the function declaration
      setConfig({
        ...config,
        systemInstruction: {
          parts: [{ text: prompt.systemPrompt }],
        },
        generationConfig: {
          ...config.generationConfig,
          responseModalities: "audio",
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
        },
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      });
      lastProcessedPromptRef.current = prompt.systemPrompt;
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

        // Question counting is done in turnComplete handler (using spoken text only).
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

  // Helper: is this spoken text a question (not evaluation)?
  const isSpokenQuestion = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return false;
    const hasQuestion = t.includes("?") ||
      /\b(what|how|why|when|where|can you|could you|would you|explain|describe|tell me|walk me through|discuss|give me|talk about|think about)\b/i.test(t);
    const isEval = /evaluation|assessment|score:|feedback|## TECHNICAL|## COMMUNICATION|## OVERALL/i.test(t);
    return hasQuestion && !isEval;
  }, []);

  // Stream outputTranscription word-by-word into same bubble; flush candidate when model starts, flush both on turncomplete
  // Count questions here (once per turn, using spoken text only) instead of in modelTurn (which streams and can include chain of thought)
  useEffect(() => {
    const handleOutputTranscription = (text: string) => {
      if (interviewStarted && !isRequestingEvaluation && text.trim()) {
        // Check if this text contains <user_transcript> tags and extract them
        const userTranscriptMatch = text.match(/<user_transcript>([\s\S]*?)<\/user_transcript>/);
        
        if (userTranscriptMatch) {
          // Extract the user transcript content
          const userTranscript = userTranscriptMatch[1].trim();
          
          // Remove the <user_transcript> tags from the model's response
          const modelResponse = text.replace(/<user_transcript>[\s\S]*?<\/user_transcript>\s*/g, '').trim();
          
          // Replace the live transcription with the corrected one
          // Clear any pending candidate content (live transcription) and replace with corrected version
          if (userTranscript) {
            console.log("📝 Extracted user transcript, replacing live transcription:", userTranscript);
            // Clear the pending candidate content (live transcription) - this removes it from the bubble
            interviewStore.clearPendingCandidate();
            // Add the corrected transcript as a candidate message - this shows in the user's bubble
            interviewStore.addMessage("candidate", userTranscript);
          }
          
          // Add only the model's response (without user transcript) to interviewer
          if (modelResponse) {
            interviewStore.appendPendingInterviewer(modelResponse);
          }
        } else {
          // No user transcript in this text - model is responding but hasn't included user transcript yet
          // Don't flush pendingCandidate yet - keep showing live transcription until corrected version arrives
          // Just add the model's response
          interviewStore.appendPendingInterviewer(text.trim());
        }
      }
    };
    const handleTurnCompleteForBuffers = () => {
      const state = useInterviewStore.getState();
      const pendingCandidate = state.pendingCandidateContent?.trim() || "";
      const pendingInterviewer = state.pendingInterviewerContent?.trim() || "";

      // Show popup when user has answered the Nth question (candidate content arrives via inputTranscription → flush)
      if (
        interviewStarted &&
        !isRequestingEvaluation &&
        pendingCandidate &&
        waitingForLastAnswerRef.current &&
        !endInterviewPopupShownRef.current
      ) {
        waitingForLastAnswerRef.current = false;
        endInterviewPopupShownRef.current = true;
        setShowEndInterviewPopup(true);
        console.log("📊 End-interview popup shown (user answered last question)");
      }

      modelTurnsCompletedRef.current += 1;
      if (
        interviewStarted &&
        !isRequestingEvaluation &&
        modelTurnsCompletedRef.current > 1 &&
        isSpokenQuestion(pendingInterviewer)
      ) {
        setQuestionsAsked((prev) => {
          const newCount = prev + 1;
          console.log(`📊 Question ${newCount} asked (from spoken text)`);
          if (newCount >= numQuestions && !endInterviewPopupShownRef.current) {
            waitingForLastAnswerRef.current = true;
            console.log("📊 Waiting for user to answer last question");
          }
          return newCount;
        });
      }
      // Only flush pendingCandidateContent if it hasn't been replaced by a corrected transcript
      // The corrected transcript from <user_transcript> already cleared pendingCandidateContent
      // So if there's still pending content, it means no corrected transcript arrived - flush it
      if (pendingCandidate.trim()) {
        interviewStore.flushPendingCandidate();
      }
      interviewStore.flushPendingInterviewer();
    };
    client.on("outputTranscription", handleOutputTranscription);
    client.on("turncomplete", handleTurnCompleteForBuffers);
    return () => {
      client.off("outputTranscription", handleOutputTranscription);
      client.off("turncomplete", handleTurnCompleteForBuffers);
    };
  }, [client, interviewStore, interviewStarted, isRequestingEvaluation, isSpokenQuestion, numQuestions]);

  // Stream inputTranscription word-by-word into same bubble; flush when model starts or on turncomplete
  useEffect(() => {
    const handleInputTranscription = (text: string) => {
      if (interviewStarted && !isRequestingEvaluation && text.trim()) {
        interviewStore.appendPendingCandidate(text.trim());
        // Show popup as soon as user starts answering the last question
        if (waitingForLastAnswerRef.current && !endInterviewPopupShownRef.current) {
          waitingForLastAnswerRef.current = false;
          endInterviewPopupShownRef.current = true;
          setShowEndInterviewPopup(true);
          console.log("📊 End-interview popup shown (user started answering last question)");
        }
      }
    };
    client.on("inputTranscription", handleInputTranscription);
    return () => {
      client.off("inputTranscription", handleInputTranscription);
    };
  }, [client, interviewStore, interviewStarted, isRequestingEvaluation]);

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

            // Show end-interview popup when user has answered the Nth question
            if (waitingForLastAnswerRef.current && !endInterviewPopupShownRef.current) {
              waitingForLastAnswerRef.current = false;
              endInterviewPopupShownRef.current = true;
              setShowEndInterviewPopup(true);
            }

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
    // Always disconnect and reconnect to ensure we have the latest config/prompt
    // This is necessary because the WebSocket connection uses the config from when it was established
    if (connected) {
      await disconnect();
    }
    
    // Ensure prompt is set with current interview type and level BEFORE connecting
    // This ensures the useEffect processes it and updates the config
    if (interviewType && skillLevel) {
      const promptData = generateInterviewPrompt(interviewType, skillLevel, null, numQuestions);
      console.log("🔧 [START INTERVIEW] Setting prompt for:", interviewType, "level", skillLevel);
      console.log("🔧 [START INTERVIEW] Prompt includes user_transcript:", promptData.systemPrompt.includes("<user_transcript>"));
      setPrompt(promptData);
      // Wait for React to process the state update and useEffect to run
      // This ensures config.systemInstruction is updated before we connect
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log("🔧 [START INTERVIEW] Config after prompt update:", config.systemInstruction?.parts?.[0]?.text?.includes("<user_transcript>"));
    }

    // Now connect with the updated config (which includes the new prompt with user_transcript instructions)
    console.log("🔧 [START INTERVIEW] Connecting with config that includes user_transcript:", config.systemInstruction?.parts?.[0]?.text?.includes("<user_transcript>"));
    await connect();

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
      const promptData = generateInterviewPrompt(interviewType, skillLevel, null, numQuestions);
      const initialQuestion = promptData.initialQuestion;
      
      // Count the initial question
      setQuestionsAsked(1);
      console.log(`📊 Starting interview with question 1`);
      
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
    setQuestionsAsked(0);
    setShowEndInterviewPopup(false);
    endInterviewPopupShownRef.current = false;
    waitingForLastAnswerRef.current = false;
    modelTurnsCompletedRef.current = 0;
    hasSyncedCandidateFromLogsRef.current = false;
    lastProcessedPromptRef.current = null;

    // Reset the interview store (clears pending content too)
    interviewStore.resetInterview();
  };

  const toggleTranscriptView = () => {
    setShowTranscript(!showTranscript);
  };

  const requestEvaluation = useCallback(async () => {
    try {
      setIsRequestingEvaluation(true);

      // Close the live interview WebSocket – we're done with the voice model
      if (connected) {
        await disconnect();
      }

      // Build a transcript from the current interview store messages
      const messages = interviewStore.messages;
      let transcriptText = "# Interview Transcript\n\n";

      messages.forEach((m) => {
        const timestamp = new Date(m.timestamp).toLocaleTimeString();
        const who = m.role === "candidate" ? "Candidate" : "Interviewer";
        transcriptText += `[${timestamp}] **${who}:** ${m.content}\n\n`;
      });

      // Store transcript locally for the Transcript tab
      setInterviewTranscript(transcriptText);
      hasGeneratedTranscript.current = true;

      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      if (!apiKey) {
        console.error("REACT_APP_GEMINI_API_KEY not found");
        throw new Error("Missing API key for evaluation model");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "models/gemini-3-flash-preview",
      });

      const interviewTypeLabel =
        interviewType === "frontend"
          ? "Front End Engineering"
          : interviewType === "backend"
          ? "Backend Engineering"
          : interviewType === "fullstack"
          ? "Fullstack Development"
          : interviewType === "data"
          ? "Data Engineering"
          : interviewType === "python"
          ? "Python Programming"
          : interviewType === "java"
          ? "Java Programming"
          : "General Technical";

      const levelLabel =
        skillLevel !== null ? `${skillLevel}/10` : "unspecified level";

      const evaluationPrompt = `
You are an expert technical interview evaluator.

You will receive the full transcript of a live technical interview between an AI interviewer and a human candidate.

- Interview type: ${interviewTypeLabel}
- Candidate self-reported skill level: ${levelLabel}

Your job is to read the entire transcript carefully and then provide a structured evaluation of the candidate's performance.

TRANSCRIPT (markdown format):

${transcriptText}

Now provide a comprehensive evaluation of the candidate with the following exact structure and headings:

## TECHNICAL SKILLS ASSESSMENT
Score: X/10
[Detailed feedback with specific examples from the transcript]

## COMMUNICATION ASSESSMENT
Score: X/10
[Feedback on clarity, engagement, and professionalism, with examples]

## OVERALL FEEDBACK
[Summary assessment and specific improvement recommendations]

CRITICAL:
- Use the exact section headings above.
- Always include a numeric score out of 10 in both assessment sections.
- Reference specific moments or themes from the transcript in your feedback.
`;

      const result = await model.generateContent([{ text: evaluationPrompt }]);
      const responseText = result.response.text();

      setEvaluationFeedback(responseText);
      interviewStore.setEvaluationFeedback(responseText);

      const parsedScores = parseEvaluationScores(responseText);
      if (parsedScores) {
        interviewStore.setScores(parsedScores);
      }

      interviewStore.endInterview();
    } catch (error) {
      console.error("Error during evaluation with gemini-3-flash-preview:", error);
      setEvaluationFeedback(
        "Sorry, we were unable to generate an evaluation. Please try again in a moment."
      );
    } finally {
      setIsRequestingEvaluation(false);
    }
  }, [
    connected,
    disconnect,
    interviewStore,
    interviewType,
    skillLevel,
  ]);

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
            <p>
              <strong>Number of questions:</strong>{" "}
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="num-questions-select"
                aria-label="Number of questions"
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </p>
          </div>

          <p className="instructions">
            When you click &quot;Start Interview&quot;, the system will begin with
            questions appropriate for your selected skill level. The AI
            interviewer will ask up to {numQuestions} question{numQuestions === 1 ? "" : "s"} before
            offering to end the interview. You can also end early with the button below. At the
            end, you&apos;ll receive a comprehensive evaluation of your performance.
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
          {/* Loading overlay when evaluation is being generated */}
          {isRequestingEvaluation && (
            <div className="evaluation-loading-overlay" role="status" aria-live="polite">
              <div className="evaluation-loading-content">
                <div className="evaluation-loading-spinner" aria-hidden="true" />
                <h2 className="evaluation-loading-title">Interview complete</h2>
                <p className="evaluation-loading-message">
                  Generating your evaluation and feedback…
                </p>
                <p className="evaluation-loading-hint">This usually takes a few seconds.</p>
              </div>
            </div>
          )}

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
              onClick={requestEvaluation}
              disabled={isRequestingEvaluation}
            >
              End Interview & Get Feedback
            </button>
          </div>

          {/* Show live transcript during the interview */}
          <InterviewTranscript />
        </div>
      )}

      {showEndInterviewPopup &&
        createPortal(
          <div className="interview-system">
            <div className="end-interview-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="end-interview-popup-title">
              <div className="end-interview-popup">
                <h2 id="end-interview-popup-title">End interview?</h2>
                <p>You&apos;ve had {questionsAsked} question{questionsAsked === 1 ? "" : "s"}. Do you want to end the interview and get feedback?</p>
                <div className="end-interview-popup-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setShowEndInterviewPopup(false);
                      requestEvaluation();
                    }}
                  >
                    Yes, end interview
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowEndInterviewPopup(false)}
                  >
                    No, continue
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
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
