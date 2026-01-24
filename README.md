# IOAcademy - Multimodal Live API Web Console

## Overview

IOAcademy is a React-based web application that provides a comprehensive interface for Google's Multimodal Live API (Gemini 2.5 Flash). The application enables real-time, bidirectional audio and video communication with AI, featuring a specialized technical interview system with adaptive difficulty and comprehensive evaluation.

## What It Does

This application serves as a **web console** for interacting with Google's Gemini Live API, offering two main modes:

1. **Video/Audio Streaming Mode**: Real-time multimodal communication with AI, supporting:
   - Live audio streaming (microphone input)
   - Video streaming (webcam or screen capture)
   - AI voice responses with audio output
   - Visual data visualization (Altair/Vega charts)
   - Google Search integration
   - Function calling capabilities

2. **Technical Interview System**: An AI-powered interview platform that:
   - Conducts technical interviews across multiple domains (Frontend, Backend, Fullstack, Data Engineering, General)
   - Adapts question difficulty based on candidate skill level (1-10 scale)
   - Provides real-time transcription of audio responses
   - Generates comprehensive evaluation reports with scores
   - Maintains interview transcripts for review

## Architecture

### Technology Stack

- **Frontend Framework**: React 18.3 with TypeScript
- **State Management**: Zustand (with persistence)
- **Styling**: SCSS modules
- **Audio Processing**: Web Audio API with AudioWorklets
- **Real-time Communication**: WebSocket (WSS) to Google's Gemini Live API
- **Data Visualization**: Vega-Lite/Vega-Embed
- **Build Tool**: Create React App

### Project Structure

```
webconsole/multimodal-live-api-web-console/
├── src/
│   ├── components/
│   │   ├── altair/              # Data visualization component
│   │   ├── audio-pulse/         # Audio level indicator
│   │   ├── control-tray/        # Media controls (mic, video, connect)
│   │   ├── interview-evaluation/ # Interview system components
│   │   │   ├── interview-menu/   # Interview type/level selection
│   │   │   ├── interview-system/ # Main interview orchestrator
│   │   │   ├── interview-transcript/ # Transcript display
│   │   │   └── evaluation-display/   # Evaluation results
│   │   ├── logger/              # WebSocket message logger
│   │   └── side-panel/          # Sidebar with logs
│   ├── contexts/
│   │   └── LiveAPIContext.tsx   # React context for Live API
│   ├── hooks/
│   │   ├── use-live-api.ts      # Main hook for Live API connection
│   │   ├── use-webcam.ts        # Webcam media stream hook
│   │   ├── use-screen-capture.ts # Screen capture hook
│   │   └── use-media-stream-mux.ts # Media stream multiplexer
│   ├── lib/
│   │   ├── multimodal-live-client.ts # Core WebSocket client
│   │   ├── audio-recorder.ts    # Audio input recording
│   │   ├── audio-streamer.ts    # Audio output streaming
│   │   ├── audioworklet-registry.ts # AudioWorklet management
│   │   └── worklets/            # Audio processing worklets
│   ├── stores/
│   │   └── interviewStore.ts    # Interview state management
│   ├── utils/
│   │   └── evaluationParser.ts  # Evaluation parsing utilities
│   ├── multimodal-live-types.ts # TypeScript type definitions
│   └── App.tsx                  # Main application component
└── public/
    └── index.html
```

## How It Works

### 1. Core Communication Layer

#### MultimodalLiveClient (`lib/multimodal-live-client.ts`)
- Establishes WebSocket connection to Google's Gemini Live API
- Manages bidirectional message flow (setup, content, realtime input, tool calls)
- Emits events for: `open`, `close`, `content`, `audio`, `toolcall`, `turncomplete`, etc.
- Handles connection lifecycle and error states

#### Connection Flow
1. Client initializes with API key and WebSocket URL
2. On `connect()`, sends setup message with model configuration
3. Receives `setupComplete` message
4. Begins streaming audio/video input via `realtimeInput` messages
5. Receives AI responses as `modelTurn` messages (text/audio)
6. Handles tool calls and function responses

### 2. Audio Processing

