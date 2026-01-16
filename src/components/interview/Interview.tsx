/**
 * Main Interview Component
 */

import React, { useEffect, useState } from "react";
import { useInterview } from "../../contexts/InterviewContext";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useVoiceInterview } from "../../hooks/use-voice-interview";
import QuestionDisplay from "./QuestionDisplay";
import EvaluationDisplay from "./EvaluationDisplay";
import SessionSummary from "./SessionSummary";
import InterviewControls from "./InterviewControls";
import "./interview.scss";

const Interview: React.FC = () => {
  const {
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
  } = useInterview();

  const { client, connected, connect, disconnect } = useLiveAPIContext();
  const {
    isListening,
    transcription,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    clearTranscription,
  } = useVoiceInterview();
  const [candidateName, setCandidateName] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);

  // Auto-request feedback when interview completes
  useEffect(() => {
    if (session?.state === "completed" && !feedback && !isLoading) {
      getFeedback().catch(console.error);
    }
  }, [session?.state, feedback, isLoading, getFeedback]);

  // Update answer text when transcription changes (voice mode)
  useEffect(() => {
    if (voiceMode && transcription && isWaitingForAnswer) {
      setAnswerText(transcription.trim());
    }
  }, [transcription, voiceMode, isWaitingForAnswer]);

  // Speak question when it's received (voice mode)
  useEffect(() => {
    if (voiceMode && currentQuestion && isWaitingForAnswer && !isSpeaking && connected) {
      const qNum = currentQuestionNumber || (session?.questionsAsked.length || 0) + 1;
      const questionText = `Question ${qNum}: ${currentQuestion.question}`;
      
      // Wait a bit for connection to be fully ready, then speak
      const timer = setTimeout(async () => {
        try {
          await speak(questionText);
          // Start listening after speaking is done
          setTimeout(() => {
            startListening();
          }, 1000);
        } catch (err) {
          console.error("Failed to speak question:", err);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, voiceMode, isWaitingForAnswer, currentQuestionNumber, session, speak, startListening, isSpeaking, connected]);

  const handleStart = async () => {
    try {
      await startInterview(candidateName || undefined);
      // Configure Gemini Live API for interview mode
      // This will be enhanced later with voice interaction
    } catch (e) {
      console.error("Failed to start interview:", e);
    }
  };

  const handleGetQuestion = async () => {
    try {
      await getNextQuestion();
      setIsWaitingForAnswer(true);
      setAnswerText("");
      clearTranscription();
      
      // If voice mode, speak the question (handled by useEffect)
      // The useEffect will handle speaking when question is set and connected
    } catch (e) {
      console.error("Failed to get question:", e);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) {
      return;
    }

    try {
      const hasMore = await submitAnswer(answerText.trim());
      setIsWaitingForAnswer(false);
      setAnswerText("");

      // If no more questions, interview is complete
      if (!hasMore) {
        // State will be updated to "completed" by the context
        // Feedback will be auto-fetched by useEffect
      }
    } catch (e) {
      console.error("Failed to submit answer:", e);
    }
  };

  // Show start screen
  if (!session || session.state === "not_started") {
    return (
      <div className="interview-container">
        <div className="interview-start">
          <h2>Start Interview</h2>
          <div className="start-form">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="candidate-name-input"
            />
            <button
              onClick={handleStart}
              disabled={isLoading}
              className="start-button"
            >
              {isLoading ? "Starting..." : "Start Interview"}
            </button>
          </div>
          {error && (
            <div className="error-message">
              {error}
              <button onClick={clearError}>×</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show summary if completed
  if (session.state === "completed" && feedback) {
    return (
      <div className="interview-container">
        <SessionSummary feedback={feedback} session={session} />
        <InterviewControls onCancel={cancelInterview} />
      </div>
    );
  }

  // Main interview flow
  return (
    <div className="interview-container">
      <div className="interview-header">
        <h2>Interview Session</h2>
        <div className="session-info">
          <span>Candidate: {session.candidateName}</span>
          <span>
            Question: {currentQuestionNumber || session.questionsAsked.length + (currentQuestion ? 1 : 0)} of 3
          </span>
          <span>Difficulty: {session.currentDifficulty}</span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={clearError}>×</button>
        </div>
      )}

      {currentQuestion && (
        <QuestionDisplay
          question={currentQuestion}
          questionNumber={currentQuestionNumber || session.questionsAsked.length + 1}
          totalQuestions={3}
        />
      )}

      {currentEvaluation && (
        <EvaluationDisplay evaluation={currentEvaluation} />
      )}

      {isWaitingForAnswer && currentQuestion && (
        <div className="answer-section">
          <div className="voice-mode-toggle">
            <label>
              <input
                type="checkbox"
                checked={voiceMode}
                onChange={async (e) => {
                  setVoiceMode(e.target.checked);
                  if (e.target.checked && !connected) {
                    try {
                      await connect();
                      // Wait a moment for audio worklet to initialize
                      await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (err) {
                      console.error("Failed to enable voice mode:", err);
                      setVoiceMode(false);
                    }
                  }
                }}
              />
              Voice Mode
            </label>
          </div>

          {voiceMode && (
            <div className="voice-status">
              {isListening && (
                <div className="listening-indicator">
                  <span className="pulse-dot"></span>
                  Listening...
                </div>
              )}
              {isSpeaking && (
                <div className="speaking-indicator">
                  <span className="pulse-dot"></span>
                  Speaking...
                </div>
              )}
              {transcription && (
                <div className="transcription-preview">
                  <strong>Your answer:</strong> {transcription}
                </div>
              )}
            </div>
          )}

          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder={voiceMode ? "Your answer will appear here as you speak..." : "Type your answer here..."}
            rows={6}
            className="answer-input"
            disabled={voiceMode && isListening}
          />
          <div className="answer-actions">
            {voiceMode && isListening && (
              <button
                onClick={() => {
                  stopListening();
                  handleSubmitAnswer();
                }}
                disabled={!answerText.trim() && !transcription.trim()}
                className="submit-button"
              >
                {isLoading ? "Submitting..." : "Submit Answer"}
              </button>
            )}
            {(!voiceMode || !isListening) && (
              <button
                onClick={handleSubmitAnswer}
                disabled={(!answerText.trim() && !transcription.trim()) || isLoading}
                className="submit-button"
              >
                {isLoading ? "Submitting..." : "Submit Answer"}
              </button>
            )}
          </div>
        </div>
      )}

      {!currentQuestion && 
       !isWaitingForAnswer && 
       session.state === "in_progress" && (
        <div className="question-actions">
          <button
            onClick={handleGetQuestion}
            disabled={isLoading}
            className="get-question-button"
          >
            {isLoading ? "Loading..." : "Get Next Question"}
          </button>
        </div>
      )}

      {session.state === "completed" && !feedback && (
        <div className="completing-message">
          <p>Interview complete! Generating feedback...</p>
        </div>
      )}

      <InterviewControls onCancel={cancelInterview} />
    </div>
  );
};

export default Interview;

