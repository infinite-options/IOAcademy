# Architecture Recommendation: Reuse Existing Python Backend

## ✅ **RECOMMENDATION: Reuse Existing Python Backend**

After analyzing the codebase, **you already have a fully functional Python FastAPI backend** in `python-interview/api/` that includes:
- ✅ Complete RAG system (FAISS, embeddings, retrieval)
- ✅ Interview orchestration
- ✅ Session management
- ✅ Evaluation system
- ✅ CORS already configured
- ✅ RESTful API endpoints

**This is the best approach** - no need to rebuild anything!

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│  (TypeScript/React - Voice UI with Gemini Live API)        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Gemini     │  │  Interview   │  │   Session    │    │
│  │  Live API    │  │   Context    │  │   State      │    │
│  │  (Voice)     │  │              │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP REST API
                          │ (fetch/axios)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Python FastAPI Backend                         │
│              (python-interview/api/)                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │     RAG       │  │ Orchestrator │  │  Evaluation  │    │
│  │   System      │  │              │  │   System     │    │
│  │ (FAISS, etc)  │  │              │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Session     │  │   Data      │                        │
│  │   Manager     │  │   Storage   │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### **Frontend (React/TypeScript)** - `src/`

#### 1. **Gemini Live API Integration** (`src/hooks/use-live-api.ts`, `src/contexts/LiveAPIContext.tsx`)
   - **Handles**: Real-time voice conversation
   - **Responsibilities**:
     - Voice input (microphone capture)
     - Voice output (TTS from Gemini)
     - Real-time transcription
     - WebSocket connection to Gemini
   - **Does NOT handle**: Question selection, evaluation logic, RAG

#### 2. **Interview UI Components** (`src/components/interview/`)
   - **Handles**: User interface and visual feedback
   - **Responsibilities**:
     - Display questions (text + voice)
     - Show evaluation results
     - Progress indicators
     - Session summary
   - **Does NOT handle**: Business logic

#### 3. **Interview Context** (`src/contexts/InterviewContext.tsx`)
   - **Handles**: Frontend state management
   - **Responsibilities**:
     - Manage interview session state (UI state only)
     - Coordinate between Gemini Live API and Python backend
     - Handle API calls to backend
     - Local state persistence (localStorage)
   - **Does NOT handle**: RAG, evaluation, question selection

#### 4. **API Client** (`src/services/api/client.ts`)
   - **Handles**: HTTP communication with Python backend
   - **Responsibilities**:
     - Call backend endpoints
     - Handle responses/errors
     - Type-safe API calls
   - **Endpoints to call**:
     - `POST /api/interview/start`
     - `GET /api/interview/{session_id}/question`
     - `POST /api/interview/{session_id}/answer`
     - `GET /api/interview/{session_id}/status`
     - `GET /api/interview/{session_id}/feedback`

### **Backend (Python FastAPI)** - `python-interview/api/`

#### 1. **RAG System** (`python-interview/rag/`)
   - **Handles**: Question and rubric retrieval
   - **Responsibilities**:
     - Load questions/rubrics from JSON files
     - Generate embeddings (sentence-transformers)
     - Build FAISS vector indices
     - Perform semantic search
     - Filter by topic/difficulty
   - **Does NOT handle**: UI, voice, frontend state

#### 2. **Interview Orchestrator** (`python-interview/interview/orchestrator.py`)
   - **Handles**: Interview flow logic
   - **Responsibilities**:
     - Select next question based on difficulty/topic
     - Track topic coverage
     - Manage question history
     - Adaptive difficulty adjustment
   - **Does NOT handle**: UI, voice, embeddings

#### 3. **Evaluation System** (`python-interview/evaluation/`)
   - **Handles**: Answer evaluation
   - **Responsibilities**:
     - Evaluate candidate answers using LLM
     - Score answers (0.0 - 1.0)
     - Identify strengths/weaknesses
     - Check key points coverage
   - **Uses**: Ollama/OpenAI (configured in `config/llm_config.py`)
   - **Does NOT handle**: Voice, UI, question selection

#### 4. **Session Manager** (`python-interview/api/session_manager.py`)
   - **Handles**: Backend session storage
   - **Responsibilities**:
     - Create/manage interview sessions
     - Store session state (questions asked, scores, etc.)
     - Session lifecycle management
   - **Does NOT handle**: Frontend state, UI

#### 5. **API Routes** (`python-interview/api/routes.py`)
   - **Handles**: HTTP endpoints
   - **Responsibilities**:
     - RESTful API endpoints
     - Request/response validation
     - Error handling
     - CORS configuration
   - **Does NOT handle**: Business logic (delegates to orchestrator)