#### Audio Input (`lib/audio-recorder.ts`)
- Uses `getUserMedia()` to capture microphone input
- Processes audio through AudioWorklets:
  - **Audio Recording Worklet**: Converts audio to PCM16 format, base64 encodes
  - **Volume Meter Worklet**: Calculates volume levels for UI feedback
- Streams audio chunks to WebSocket as `realtimeInput` messages

#### Audio Output (`lib/audio-streamer.ts`)
- Receives PCM16 audio data from WebSocket
- Converts to Float32Array for Web Audio API
- Buffers and schedules audio playback using AudioBufferSourceNode
- Manages audio queue to prevent gaps or clicks
- Supports volume metering via AudioWorklets

### 3. Video Processing

#### Video Streaming (`components/control-tray/ControlTray.tsx`)
- Supports two video sources:
  - **Webcam**: Via `useWebcam()` hook
  - **Screen Capture**: Via `useScreenCapture()` hook
- Captures video frames using HTML5 Canvas
- Converts frames to JPEG (base64) at 0.5 FPS
- Sends frames as `realtimeInput` messages with `image/jpeg` MIME type

### 4. Interview System

#### Interview Flow

```
1. User Selection
   ├── Select Interview Type (Frontend/Backend/Fullstack/Data/General)
   └── Select Skill Level (1-10)

2. Configuration
   ├── Generate system prompt based on type + level
   ├── Configure AI model with interview instructions
   └── Add transcription function declaration

3. Interview Start
   ├── Connect to WebSocket
   ├── Send initial question
   └── Begin audio/video streaming

4. During Interview
   ├── AI asks questions (text/audio)
   ├── User responds (audio → transcribed)
   ├── Transcript updated in real-time
   ├── AI adapts difficulty based on responses
   └── Continue for 3-4 question exchanges

5. Evaluation Request
   ├── User clicks "End Interview & Get Feedback"
   ├── AI generates comprehensive evaluation
   ├── Parse scores (Technical, Communication)
   └── Display evaluation + transcript
```

#### Key Components

**InterviewSystem** (`components/interview-evaluation/interview-system/interview-system.tsx`)
- Orchestrates the entire interview flow
- Manages interview state (type, level, progress)
- Handles AI responses and tool calls
- Generates transcripts from WebSocket logs
- Parses evaluation feedback and scores

**Interview Prompts** (`components/interview-evaluation/interview-system/interviewPrompts.ts`)
- Contains domain-specific interview prompts
- Adjusts difficulty based on skill level (1-10)
- Provides initial questions tailored to type and level
- Includes adaptive questioning strategies

**Transcription Function** (`components/interview-evaluation/interview-system/transcriptionFunction.ts`)
- Function declaration for audio transcription
- AI calls this function when it transcribes candidate audio
- Ensures candidate responses are recorded in transcript

**Interview Store** (`stores/interviewStore.ts`)
- Zustand store with persistence
- Manages interview metadata, messages, evaluation
- Persists to localStorage for session recovery

### 5. State Management

#### LiveAPIContext (`contexts/LiveAPIContext.tsx`)
- React Context providing Live API connection
- Wraps `useLiveAPI` hook
- Provides: `client`, `config`, `connected`, `connect()`, `disconnect()`, `volume`

#### Interview Store (`stores/interviewStore.ts`)
- Zustand store with localStorage persistence
- Manages:
  - Interview metadata (type, level, timestamps)
  - Message transcript (interviewer/candidate)
  - Evaluation feedback and scores
  - Actions: `startInterview()`, `endInterview()`, `addMessage()`, etc.

### 6. UI Components

#### ControlTray
- Connection toggle button
- Microphone mute/unmute
- Audio output level indicator
- Webcam/screen capture controls
- Manages all media streams

#### Altair Component
- Renders Vega-Lite/Vega charts
- Listens for `render_altair` function calls from AI
- Displays data visualizations dynamically

#### Interview Components
- **InterviewMenu**: Type and skill level selection
- **InterviewSystem**: Main interview interface
- **InterviewTranscript**: Real-time transcript display
- **EvaluationDisplay**: Formatted evaluation results

## Configuration

### Environment Variables

Create a `.env` file in `webconsole/multimodal-live-api-web-console/`:

```env
REACT_APP_GEMINI_API_KEY=your_api_key_here
```

### WebSocket Endpoint

Default endpoint (configured in `App.tsx`):
```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent
```

