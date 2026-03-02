# MockPrep Frontend

AI-powered mock interview platform — Next.js frontend.

## Project Structure

```
mockprep-frontend/
├── app/
│   ├── layout.tsx              # Root layout (DM Sans font, global CSS)
│   ├── globals.css             # Tailwind v4 + custom styles
│   ├── page.tsx                # Setup screen — domain picker → config → start
│   ├── interview/
│   │   └── page.tsx            # Live interview room (audio + transcript)
│   ├── feedback/
│   │   └── page.tsx            # Feedback screen (radar chart, scores, cards)
│   └── api/
│       └── token/
│           └── route.ts        # API: generate LiveKit room tokens
├── components/
│   ├── Logo.tsx                # "IO MockPrep" logo
│   ├── Badge.tsx               # Colored pill badge
│   ├── DomainPicker.tsx        # Category tabs (Domain/Language) + grid
│   ├── InterviewConfig.tsx     # Topics, difficulty, length mode
│   ├── AudioVisualizer.tsx     # Animated audio bars
│   ├── TranscriptPanel.tsx     # Live transcript sidebar
│   ├── ScoreRing.tsx           # Animated circular score gauge
│   ├── SkillBreakdown.tsx      # Category score bars
│   └── QuestionCard.tsx        # Per-question feedback card
├── lib/
│   ├── colors.ts               # Design tokens (dark theme)
│   ├── domains.ts              # Categories, difficulties, durations
│   └── types.ts                # TypeScript interfaces
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── .env.local.example
```

## Quick Start

### 1. Prerequisites

- **Node.js** 18 or higher
- **npm** (comes with Node.js)
- A **LiveKit Cloud** account — [cloud.livekit.io](https://cloud.livekit.io)

### 2. Install

```bash
cd mockprep-frontend
npm install
```

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your LiveKit credentials:

```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxx
LIVEKIT_API_SECRET=xxxxx
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

### Setup Flow (2 steps)

1. **Pick a domain** — "By Domain" (Frontend, Backend, Fullstack, Infrastructure) or "By Language" (Python, JS, Java, Go, Rust)
2. **Configure** — Select focus topics, difficulty (Intern → Staff+), and length mode:
   - **By Duration**: 15, 30, or 45 minutes
   - **By Questions**: Slider from 3–10 questions

### Interview Room

- Connects to the LiveKit agent via WebRTC
- Shows audio visualizer + agent speaking state
- Live transcript panel on the right
- Top bar shows progress (timer or question counter)
- Mute and End Interview buttons

### Feedback Screen

- Overall score ring with radar chart
- Per-skill breakdown bars
- Expandable question-by-question cards with strengths/improvements
- "Next Steps" recommendation

## Connecting to the Backend Agent

The frontend sends interview config as **room metadata** when creating a LiveKit room. The Python agent (in `mockprep-agent/`) reads this metadata and configures itself accordingly.

Room metadata format:

```json
{
  "domain": "python",
  "topics": ["async", "core"],
  "difficulty": "mid",
  "length_mode": "questions",
  "question_count": 5
}
```

The agent sends data back via LiveKit data channels:
- `interview_state` topic — score updates, difficulty changes
- `interview_feedback` topic — final feedback payload when interview ends

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` | React framework (App Router) |
| `@livekit/components-react` | LiveKit voice assistant UI |
| `livekit-client` | WebRTC client |
| `livekit-server-sdk` | Token generation (server-side) |
| `framer-motion` | Animations |
| `recharts` | Radar chart on feedback page |
| `tailwindcss` v4 | Styling |

## Current Status

The frontend currently runs with **mock data** for the interview transcript and feedback. To go fully live:

1. Start the backend agent: `cd mockprep-agent && python agent.py dev`
2. Replace the mock transcript in `app/interview/page.tsx` with LiveKit's `useVoiceAssistant()` hook
3. Replace the mock feedback in `app/feedback/page.tsx` with data received via the `interview_feedback` data channel

See `mockprep-agent/README.md` for backend setup.
