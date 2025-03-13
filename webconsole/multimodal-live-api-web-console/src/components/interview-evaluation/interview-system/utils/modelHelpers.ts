// src/components/interview-evaluation/interview-system/modelhelpers.ts

import { Part } from "@google/generative-ai";
import { MultimodalLiveClient } from "../../../../lib/multimodal-live-client";
import { isModelTurn } from "../../../../multimodal-live-types";
import { InterviewType, SkillLevel } from "../../interview-menu/InterviewMenu";

/**
 * Formats a question to be sent to the model in a way that indicates
 * it should ask this question to the candidate
 */
export function formatQuestionForModel(question: string): string {
  return `QUESTION TO ASK: ${question}`;
}

/**
 * Sends a question to the model in the correct format
 */
export function sendQuestionToModel(
  client: MultimodalLiveClient,
  question: string
): void {
  client.send([{ text: formatQuestionForModel(question) }]);
}

/**
 * Formats and sends an evaluation request to the model
 */
export function requestEvaluation(client: MultimodalLiveClient): void {
  const evaluationPrompt = `
It's time to conclude this interview. Please provide a comprehensive evaluation of my performance with the following format:

## TECHNICAL SKILLS ASSESSMENT
Score: X/10
[Detailed feedback with specific examples from my responses]

## COMMUNICATION ASSESSMENT
Score: X/10 
[Feedback on clarity, engagement, and professionalism]

## OVERALL FEEDBACK
[Summary assessment and improvement recommendations]

Please be specific and actionable in your feedback, referencing particular responses or techniques I demonstrated.`;

  client.send([{ text: evaluationPrompt }]);
}

/**
 * Helper to extract text from model response parts
 */
export function extractTextFromParts(parts: Part[]): string {
  return parts
    .filter((part) => part.text)
    .map((part) => part.text)
    .join("");
}

/**
 * Checks if a response appears to be an evaluation
 */
export function isEvaluationResponse(text: string): boolean {
  return (
    text.includes("TECHNICAL SKILLS ASSESSMENT") ||
    text.includes("COMMUNICATION ASSESSMENT") ||
    (text.includes("Score:") && text.includes("FEEDBACK"))
  );
}

/**
 * Parses evaluation text to extract scores
 * Returns null if scores can't be extracted
 */
export function parseEvaluationScores(
  evaluationText: string
): { technical: number; communication: number } | null {
  try {
    const technicalMatch = evaluationText.match(
      /TECHNICAL SKILLS ASSESSMENT[\s\S]*?Score:\s*(\d+)/i
    );
    const communicationMatch = evaluationText.match(
      /COMMUNICATION ASSESSMENT[\s\S]*?Score:\s*(\d+)/i
    );

    if (technicalMatch && communicationMatch) {
      return {
        technical: parseInt(technicalMatch[1]),
        communication: parseInt(communicationMatch[1]),
      };
    }
    return null;
  } catch (e) {
    console.error("Error parsing evaluation scores:", e);
    return null;
  }
}

/**
 * Formats evaluation text for display by adding HTML formatting
 */
export function formatEvaluationForDisplay(evaluationText: string): string {
  // Replace section headers with styled headers
  let formatted = evaluationText
    .replace(
      /##\s*TECHNICAL SKILLS ASSESSMENT/g,
      "<h3>TECHNICAL SKILLS ASSESSMENT</h3>"
    )
    .replace(
      /##\s*COMMUNICATION ASSESSMENT/g,
      "<h3>COMMUNICATION ASSESSMENT</h3>"
    )
    .replace(/##\s*OVERALL FEEDBACK/g, "<h3>OVERALL FEEDBACK</h3>")
    // Format score lines
    .replace(/(Score:\s*\d+\/10)/g, '<div class="score-line">$1</div>')
    // Convert newlines to paragraphs
    .split("\n\n")
    .map((para) => (para.trim() ? `<p>${para}</p>` : ""))
    .join("");

  return formatted;
}

/**
 * Listens for model responses and calls the provided callback when evaluation is received
 */
export function setupEvaluationListener(
  client: MultimodalLiveClient,
  onEvaluationReceived: (text: string) => void
): () => void {
  const handleModelResponse = (content: any) => {
    if (isModelTurn(content)) {
      const responseText = extractTextFromParts(content.modelTurn.parts);

      if (isEvaluationResponse(responseText)) {
        onEvaluationReceived(responseText);
      }
    }
  };

  client.on("content", handleModelResponse);

  // Return cleanup function
  return () => {
    client.off("content", handleModelResponse);
  };
}

/**
 * Creates a complete prompt for a specific interview type and skill level
 */
export function createCompletePrompt(
  interviewType: InterviewType,
  skillLevel: SkillLevel
): string {
  const promptBase = `You are conducting a technical interview for a ${getInterviewTypeLabel(
    interviewType
  )} position. Your role is to ASK QUESTIONS to the candidate and evaluate their responses. This is a SHORT, 5-MINUTE INTERVIEW FORMAT.

IMPORTANT: 
- When you receive a message that starts with "QUESTION TO ASK:", understand that this is a question you should present to the candidate, not answer yourself.
- Limit yourself to 3-4 focused questions total to respect the 5-minute format.
- After 3-4 question exchanges or when the candidate requests evaluation, you MUST provide a formal evaluation.
- Your evaluation MUST follow this exact format:

## TECHNICAL SKILLS ASSESSMENT
Score: [1-10]/10
[Your detailed feedback here]

## COMMUNICATION ASSESSMENT
Score: [1-10]/10
[Your feedback on communication here]

## OVERALL FEEDBACK
[Your summary and recommendations here]`;

  const skillLevelGuidance = getSkillLevelGuidance(skillLevel);
  return promptBase + skillLevelGuidance;
}

/**
 * Helper function to get readable label for interview type
 */
function getInterviewTypeLabel(type: InterviewType): string {
  switch (type) {
    case "general":
      return "General Technical";
    case "frontend":
      return "Front End Engineer";
    case "backend":
      return "Backend Engineer";
    case "fullstack":
      return "Fullstack Developer";
    case "data":
      return "Data Engineer";
    default:
      return "Technical";
  }
}

/**
 * Helper function to get skill level guidance
 */
function getSkillLevelGuidance(skillLevel: SkillLevel): string {
  if (skillLevel <= 3) {
    return `\n\nThe candidate has identified as a BEGINNER (skill level ${skillLevel}/10). Adjust your questions accordingly:
- Focus on fundamental concepts and basic implementations
- Provide additional context and guidance when needed
- Evaluate based on clarity of understanding core principles`;
  } else if (skillLevel <= 7) {
    return `\n\nThe candidate has identified as INTERMEDIATE (skill level ${skillLevel}/10). Adjust your questions accordingly:
- Include practical scenarios and some optimization challenges
- Evaluate based on both knowledge and practical application
- Look for ability to explain trade-offs between approaches`;
  } else {
    return `\n\nThe candidate has identified as ADVANCED/EXPERT (skill level ${skillLevel}/10). Adjust your questions accordingly:
- Present complex scenarios and advanced optimization challenges
- Evaluate based on deep technical knowledge and system design skills
- Look for sophisticated understanding of edge cases and trade-offs`;
  }
}