### Model Configuration

Default model (in `use-live-api.ts`):
```
models/gemini-2.5-flash-native-audio-preview-12-2025
```

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Google Gemini API key

### Steps

1. **Navigate to the webconsole directory**:
   ```bash
   cd webconsole/multimodal-live-api-web-console
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   echo "REACT_APP_GEMINI_API_KEY=your_key_here" > .env
   ```

4. **Start development server**:
   ```bash
   npm start
   ```

5. **For HTTPS (required for some browser APIs)**:
   ```bash
   npm run start-https
   ```

6. **Build for production**:
   ```bash
   npm run build
   ```

## Usage

### Video/Audio Streaming Mode

1. Click the **play button** to connect to the Live API
2. Grant microphone permissions when prompted
3. Optionally enable webcam or screen capture
4. Speak to the AI - it will respond with audio
5. Use the Altair component to request data visualizations

### Interview Mode

1. Switch to the **"Interview"** tab
2. Select interview type (Frontend/Backend/Fullstack/Data/General)
3. Select your skill level (1-10)
4. Click **"Start Interview"**
5. Answer questions verbally - responses are transcribed automatically
6. Click **"End Interview & Get Feedback"** when finished
7. Review evaluation and transcript

## AI Agents & Personas

The application uses a **single WebSocket connection** to Google's Gemini Live API, but configures different AI personas based on the active mode. The AI agent's behavior is controlled through `systemInstruction` prompts that define its role and capabilities.

### 1. **General Assistant Agent** (Video/Audio Mode)
**Location**: `components/altair/Altair.tsx`

**Configuration**:
- **Role**: "You are my helpful assistant"
- **Capabilities**:
  - General conversation
  - Google Search integration
  - Data visualization (Altair/Vega charts via `render_altair` function)
- **Voice**: Aoede (prebuilt voice)
- **Response Mode**: Audio output
- **Tools**: 
  - `googleSearch` (free-tier quota)
  - `render_altair` function for chart generation

**Use Case**: General-purpose AI assistant for multimodal interaction with search and visualization capabilities.

### 2. **Technical Interviewer Agents** (Interview Mode)
**Location**: `components/interview-evaluation/interview-system/interviewPrompts.ts`

The interview system configures **5 specialized interviewer personas**, each with domain-specific expertise:

#### a. **General Technical Interviewer**
- **Focus**: Comprehensive technical assessment across all domains
- **Evaluation Criteria**:
  - Technical Knowledge (1-10)
  - Problem-Solving Approach (1-10)
  - Communication Skills (1-10)
  - Behavioral Competencies (1-10)
- **Question Style**: Open-ended, adaptive difficulty

#### b. **Frontend Engineer Interviewer**
- **Focus**: Frontend technologies and best practices
- **Key Assessment Areas**:
  - HTML & Accessibility (WCAG, semantic HTML)
  - CSS & Visual Implementation (Flexbox, Grid, animations)
  - JavaScript & Programming (ES6+, TypeScript, performance)
  - Frameworks & Libraries (React, Vue, Angular patterns)
  - Testing & Quality (unit, component, E2E testing)
  - Build & Deployment (Webpack, Vite, CI/CD)
  - Architecture & Patterns (component design, state management)

#### c. **Backend Engineer Interviewer**
- **Focus**: Server-side technologies and system design
- **Key Assessment Areas**:
  - Server & API Development (REST, GraphQL, authentication)
  - Database & Data Modeling (SQL, NoSQL, optimization)
  - Architecture & System Design (microservices, scaling)
  - Security & Compliance (OWASP, data privacy)
  - Infrastructure & DevOps (Docker, Kubernetes, CI/CD)
  - Observability & Reliability (logging, metrics, tracing)
  - Performance & Optimization (profiling, concurrency)

#### d. **Fullstack Developer Interviewer**
- **Focus**: End-to-end development across frontend and backend
- **Key Assessment Areas**:
  - Frontend Fundamentals (frameworks, state management)
  - Backend Development (APIs, databases, authentication)
  - Full-Stack Integration (API contracts, state sync, validation)
  - Architecture & System Design (end-to-end planning)
  - DevOps & Deployment (CI/CD, containerization)
  - Security & Best Practices (full-stack security)
  - Modern Development Practices (Git workflow, testing)

