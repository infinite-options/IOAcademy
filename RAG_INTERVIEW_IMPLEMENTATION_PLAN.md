# RAG Interview System Implementation Plan

## Overview
This document outlines the plan to implement a RAG (Retrieval-Augmented Generation) based interview system in the React/TypeScript application, similar to the Python implementation in `python-interview/`. The system will use Gemini's Live API for real-time voice-based interviews with adaptive difficulty and intelligent question selection.

## Architecture Comparison

### Python Implementation (Reference)
- **Backend**: FastAPI server with Python
- **RAG**: FAISS vector indices with sentence-transformers embeddings
- **LLM**: Ollama/OpenAI for evaluation
- **Interface**: CLI/Web API
- **Storage**: JSON files, optional SQLite

### React/TypeScript Implementation (Target)
- **Frontend**: React with TypeScript
- **RAG**: Client-side or backend service (TBD)
- **LLM**: Gemini Live API (already integrated)
- **Interface**: Real-time voice + visual UI
- **Storage**: Browser localStorage/IndexedDB, optional backend sync

## Key Differences & Considerations

1. **RAG Implementation Location**
   - **Option A**: Client-side (browser) - Use WebAssembly or JavaScript embeddings
   - **Option B**: Backend service - Create Node.js/Express API similar to Python version
   - **Option C**: Hybrid - Embeddings on backend, retrieval logic in frontend
   - **Recommendation**: Start with Option B for better performance and security

2. **Real-time Voice Integration**
   - Python version: Text-based CLI
   - React version: Voice input/output via Gemini Live API
   - Need to handle: Speech-to-text, text-to-speech, real-time evaluation

3. **State Management**
   - Python: In-memory session objects
   - React: React Context/State + localStorage persistence

## Implementation Plan

### Phase 1: Data Structure & Types

#### 1.1 TypeScript Types (`src/types/interview.ts`)
```typescript
// Question structure
interface Question {
  id: string;
  question: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  key_points: string[];
}

// Rubric structure
interface Rubric {
  difficulty: "easy" | "medium" | "hard";
  evaluation_criteria: {
    [key: string]: {
      weight: number;
      description: string;
    };
  };
}

// Evaluation result
interface Evaluation {
  score: number; // 0.0 - 1.0
  strengths: string[];
  weaknesses: string[];
  key_points_covered: string[];
  key_points_missing: string[];
  explanation: string;
}

// Session state
interface InterviewSession {
  sessionId: string;
  candidateName: string;
  state: "not_started" | "in_progress" | "completed" | "cancelled";
  startTime: Date | null;
  endTime: Date | null;
  currentDifficulty: "easy" | "medium" | "hard";
  questionsAsked: Question[];
  answersGiven: string[];
  scores: number[];
  topicCoverage: Record<string, number>;
  topicScores: Record<string, number[]>;
  askedQuestionIds: Set<string>;
  currentQuestion: Question | null;
}
```

#### 1.2 Data Files
- Create `public/data/questions/` directory
- Create `public/data/rubrics/` directory
- Copy/adapt JSON structure from Python version

### Phase 2: RAG System

#### 2.1 Embedding Service
**Decision Point**: Where to run embeddings?

**Option A: Backend Service (Recommended)**
- Create Node.js/Express backend
- Use `@xenova/transformers` (JavaScript port of transformers)
- Or use Gemini's embedding API
- Endpoint: `POST /api/rag/embed` - returns embeddings

**Option B: Client-side**
- Use `@xenova/transformers` in browser
- Slower but no backend needed
- Bundle size consideration (~50-100MB)

**Recommendation**: Start with Gemini Embedding API (simpler, no model download)

#### 2.2 Vector Store
**Options**:
- **IndexedDB**: Store embeddings in browser
- **Backend Database**: PostgreSQL with pgvector, or simple in-memory
- **Hybrid**: Cache in IndexedDB, sync with backend

**Initial Implementation**: In-memory in backend, IndexedDB for caching

#### 2.3 Retriever Component (`src/services/rag/retriever.ts`)
```typescript
class Retriever {
  async retrieveQuestions(
    query: string,
    topic?: string,
    difficulty?: string,
    topK?: number,
    excludeIds?: string[]
  ): Promise<Question[]>
  
  async retrieveRubric(
    difficulty: string,
    questionType?: string
  ): Promise<Rubric | null>
}
```

### Phase 3: Interview Orchestration