## Data Flow

### Starting an Interview

```
1. User clicks "Start Interview" in React UI
   ↓
2. Frontend calls: POST /api/interview/start
   ↓
3. Backend creates session, initializes orchestrator
   ↓
4. Backend returns: { session_id, status }
   ↓
5. Frontend stores session_id, updates UI
```

### Getting a Question

```
1. Frontend calls: GET /api/interview/{session_id}/question
   ↓
2. Backend orchestrator selects next question (using RAG)
   ↓
3. Backend returns: { question, question_number, ... }
   ↓
4. Frontend displays question text
   ↓
5. Frontend sends question to Gemini Live API (voice)
   ↓
6. Gemini speaks the question to user
```

### Submitting an Answer

```
1. User speaks answer → Gemini Live API transcribes
   ↓
2. Frontend receives transcription
   ↓
3. Frontend calls: POST /api/interview/{session_id}/answer
   ↓
4. Backend retrieves rubric (using RAG)
   ↓
5. Backend evaluates answer (using LLM)
   ↓
6. Backend adjusts difficulty, updates session
   ↓
7. Backend returns: { evaluation, next_question_available, ... }
   ↓
8. Frontend displays evaluation results
   ↓
9. Frontend sends evaluation to Gemini Live API (voice feedback)
```

## Why This Architecture?

### ✅ **Advantages**

1. **Reuse Existing Code**: No need to rebuild RAG system
2. **Proven Technology**: Python ecosystem is excellent for ML/RAG
3. **Separation of Concerns**: 
   - Frontend = UI + Voice
   - Backend = Logic + RAG + Evaluation
4. **Scalability**: Can scale backend independently
5. **Security**: API keys stay on backend (if needed)
6. **Performance**: FAISS is fast, embeddings cached

### ⚠️ **Considerations**

1. **Two Languages**: Need to maintain Python + TypeScript
   - **Mitigation**: Clear API contract, well-documented
2. **Network Latency**: HTTP calls add ~50-200ms
   - **Mitigation**: Acceptable for interview flow, not real-time critical
3. **Deployment**: Need to deploy both frontend and backend
   - **Mitigation**: Standard practice, can use Docker

## Alternative Approaches (Not Recommended)

### ❌ **Option A: Pure Client-Side**
- **Problem**: Large embedding models (~100MB+), slow performance
- **Problem**: API keys exposed in browser
- **Problem**: No server-side evaluation control

### ❌ **Option B: Node.js Backend**
- **Problem**: Need to rebuild entire RAG system
- **Problem**: JavaScript ML libraries less mature
- **Problem**: More work, no benefit

### ❌ **Option C: Hybrid (Some RAG in Frontend)**
- **Problem**: Unnecessary complexity
- **Problem**: Duplicate code
- **Problem**: Harder to maintain

## Implementation Steps

### Step 1: Update Backend CORS
```python
# python-interview/api/server.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:3001",  # If different port
        # Add production URL
    ],
    # ... rest of config
)
```

### Step 2: Create Frontend API Client
```typescript
// src/services/api/client.ts
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const interviewAPI = {
  start: (candidateName?: string) => 
    fetch(`${API_BASE}/api/interview/start`, { ... }),
  getQuestion: (sessionId: string) => 
    fetch(`${API_BASE}/api/interview/${sessionId}/question`, { ... }),
  submitAnswer: (sessionId: string, answer: string) => 
    fetch(`${API_BASE}/api/interview/${sessionId}/answer`, { ... }),
  // ... etc
}
```

### Step 3: Integrate with Gemini Live API
- Use Gemini Live API for voice input/output
- Use Python backend for question selection and evaluation
- Coordinate between the two

### Step 4: Build UI Components
- Interview component
- Question display
- Evaluation display
- Session summary

## Environment Variables

### Frontend (`.env`)
```bash
REACT_APP_GEMINI_API_KEY=your-key
REACT_APP_API_URL=http://localhost:8000
```

### Backend (`.env` in `python-interview/`)
```bash
LLM_PROVIDER=ollama  # or openai
LLM_MODEL_NAME=dolphin-mistral
OPENAI_API_KEY=...  # if using OpenAI
```

## Summary

**✅ Use the existing Python backend** - it's already built and working!

**Component Split:**
- **Frontend**: UI, Voice (Gemini Live API), State Management
- **Backend**: RAG, Question Selection, Evaluation, Session Management

**Communication:**
- HTTP REST API between frontend and backend
- WebSocket (Gemini Live API) for voice in frontend

This gives you the best of both worlds: powerful Python ML stack for RAG/evaluation, and modern React UI with real-time voice interaction.