#### e. **Data Engineer Interviewer**
- **Focus**: Data systems, ETL, and analytics infrastructure
- **Key Assessment Areas**:
  - Data Processing & ETL (batch, stream processing, workflows)
  - Data Storage & Architecture (warehouses, data lakes, formats)
  - Big Data Technologies (Spark, Flink, Hadoop ecosystem)
  - Data Modeling & Quality (dimensional modeling, validation)
  - Pipeline Operations & Monitoring (SLA, performance)
  - Data Governance & Security (catalog, compliance, encryption)
  - Cloud Data Platforms (Snowflake, BigQuery, managed services)

### Agent Configuration Details

**Shared Configuration**:
- **Model**: `models/gemini-2.5-flash-native-audio-preview-12-2025`
- **Connection**: Single WebSocket connection (swapped dynamically)
- **Audio Transcription**: All interview agents use `add_candidate_response` function
- **Adaptive Difficulty**: All interview agents adjust based on skill level (1-10)

**Dynamic Configuration**:
- The `systemInstruction` is updated when switching between modes
- Interview agents receive specialized prompts based on:
  - Interview type (frontend/backend/fullstack/data/general)
  - Skill level (1-10, affects question difficulty)
- Each agent has access to different function declarations:
  - **Assistant Mode**: `render_altair`, `googleSearch`
  - **Interview Mode**: `add_candidate_response` (transcription)

**Agent Behavior**:
- **Assistant Agent**: Proactive, can search and visualize data
- **Interview Agents**: Structured, follows interview protocol, provides evaluations
- All agents support real-time audio/video input
- All agents can respond with audio output

## Key Features

### Real-time Audio Processing
- Low-latency audio streaming (PCM16, 16kHz)
- AudioWorklets for efficient processing
- Volume metering and visual feedback

### Adaptive Interview System
- Questions adjust based on candidate responses
- Skill level assessment (1-10 scale)
- Domain-specific evaluation criteria
- Comprehensive feedback with actionable recommendations

### Multimodal Support
- Audio input/output
- Video input (webcam/screen)
- Text responses
- Function calling (charts, transcription, search)

### Persistent State
- Interview transcripts saved to localStorage
- Session recovery on page refresh
- Evaluation history

## Technical Details

### WebSocket Protocol

The application communicates with Google's Gemini Live API using a custom WebSocket protocol:

**Outgoing Messages**:
- `setup`: Initial configuration
- `clientContent`: Text messages from user
- `realtimeInput`: Audio/video chunks
- `toolResponse`: Function call responses

**Incoming Messages**:
- `setupComplete`: Connection established
- `serverContent`: AI responses (text/audio)
- `toolCall`: Function call requests
- `turnComplete`: Response finished
- `interrupted`: Response interrupted

### Audio Format
- **Input**: PCM16, 16kHz sample rate, mono
- **Output**: PCM16, 24kHz sample rate, mono
- **Encoding**: Base64 for WebSocket transmission

### Video Format
- **Format**: JPEG
- **Frame Rate**: 0.5 FPS (2 seconds per frame)
- **Resolution**: 25% of source resolution
- **Encoding**: Base64 for WebSocket transmission

## Browser Compatibility

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: May require HTTPS for media APIs
- **Mobile**: Limited support (Web Audio API restrictions)

## Security Considerations

- API key is stored in environment variables (not committed)
- WebSocket uses WSS (secure WebSocket)
- Media permissions required for audio/video access
- No data is stored on external servers (localStorage only)

## Limitations

- Audio transcription depends on AI model accuracy
- Video streaming limited to 0.5 FPS for performance
- Requires stable internet connection for WebSocket
- Browser media API limitations on mobile devices

## Future Enhancements

Potential improvements:
- Multiple interview sessions history
- Export transcripts/evaluations as PDF
- Custom interview question sets
- Multi-language support
- Video recording of interviews
- Advanced analytics dashboard

## License

Copyright 2024 Google LLC

Licensed under the Apache License, Version 2.0

## Support

For issues related to:
- **Google Gemini API**: See [Google AI Studio Documentation](https://ai.google.dev/)
- **Application Issues**: Check browser console for errors
- **Media Permissions**: Ensure browser has microphone/camera access