#### 3.1 Interview Context (`src/contexts/InterviewContext.tsx`)
- Manage interview session state
- Provide interview controls (start, submit answer, get next question)
- Persist to localStorage

#### 3.2 Interview Orchestrator (`src/services/interview/orchestrator.ts`)
```typescript
class InterviewOrchestrator {
  initializeSession(candidateName?: string): InterviewSession
  selectNextQuestion(session: InterviewSession): Question | null
  processAnswer(
    session: InterviewSession,
    question: Question,
    answer: string,
    score: number
  ): void
  adjustDifficulty(current: string, score: number): string
}
```

#### 3.3 Adaptive Difficulty (`src/services/interview/adaptive.ts`)
- Same logic as Python version
- Score thresholds: >0.8 increase, <0.5 decrease, else maintain

### Phase 4: Evaluation System

#### 4.1 Evaluation Service (`src/services/evaluation/evaluator.ts`)
**Key Challenge**: Gemini Live API is for real-time conversation, not structured evaluation

**Solution Options**:
1. **Function Calling**: Use Gemini's function calling to get structured evaluation
2. **Separate API Call**: Use Gemini REST API for evaluation (non-real-time)
3. **Hybrid**: Use Live API for conversation, REST API for evaluation

**Recommended**: Option 1 (Function Calling) - most integrated

#### 4.2 Evaluation Function Declaration
```typescript
const evaluationFunction: FunctionDeclaration = {
  name: "evaluate_answer",
  description: "Evaluate candidate's answer",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      score: { type: SchemaType.NUMBER },
      strengths: { type: SchemaType.ARRAY },
      weaknesses: { type: SchemaType.ARRAY },
      // ...
    }
  }
}
```

### Phase 5: UI Components

#### 5.1 Interview Component (`src/components/interview/Interview.tsx`)
- Main interview interface
- Shows current question
- Displays evaluation results
- Progress indicator

#### 5.2 Question Display (`src/components/interview/QuestionDisplay.tsx`)
- Shows question text
- Displays topic and difficulty
- Question number indicator

#### 5.3 Evaluation Display (`src/components/interview/EvaluationDisplay.tsx`)
- Shows score
- Lists strengths/weaknesses
- Key points covered/missing
- Explanation

#### 5.4 Session Summary (`src/components/interview/SessionSummary.tsx`)
- Final score
- Topic-wise performance
- Overall feedback
- Export results

### Phase 6: Gemini Live API Integration

#### 6.1 Interview Configuration
Update `LiveConfig` in `src/hooks/use-live-api.ts`:
```typescript
{
  model: "models/gemini-2.0-flash-exp",
  systemInstruction: {
    parts: [{
      text: "You are an interview assistant conducting a technical interview..."
    }]
  },
  tools: [
    { functionDeclarations: [evaluationFunction] },
    // RAG retrieval function?
  ]
}
```

#### 6.2 Voice Interaction Flow
1. **Question Presentation**: 
   - Text display + TTS via Gemini Live API
   - User sees question, hears it spoken

2. **Answer Collection**:
   - User speaks answer (captured via Live API)
   - Transcribed in real-time
   - Display transcription

3. **Evaluation**:
   - Send answer + question + rubric to Gemini
   - Use function calling to get structured evaluation
   - Display results

4. **Next Question**:
   - Orchestrator selects next question
   - Repeat cycle

#### 6.3 RAG Integration with Live API
**Challenge**: How to integrate RAG retrieval into real-time conversation?

**Approach**:
1. **Pre-retrieval**: Before starting interview, retrieve initial question set
2. **Function Calling**: Use Gemini function calling to request next question
3. **Hybrid**: Use Live API for conversation, separate service for RAG

**Recommended**: Pre-retrieve questions, use function calling for dynamic retrieval if needed

### Phase 7: Backend Service (If Needed)

#### 7.1 API Endpoints
```
POST /api/rag/embed - Generate embeddings
POST /api/rag/search - Search questions/rubrics
GET /api/interview/questions - Get question pool
GET /api/interview/rubrics - Get rubrics
```

#### 7.2 Technology Stack
- **Node.js + Express** or **Fastify**
- **@xenova/transformers** for embeddings (or Gemini Embedding API)
- **Simple in-memory store** or **SQLite** for vector storage
- **CORS enabled** for frontend access

### Phase 8: Data Management

#### 8.1 Question Loading
- Load questions from `public/data/questions/*.json`
- Pre-process and index on app start
- Cache in IndexedDB

