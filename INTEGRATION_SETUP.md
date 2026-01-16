# Interview System Integration Setup

## Overview

The React frontend has been integrated with the Python backend for the RAG-based interview system. This document explains how to set up and run the integrated system.

## Architecture

- **Frontend**: React/TypeScript app (port 3000)
- **Backend**: Python FastAPI server (port 8000)
- **Communication**: HTTP REST API

## Setup Instructions

### 1. Backend Setup (Python)

```bash
# Navigate to python-interview directory
cd python-interview

# Activate virtual environment
source venv/bin/activate

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start the backend server
python api/server.py
# Or: uvicorn api.server:app --reload --host 0.0.0.0 --port 8000
```

The backend will start on `http://localhost:8000`

**Verify backend is running:**
```bash
curl http://localhost:8000/health
```

### 2. Frontend Setup (React)

```bash
# From project root
npm install  # If needed

# Set environment variables (create .env file if it doesn't exist)
echo "REACT_APP_GEMINI_API_KEY=your-gemini-api-key" > .env
echo "REACT_APP_API_URL=http://localhost:8000" >> .env

# Start React app
npm start
```

The frontend will start on `http://localhost:3000`

### 3. Verify Integration

1. Open `http://localhost:3000` in your browser
2. You should see the "Start Interview" screen
3. Enter a name (optional) and click "Start Interview"
4. The app should connect to the backend and start the interview

## API Endpoints Used

The frontend communicates with these backend endpoints:

- `POST /api/interview/start` - Start a new interview session
- `GET /api/interview/{session_id}/question` - Get next question
- `POST /api/interview/{session_id}/answer` - Submit answer and get evaluation
- `GET /api/interview/{session_id}/status` - Get session status
- `GET /api/interview/{session_id}/feedback` - Get final feedback
- `POST /api/interview/{session_id}/cancel` - Cancel interview

## File Structure

### Frontend Files Created

```
src/
├── types/
│   └── interview.ts              # TypeScript types
├── services/
│   └── api/
│       └── client.ts             # API client
├── contexts/
│   └── InterviewContext.tsx      # Interview state management
└── components/
    └── interview/
        ├── Interview.tsx          # Main interview component
        ├── QuestionDisplay.tsx   # Question display
        ├── EvaluationDisplay.tsx  # Evaluation results
        ├── SessionSummary.tsx    # Final summary
        ├── InterviewControls.tsx # Control buttons
        └── interview.scss        # Styles
```

## Features Implemented

✅ **Session Management**
- Start interview with optional candidate name
- Session state persistence (localStorage)
- Session cancellation

✅ **Question Flow**
- Get questions from backend (RAG-powered)
- Display questions with topic and difficulty
- Show key points to cover

✅ **Answer Submission**
- Submit text answers
- Receive evaluation from backend
- Display scores, strengths, weaknesses

✅ **Evaluation Display**
- Score visualization
- Strengths and weaknesses
- Key points covered/missing
- Detailed explanations

✅ **Session Summary**
- Overall score
- Topic-wise performance
- Strengths and recommendations
- Interview duration

## Current Limitations

⚠️ **Voice Integration**: Not yet implemented
- Currently uses text input for answers
- Gemini Live API is connected but not used for interview flow
- Voice interaction will be added in next phase

⚠️ **Real-time Updates**: Not implemented
- No WebSocket connection for real-time updates
- Uses polling/request-based approach

## Next Steps

1. **Voice Integration**: Integrate Gemini Live API for voice-based Q&A
2. **Real-time Transcription**: Show live transcription of user's voice
3. **Voice Feedback**: Use TTS to speak evaluation results
4. **Enhanced UI**: Add animations, better loading states
5. **Error Handling**: Improve error messages and recovery

## Troubleshooting

### Backend not connecting

1. **Check backend is running:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Check CORS configuration:**
   - Verify `python-interview/api/server.py` has CORS configured for `localhost:3000`

3. **Check API URL:**
   - Verify `.env` has `REACT_APP_API_URL=http://localhost:8000`

### Questions not loading

1. **Check backend logs** for RAG initialization errors
2. **Verify data files exist:**
   - `python-interview/data/questions/*.json`
   - `python-interview/data/rubrics/*.json`

3. **Check backend health:**
   ```bash
   curl http://localhost:8000/health
   ```

### Evaluation not working

1. **Check LLM provider configuration:**
   - Verify `.env` in `python-interview/` has correct LLM settings
   - For Ollama: Ensure Ollama is running and model is available
   - For OpenAI: Verify API key is set

2. **Check backend logs** for evaluation errors

## Development Notes

- Session state is persisted in browser localStorage
- API errors are displayed to the user
- Loading states are shown during API calls
- Interview can be cancelled at any time

## Testing the Integration

1. Start both backend and frontend
2. Open browser console to see API calls
3. Start an interview
4. Submit answers and verify evaluations
5. Complete interview and check summary

