"""
MockPrep Agent — Main Entrypoint

    python agent.py dev          # Development mode (opens Playground)
    python agent.py start        # Production mode

Room metadata format (v2 — supports duration OR question count):
{
    "domain": "frontend",
    "topics": ["react", "typescript"],
    "difficulty": "mid",
    "length_mode": "questions",
    "duration": 30,
    "question_count": 5
}
"""

import json
import logging

from dotenv import load_dotenv

from livekit.agents import AgentServer, AgentSession, JobContext
from livekit.plugins import deepgram, google, silero, openai

from interview_agent import InterviewAgent
from feedback import compile_feedback
from db import save_interview

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)-12s %(levelname)-8s %(message)s",
)
logger = logging.getLogger("mockprep")

DEFAULT_CONFIG = {
    "domain": "frontend",
    "topics": [],
    "difficulty": "mid",
    "length_mode": "duration",
    "duration": 30,
    "question_count": None,
    "user_name": "",
    "user_email": "agarway3@uci.edu",
}


def parse_room_config(metadata: str | None) -> dict:
    config = DEFAULT_CONFIG.copy()
    if metadata:
        try:
            data = json.loads(metadata)
            for key in ("domain", "topics", "difficulty", "length_mode"):
                if key in data:
                    config[key] = data[key]
            if "duration" in data:
                config["duration"] = int(data["duration"])
            if "question_count" in data:
                config["question_count"] = int(data["question_count"])
            if "user_name" in data:
                config["user_name"] = data["user_name"]
            if "user_email" in data:
                config["user_email"] = data["user_email"]
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Could not parse room metadata: {e}. Using defaults.")

    if config["length_mode"] == "questions" and not config["question_count"]:
        config["question_count"] = 5

    return config


server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    await ctx.connect()
    # Wait for user to connect so we can read their metadata
    participant = await ctx.wait_for_participant()
    config = parse_room_config(participant.metadata)

    mode_desc = (
        f"{config['question_count']} questions"
        if config["length_mode"] == "questions"
        else f"{config['duration']}min"
    )
    logger.info(
        f"Starting interview: domain={config['domain']}, "
        f"difficulty={config['difficulty']}, mode={mode_desc}"
    )

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(
            model="nova-3",
            language="en",
        ),
        # llm=google.LLM(
        #     model="gemini-2.5-flash",
        #     temperature=0.7,  # Slight creativity for natural conversation
        # ),
        llm=openai.LLM(
            model="gpt-4.1-mini",
            temperature=0.4,  # Slight creativity for natural conversation
        ),
        tts=deepgram.TTS(model="aura-2-thalia-en"),
    )

    agent = InterviewAgent(
        domain_id=config["domain"],
        topic_ids=config["topics"],
        difficulty_id=config["difficulty"],
        length_mode=config["length_mode"],
        duration_minutes=config["duration"],
        question_count=config["question_count"],
    )

    agent._config = config

    await session.start(agent=agent, room=ctx.room)
    # Listen for user end command
    @ctx.room.on("data_received")
    def on_data(packet):
        try:
            msg = json.loads(packet.data.decode())
            if msg.get("type") == "end_interview" and not agent._interview_ended:
                import asyncio
                asyncio.ensure_future(_user_triggered_end(agent, ctx.room, config))
        except Exception:
            pass

async def _user_triggered_end(agent, room, config):
    """Handle user clicking End Interview button."""
    if agent._interview_ended:
        return
    agent._interview_ended = True

    feedback = compile_feedback(
        scores=agent._scores,
        difficulty_progression=agent._difficulty_engine.progression,
        domain_id=agent._domain_id,
        topic_ids=agent._topic_ids,
        starting_difficulty=agent._starting_difficulty,
    )

    logger.info(
        f"Interview ended by user: {len(agent._scores)} questions, "
        f"overall score: {feedback['overall_score']}"
    )

    try:
        save_interview(feedback, config)
    except Exception as e:
        logger.error(f"DB save failed: {e}")

    try:
        await room.local_participant.publish_data(
            json.dumps(feedback).encode(),
            topic="interview_feedback",
        )
        logger.info("Feedback payload sent to frontend.")
    except Exception as e:
        logger.warning(f"Could not publish feedback: {e}")


if __name__ == "__main__":
    from livekit.agents import cli
    cli.run_app(server)
