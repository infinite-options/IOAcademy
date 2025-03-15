// src/components/interview-evaluation/interview-system/transcriptionFunction.ts
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const transcribeAudioDeclaration: FunctionDeclaration = {
  name: "add_candidate_response",
  description:
    "Adds a transcribed candidate response to the interview transcript.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      transcription: {
        type: SchemaType.STRING,
        description: "The transcribed text from the candidate's audio response",
      },
    },
    required: ["transcription"],
  },
};
