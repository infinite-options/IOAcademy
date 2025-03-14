// src/utils/evaluationParser.ts
interface EvaluationScores {
  technical: number;
  communication: number;
}

export function parseEvaluationScores(
  evaluationText: string
): EvaluationScores | null {
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
