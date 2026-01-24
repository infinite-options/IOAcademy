import { InterviewType, SkillLevel } from "../interview-menu/InterviewMenu";
import { MultimodalLiveClient } from "../../../lib/multimodal-live-client";
import { LiveConfig } from "../../../multimodal-live-types";

export interface Question {
  id: number;
  text: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  skillTags: string[];
  expectedSignals: string[];
  followUpHints?: string[];
}

export interface QuestionBank {
  interviewType: InterviewType;
  skillLevel: SkillLevel;
  initialQuestion: string; // The hardcoded initial question
  followUpQuestions: Question[]; // Generated follow-up questions (2-4)
  rubric: string;
  generatedAt: string;
  modelUsed?: string; // Track which model was used
}

const QUESTION_BANK_STORAGE_KEY = "interview_question_bank";

/**
 * Generate a prompt for the question generator LLM
 */
function createQuestionGeneratorPrompt(
  type: InterviewType,
  skillLevel: SkillLevel
): string {
  const difficulty =
    skillLevel <= 3
      ? "beginner"
      : skillLevel <= 7
      ? "intermediate"
      : "advanced";

  const typeDescription = {
    general: "general technical interview",
    frontend: "Front End Engineering position",
    backend: "Backend Engineering position",
    fullstack: "Fullstack Development position",
    data: "Data Engineering position",
    python: "Python programming interview",
    java: "Java programming interview",
  }[type];

  return `You are a technical interview question generator. Your task is to generate ALL interview questions (questions 1, 2, 3, and 4) for a ${typeDescription} interview.

The candidate has self-reported a skill level of ${skillLevel}/10, which corresponds to a ${difficulty} level.

Generate exactly 3-4 questions total that:
1. Are appropriate for ${difficulty} level candidates
2. Progressively increase in complexity or depth
3. Cover different aspects of ${typeDescription} or dive deeper into topics
4. Allow for follow-up questions and deeper exploration
5. Can be answered within a 5-minute interview format
6. Build naturally on the conversation flow

The first question (Question 1) should be an opening question that:
- Introduces the interview topic naturally
- Allows the candidate to demonstrate their background
- Sets the stage for deeper technical exploration

Questions 2-4 should progressively build on the conversation and explore deeper technical areas.

For each question, provide:
- The question text (clear and concise)
- Skill tags (what technical areas it tests)
- Expected signals (what good answers should demonstrate)
- Optional follow-up hints (if candidate struggles)

CRITICAL: You MUST return ONLY valid JSON. Do NOT include any markdown code blocks, explanations, or text outside the JSON object.

Return your response as a JSON object with this EXACT structure (no variations):
{
  "initialQuestion": {
    "id": 1,
    "text": "Initial opening question text here",
    "difficulty": "${difficulty}",
    "skillTags": ["tag1", "tag2"],
    "expectedSignals": ["signal1", "signal2"],
    "followUpHints": ["hint1", "hint2"]
  },
  "followUpQuestions": [
    {
      "id": 2,
      "text": "Follow-up question text here",
      "difficulty": "${difficulty}",
      "skillTags": ["tag1", "tag2"],
      "expectedSignals": ["signal1", "signal2"],
      "followUpHints": ["hint1", "hint2"]
    },
    {
      "id": 3,
      "text": "Next follow-up question text here",
      "difficulty": "${difficulty}",
      "skillTags": ["tag1", "tag2"],
      "expectedSignals": ["signal1", "signal2"],
      "followUpHints": ["hint1", "hint2"]
    }
  ],
  "rubric": "A brief rubric explaining how to evaluate answers to these questions"
}

REQUIREMENTS:
- Generate exactly 1 initial question (id: 1) and 2-3 follow-up questions (id: 2-4)
- Each question MUST have: id, text, difficulty, skillTags (array), expectedSignals (array), followUpHints (array)
- Return ONLY the JSON object, no markdown, no code blocks, no explanations
- Ensure all JSON is valid and properly formatted`;
}

/**
 * Generate all interview questions using LLM (questions 1-4)
 * This replaces the hardcoded initial question - all questions are now generated dynamically
 * 
 * @param type - Interview type (frontend, backend, etc.)
 * @param skillLevel - Candidate skill level (1-10)
 * @param client - A separate MultimodalLiveClient instance (to avoid conflicts with main interview)
 * @param config - LiveConfig with model settings
 * @returns QuestionBank with initial question and follow-up questions
 * 
 * NOTE: The model used is specified in config.model (typically "models/gemini-2.5-flash-native-audio-preview-12-2025")
 * Generated questions are saved to localStorage and automatically downloaded as JSON to your Downloads folder
 */
