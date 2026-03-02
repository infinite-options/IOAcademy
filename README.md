# MockPrep

AI-powered mock interview platform that adapts to your skill level in real time. Practice technical interviews across multiple domains with a voice AI interviewer that scores your answers, adjusts difficulty, and delivers detailed feedback.

## Demo

**Setup → Interview → Feedback**

Pick a domain, configure difficulty and length, then have a live voice conversation with the AI interviewer. Get scored on 5 dimensions with per-question breakdowns when you're done.

## Features

- **10 interview domains** — Frontend, Backend, Full Stack, Infrastructure, Python, JavaScript, Java, Go, Rust, HVAC
- **5 difficulty levels** — Intern → Junior → Mid → Senior → Staff+, with adaptive adjustment mid-interview
- **Flexible length** — Choose by duration (15/30/45 min) or by question count (3-10)
- **Live voice conversation** — Real-time STT + LLM + TTS via LiveKit
- **5-dimension scoring** — Technical Accuracy, Depth, Communication, Problem Solving, Practical Experience
- **Per-question feedback** — Strengths, improvements, and difficulty tracking for every question
- **Radar chart + skill breakdown** — Visual performance report after each interview
- **Email feedback** — Automatic email with your results via Resend
- **Live transcript** — Real-time conversation transcript during the interview

## Architecture

```
┌─────────────┐       WebRTC        ┌──────────────┐
│   Frontend   │◄──────────────────►│  LiveKit SFU  │
│  (Next.js)   │                    │              │
│              │   /api/token       │              │
│              │──────────────►     │              │
└─────────────┘                    └──────┬───────┘
                                          │
                                          │ LiveKit Agents SDK
                                          │
                                   ┌──────▼───────┐
                                   │    Agent      │
                                   │  (Python)     │
                                   │              │
                                   │  STT → LLM → TTS
                                   │  Deepgram  OpenAI  Deepgram
                                   └──────────────┘
```

## Tech Stack

**Frontend** — Next.js 15, TypeScript, Framer Motion, Recharts, LiveKit Components React

**Agent** — Python, LiveKit Agents SDK, OpenAI GPT-4.1-mini, Deepgram Nova 3 (STT), Deepgram Aura 2 (TTS), Silero VAD

**Infrastructure** — LiveKit (WebRTC SFU), Resend (email)

## Project Structure

```
.
├── agent/                    # Python backend
│   ├── agent.py              # Entrypoint — connects to LiveKit, starts session
│   ├── interview_agent.py    # Core interviewer logic + tool definitions
│   ├── difficulty.py         # Adaptive difficulty engine
│   ├── feedback.py           # Structured feedback compiler
│   ├── email_service.py      # Resend email integration
│   ├── domains.json          # Domain/topic/difficulty configuration
│   └── prompts/
│       ├── system.py         # System prompt builder
│       ├── domains.py        # Domain config loader
│       └── rubric.py         # Scoring rubric definitions
│
├── mockprep-frontend/                 # Next.js frontend
│   ├── app/
│   │   ├── page.tsx          # Home — domain picker + interview config
│   │   ├── interview/
│   │   │   └── page.tsx      # Interview room — LiveKit connection + transcript
│   │   ├── feedback/
│   │   │   └── page.tsx      # Feedback — scores, radar chart, breakdown
│   │   └── api/token/
│   │       └── route.ts      # LiveKit token generation
│   ├── components/           # UI components (all pure inline styles)
│   └── lib/                  # Shared types, colors, domain data
│
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- API keys for: LiveKit, OpenAI, Deepgram
- Optional: Resend API key (for email feedback)

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd mockprep
```

### 2. Set up the agent

```bash
cd agent
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install "livekit-agents[openai,silero,deepgram]~=1.4"
pip install python-dotenv resend
```

Create `agent/.env`:

```
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
RESEND_API_KEY=re_...
```

### 3. Set up the frontend

```bash
cd mockprep-frontend
npm install
```

Create `mockprep-frontend/.env.local`:

```
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

Use the **same** LiveKit credentials in both files.

### 4. Run everything

**Terminal 1** — LiveKit server (local development):

```bash
livekit-server --dev
```

**Terminal 2** — Agent:

```bash
cd agent
source venv/bin/activate
python agent.py dev
```

**Terminal 3** — Frontend:

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start practicing.

## Deployment

**Frontend** — Deploy to Vercel or Netlify. Set root directory to `frontend` and add the three env vars.

**Agent** — Deploy to LiveKit Cloud with `lk cloud deploy`, or run on any VPS with `python agent.py start`.

Both must point to the same LiveKit project (same API key/secret/URL).

## Adding a New Domain

1. Add an entry to `agent/domains.json` in the `"domains"` array with `id`, `label`, `icon`, `topics`, and `prompt_context`
2. Add the matching entry to `frontend/lib/domains.ts` in the appropriate category
3. Restart the agent

## License

MIT