#### 8.2 Session Persistence
- Save session state to localStorage
- Auto-resume on page reload
- Export results as JSON

### Phase 9: Integration Points

#### 9.1 Replace Altair Component
- Current: `Altair` component in `App.tsx`
- Replace with: `Interview` component
- Keep: `SidePanel`, `ControlTray` for debugging/logging

#### 9.2 State Flow
```
App
  └─ LiveAPIProvider
      └─ InterviewContext
          └─ Interview Component
              ├─ QuestionDisplay
              ├─ AnswerInput (voice)
              ├─ EvaluationDisplay
              └─ SessionSummary
```

## Implementation Order

### Step 1: Foundation (Week 1)
1. Create TypeScript types
2. Set up data structure (copy questions/rubrics)
3. Create basic Interview Context
4. Create Interview component skeleton

### Step 2: RAG System (Week 1-2)
1. Decide on embedding approach (Gemini API recommended)
2. Implement retriever service
3. Test question retrieval
4. Implement rubric retrieval

### Step 3: Orchestration (Week 2)
1. Implement InterviewOrchestrator
2. Implement adaptive difficulty
3. Test question flow

### Step 4: Evaluation (Week 2-3)
1. Create evaluation function declaration
2. Integrate with Gemini Live API
3. Test evaluation flow
4. Display evaluation results

### Step 5: UI Integration (Week 3)
1. Build interview UI components
2. Integrate with Live API
3. Voice input/output
4. Real-time transcription

### Step 6: Polish & Testing (Week 4)
1. Session persistence
2. Error handling
3. Loading states
4. User testing

## Key Technical Decisions Needed

1. **RAG Location**: Client-side vs Backend?
   - **Recommendation**: Start with backend service for better performance

2. **Embedding Model**: Gemini Embedding API vs Local model?
   - **Recommendation**: Gemini Embedding API (simpler, no model download)

3. **Vector Store**: In-memory vs Database vs IndexedDB?
   - **Recommendation**: Backend in-memory initially, IndexedDB for caching

4. **Evaluation Method**: Function calling vs Separate API?
   - **Recommendation**: Function calling (more integrated with Live API)

5. **Backend Framework**: Node.js/Express vs Python FastAPI?
   - **Recommendation**: Node.js/Express (same language as frontend)

## File Structure (Proposed)

```
src/
├── types/
│   └── interview.ts
├── contexts/
│   ├── LiveAPIContext.tsx (existing)
│   └── InterviewContext.tsx (new)
├── services/
│   ├── rag/
│   │   ├── embedder.ts
│   │   ├── retriever.ts
│   │   └── index.ts
│   ├── interview/
│   │   ├── orchestrator.ts
│   │   ├── adaptive.ts
│   │   └── session.ts
│   └── evaluation/
│       └── evaluator.ts
├── components/
│   ├── interview/
│   │   ├── Interview.tsx
│   │   ├── QuestionDisplay.tsx
│   │   ├── EvaluationDisplay.tsx
│   │   ├── SessionSummary.tsx
│   │   └── InterviewControls.tsx
│   └── ... (existing components)
├── hooks/
│   ├── use-interview.ts
│   └── ... (existing hooks)
└── data/
    ├── questions/
    │   └── *.json
    └── rubrics/
        └── *.json
```

## Dependencies to Add

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0", // Already have
    // For embeddings (if client-side):
    "@xenova/transformers": "^2.17.0",
    // For vector operations:
    "ml-matrix": "^6.10.0",
    // For IndexedDB:
    "idb": "^8.0.0",
    // For backend (if needed):
    "express": "^4.18.0",
    "cors": "^2.8.5"
  }
}
```

## Success Criteria

1. ✅ Can start an interview session
2. ✅ Questions are retrieved using RAG
3. ✅ Difficulty adapts based on performance
4. ✅ Answers are evaluated using Gemini
5. ✅ Real-time voice interaction works
6. ✅ Session state persists
7. ✅ Final summary is generated
8. ✅ Results can be exported

## Open Questions

1. Should we build a separate backend or keep everything client-side?
2. How to handle large embedding models in browser?
3. Should we use Gemini's embedding API or local models?
4. How to handle RAG retrieval in real-time conversation flow?
5. Should evaluation be synchronous or async?

## Next Steps

1. Review and approve this plan
2. Make key technical decisions (RAG location, embedding method)
3. Set up project structure
4. Begin Phase 1 implementation