export async function generateAllQuestions(
  type: InterviewType,
  skillLevel: SkillLevel,
  client: MultimodalLiveClient,
  config: LiveConfig
): Promise<QuestionBank> {
  return new Promise((resolve, reject) => {
    const prompt = createQuestionGeneratorPrompt(type, skillLevel);
    let fullResponse = "";
    let hasReceivedContent = false;
    const timeout = setTimeout(() => {
      if (!hasReceivedContent) {
        client.off("content", onContent);
        client.off("turncomplete", onTurnComplete);
        reject(new Error("Timeout: No response received from question generation LLM after 30 seconds"));
      }
    }, 30000); // 30 second timeout

    console.log("📤 Sending question generation prompt to LLM...");
    console.log("📋 Prompt preview:", prompt.substring(0, 200) + "...");

    // Set up event handlers
    const onContent = (content: any) => {
      hasReceivedContent = true;
      if (content.modelTurn?.parts) {
        const text = content.modelTurn.parts
          .filter((part: any) => part.text)
          .map((part: any) => part.text)
          .join("");
        fullResponse += text;
        console.log("📥 Received content chunk, total length:", fullResponse.length);
      }
    };

    const onTurnComplete = async () => {
      clearTimeout(timeout);
      console.log("✅ Turn complete, total response length:", fullResponse.length);
      console.log("📝 Full response preview:", fullResponse.substring(0, 500));
      
      // Save raw response for debugging
      const rawResponseForDebug = fullResponse;
      
      try {
        // Clean up the response - remove markdown code blocks if present
        let cleanedResponse = fullResponse.trim();
        
        // Remove markdown code blocks
        cleanedResponse = cleanedResponse.replace(/^```json\s*/i, "");
        cleanedResponse = cleanedResponse.replace(/^```\s*/i, "");
        cleanedResponse = cleanedResponse.replace(/\s*```$/i, "");
        cleanedResponse = cleanedResponse.trim();
        
        // Try to extract JSON if there's text before/after
        // Look for JSON object boundaries
        const jsonStart = cleanedResponse.indexOf("{");
        const jsonEnd = cleanedResponse.lastIndexOf("}");
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
        }
        
        // Remove any leading/trailing non-JSON text
        cleanedResponse = cleanedResponse.trim();
        
        console.log("🧹 Cleaned response length:", cleanedResponse.length);
        console.log("🧹 Cleaned response preview:", cleanedResponse.substring(0, 300));

        // Parse the JSON response
        let parsed: any;
        try {
          parsed = JSON.parse(cleanedResponse);
        } catch (parseError) {
          // Try to fix common JSON issues
          console.log("⚠️ First parse attempt failed, trying to fix JSON...");
          
          // Remove any trailing commas before closing braces/brackets
          cleanedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, "$1");
          
          // Try parsing again
          parsed = JSON.parse(cleanedResponse);
        }

        // Determine difficulty level
        const difficultyLevel =
          skillLevel <= 3
            ? "beginner"
            : skillLevel <= 7
            ? "intermediate"
            : "advanced";

        // Get the model name from config
        const modelUsed = config.model || "unknown";

        // Extract initial question
        let initialQuestionObj: any = null;
        if (parsed.initialQuestion) {
          initialQuestionObj = parsed.initialQuestion;
        } else if (parsed.question1) {
          initialQuestionObj = parsed.question1;
        } else if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions[0]) {
          initialQuestionObj = parsed.questions[0];
        }
        
        if (!initialQuestionObj || !initialQuestionObj.text) {
          throw new Error(`No valid initial question found in response. Response structure: ${JSON.stringify(Object.keys(parsed))}`);
        }
        
        const initialQuestionText = initialQuestionObj.text || initialQuestionObj.question || initialQuestionObj.content || "";
        
        // Validate and extract follow-up questions array
        let questionsArray: any[] = [];
        
        if (Array.isArray(parsed.followUpQuestions)) {
          questionsArray = parsed.followUpQuestions;
        } else if (Array.isArray(parsed.questions) && parsed.questions.length > 1) {
          // Skip first question if it's in the questions array (we already extracted it)
          questionsArray = parsed.questions.slice(1);
        } else if (parsed.followUpQuestions && typeof parsed.followUpQuestions === 'object') {
          // Handle case where it's an object with numeric keys
          questionsArray = Object.values(parsed.followUpQuestions);
        } else {
          console.warn("⚠️ No follow-up questions array found in expected format, checking entire response structure...");
          console.warn("📋 Parsed keys:", Object.keys(parsed));
          
          // Last resort: try to find any array in the response
          for (const key in parsed) {
            if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
              const firstItem = parsed[key][0];
              if (firstItem && (firstItem.text || firstItem.question)) {
                // If it's the questions array and has more than 1, use the rest as follow-ups
                if (key === 'questions' && parsed[key].length > 1) {
                  questionsArray = parsed[key].slice(1);
                } else {
                  questionsArray = parsed[key];
                }
                console.log(`✅ Found questions array in key: ${key}`);
                break;
              }
            }
          }
        }
        
        console.log(`📊 Found initial question and ${questionsArray.length} follow-up questions in response`);

        // Validate and structure the question bank
        const questionBank: QuestionBank = {
          interviewType: type,
          skillLevel: skillLevel,
          initialQuestion: initialQuestionText,
          followUpQuestions: questionsArray.map((q: any, index: number) => {
            // Handle different possible field names
            const questionText = q.text || q.question || q.content || "";
            const questionId = q.id || (index + 2); // Start from 2 since 1 is the initial question
            
            if (!questionText) {
              console.warn(`⚠️ Question ${questionId} missing text field. Available keys:`, Object.keys(q));
            }
            
            return {
              id: questionId,
              text: questionText || `Question ${questionId} (text missing)`,
              difficulty: q.difficulty || difficultyLevel,
              skillTags: Array.isArray(q.skillTags) ? q.skillTags : (q.skillTags ? [q.skillTags] : (q.tags || q.skills || [])),
              expectedSignals: Array.isArray(q.expectedSignals) ? q.expectedSignals : (q.expectedSignals ? [q.expectedSignals] : (q.signals || q.expected || [])),
              followUpHints: Array.isArray(q.followUpHints) ? q.followUpHints : (q.followUpHints ? [q.followUpHints] : (q.hints || q.hint || [])),
            };
          }),
          rubric: parsed.rubric || parsed.evaluationRubric || parsed.rubricText || "Evaluate based on technical accuracy, problem-solving approach, and communication clarity.",
          generatedAt: new Date().toISOString(),
          modelUsed: modelUsed,
        };

        // Clean up event listeners
        client.off("content", onContent);
        client.off("turncomplete", onTurnComplete);

        console.log("✅ Successfully parsed question bank with", questionBank.followUpQuestions.length, "follow-up questions");
        console.log("📋 Questions:", questionBank.followUpQuestions.map(q => `Q${q.id}: ${q.text.substring(0, 50)}...`));

        resolve(questionBank);
      } catch (error: any) {
        clearTimeout(timeout);
        console.error("❌ Error parsing question bank:", error);
        console.error("📄 Raw response (first 1000 chars):", fullResponse.substring(0, 1000));
        console.error("📄 Raw response (last 500 chars):", fullResponse.substring(Math.max(0, fullResponse.length - 500)));
        console.error("📄 Full raw response:", fullResponse);
        
        // Save the raw response to localStorage for debugging
        try {
          localStorage.setItem("question_generation_error_response", JSON.stringify({
            error: error.message,
            rawResponse: fullResponse,
            timestamp: new Date().toISOString(),
            interviewType: type,
            skillLevel: skillLevel
          }));
          console.log("💾 Saved error response to localStorage key: question_generation_error_response");
        } catch (saveError) {
          console.error("Failed to save error response:", saveError);
        }
        
        client.off("content", onContent);
        client.off("turncomplete", onTurnComplete);
        reject(
          new Error(
            `Failed to parse question bank: ${error.message || error}. Raw response length: ${fullResponse.length} chars. Check console for full response and localStorage key 'question_generation_error_response' for details.`
          )
        );
      }
    };

    // Wait for setupcomplete before sending
    const onSetupComplete = () => {
      console.log("✅ Setup complete, sending question generation prompt...");
      client.off("setupcomplete", onSetupComplete);
      
      // Set up listeners
      client.on("content", onContent);
      client.on("turncomplete", onTurnComplete);

      // Send the prompt
      client.send([{ text: prompt }]);
      console.log("📤 Prompt sent to LLM");
    };

    // Set up listeners
    client.on("setupcomplete", onSetupComplete);
    
    // Also set up content and turncomplete listeners in case setupcomplete already fired
    client.on("content", onContent);
    client.on("turncomplete", onTurnComplete);
    
    // Try sending immediately (in case setup is already complete)
    // But also listen for setupcomplete
    setTimeout(() => {
      if (!hasReceivedContent) {
        console.log("⏳ Sending prompt (setup should be complete by now)...");
        client.send([{ text: prompt }]);
      }
    }, 1000);
  });
}

/**
 * Save question bank to localStorage and download as JSON file
 */
export function saveQuestionBank(questionBank: QuestionBank): void {
  // Save to localStorage
  localStorage.setItem(QUESTION_BANK_STORAGE_KEY, JSON.stringify(questionBank));

  // Create a downloadable JSON file
  const jsonString = JSON.stringify(questionBank, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.download = `question-bank-${questionBank.interviewType}-level${questionBank.skillLevel}-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log("Question bank saved and downloaded:", questionBank);
  console.log(`📁 Questions saved to: ${link.download} (check your Downloads folder)`);
  console.log(`🤖 Model used: ${questionBank.modelUsed || "unknown"}`);
}

/**
 * Load question bank from localStorage
 */
export function loadQuestionBank(): QuestionBank | null {
  const stored = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as QuestionBank;
  } catch (error) {
    console.error("Error loading question bank:", error);
    return null;
  }
}

/**
 * Clear question bank from storage
 */
export function clearQuestionBank(): void {
  localStorage.removeItem(QUESTION_BANK_STORAGE_KEY);
  console.log("Question bank cleared");
}

/**
 * Check if a question bank exists for the given type and level
 */
export function hasQuestionBank(
  type: InterviewType,
  skillLevel: SkillLevel
): boolean {
  const bank = loadQuestionBank();
  return (
    bank !== null &&
    bank.interviewType === type &&
    bank.skillLevel === skillLevel
  );
}

