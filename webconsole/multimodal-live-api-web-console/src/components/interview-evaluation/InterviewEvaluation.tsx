// src/components/interview-evaluation/InterviewEvaluation.tsx
import React, { useState } from "react";
import { useLoggerStore } from "../../lib/store-logger";
import {
  isClientContentMessage,
  isServerContentMessage,
  isModelTurn,
} from "../../multimodal-live-types";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import "./interview-evaluation.scss";

export type EvaluationResult = {
  programmingScore: number;
  socialScore: number;
  programmingFeedback: string;
  socialFeedback: string;
  overallFeedback: string;
};

const InterviewEvaluation: React.FC = () => {
  const { logs } = useLoggerStore();
  const { client } = useLiveAPIContext();
  const [transcript, setTranscript] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null);

  // Function to generate transcript from logs
  const generateTranscript = () => {
    let formattedTranscript = "# Interview Transcript\n\n";

    logs.forEach((log) => {
      const timestamp = log.date.toLocaleTimeString();

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
          }
        });
      }

      // Handle model responses
      if (isServerContentMessage(log.message)) {
        const { serverContent } = log.message;
        if (isModelTurn(serverContent)) {
          const modelText = serverContent.modelTurn.parts
            .filter((part) => part.text)
            .map((part) => part.text)
            .join(" ");

          if (modelText.trim()) {
            formattedTranscript += `[${timestamp}] **Interviewer:** ${modelText}\n\n`;
          }
        }
      }
    });

    return formattedTranscript;
  };

  // Function to evaluate the transcript
  const evaluateInterview = async () => {
    setIsEvaluating(true);

    const generatedTranscript = generateTranscript();
    setTranscript(generatedTranscript);

    const evaluationPrompt = `
You are evaluating a technical interview for a React developer position. The interview transcript is provided below. 
Please score the candidate in two areas:
1. Programming Skills (1-10): Assess technical knowledge, problem-solving ability, understanding of React concepts.
2. Social Skills (1-10): Evaluate communication clarity, engagement, professionalism, and interpersonal aptitude.

For each area, provide:
- A numerical score (1-10)
- Specific feedback with examples from the transcript
- Suggestions for improvement

End with a brief overall assessment.

Format your response as JSON:
{
  "programmingScore": <score>,
  "socialScore": <score>,
  "programmingFeedback": "<detailed feedback>",
  "socialFeedback": "<detailed feedback>",
  "overallFeedback": "<overall assessment>"
}

Here is the interview transcript:
${generatedTranscript}
`;

    try {
      // We need to set up a way to capture the response from the model
      // Let's create a promise that will resolve when we get a complete response
      let modelResponse = "";

      const responsePromise = new Promise<string>((resolve) => {
        const onModelTurn = (content: any) => {
          if (isModelTurn(content)) {
            const text = content.modelTurn.parts
              .filter((part) => part.text)
              .map((part) => part.text)
              .join("");

            modelResponse += text;
          }
        };

        const onTurnComplete = () => {
          client.off("content", onModelTurn);
          client.off("turncomplete", onTurnComplete);
          resolve(modelResponse);
        };

        client.on("content", onModelTurn);
        client.on("turncomplete", onTurnComplete);
      });

      // Send the evaluation prompt to the model
      client.send([{ text: evaluationPrompt }]);

      // Wait for the complete response
      const response = await responsePromise;

      // Parse the JSON response
      try {
        const result = JSON.parse(response) as EvaluationResult;
        setEvaluationResult(result);
      } catch (e) {
        console.error("Failed to parse evaluation result:", e);
        // If parsing fails, try to extract scores using regex as fallback
        const programmingScoreMatch = response.match(
          /programming\s*score\s*:\s*(\d+)/i
        );
        const socialScoreMatch = response.match(/social\s*score\s*:\s*(\d+)/i);

        if (programmingScoreMatch && socialScoreMatch) {
          setEvaluationResult({
            programmingScore: parseInt(programmingScoreMatch[1]),
            socialScore: parseInt(socialScoreMatch[1]),
            programmingFeedback: "See full response for details",
            socialFeedback: "See full response for details",
            overallFeedback: response,
          });
        }
      }
    } catch (error) {
      console.error("Error during evaluation:", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="interview-evaluation">
      <h2>Interview Evaluation</h2>

      {!evaluationResult && !isEvaluating && (
        <div className="evaluation-controls">
          <p>
            Complete the interview then click the button below to evaluate the
            candidate.
          </p>
          <button
            className="evaluate-button"
            onClick={evaluateInterview}
            disabled={logs.length === 0}
          >
            Evaluate Interview
          </button>
        </div>
      )}

      {isEvaluating && (
        <div className="evaluation-loading">
          <p>Analyzing interview data...</p>
          <div className="loading-spinner"></div>
        </div>
      )}

      {evaluationResult && (
        <div className="evaluation-results">
          <h3>Evaluation Results</h3>

          <div className="score-cards">
            <div className="score-card">
              <h4>Programming Skills</h4>
              <div className="score-value">
                {evaluationResult.programmingScore}/10
              </div>
              <div className="score-feedback">
                <h5>Feedback:</h5>
                <p>{evaluationResult.programmingFeedback}</p>
              </div>
            </div>

            <div className="score-card">
              <h4>Social Skills</h4>
              <div className="score-value">
                {evaluationResult.socialScore}/10
              </div>
              <div className="score-feedback">
                <h5>Feedback:</h5>
                <p>{evaluationResult.socialFeedback}</p>
              </div>
            </div>
          </div>

          <div className="overall-feedback">
            <h4>Overall Assessment</h4>
            <p>{evaluationResult.overallFeedback}</p>
          </div>

          <button
            className="reset-button"
            onClick={() => {
              setEvaluationResult(null);
              setTranscript("");
            }}
          >
            Back to Interview
          </button>

          <button
            className="export-button"
            onClick={() => {
              const evaluationData = {
                transcript,
                evaluation: evaluationResult,
              };
              const dataStr = JSON.stringify(evaluationData, null, 2);
              const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
                dataStr
              )}`;

              const exportLink = document.createElement("a");
              exportLink.setAttribute("href", dataUri);
              exportLink.setAttribute(
                "download",
                `interview-evaluation-${new Date().toISOString()}.json`
              );
              document.body.appendChild(exportLink);
              exportLink.click();
              document.body.removeChild(exportLink);
            }}
          >
            Export Results
          </button>
        </div>
      )}

      {transcript && (
        <div className="transcript-container">
          <h3>Interview Transcript</h3>
          <pre className="transcript">{transcript}</pre>
        </div>
      )}
    </div>
  );
};

export default InterviewEvaluation;
