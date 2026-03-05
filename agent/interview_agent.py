"""
InterviewAgent — the core AI interviewer.

Supports two length modes:
  - "duration": ends when time runs out (LLM decides)
  - "questions": auto-ends after N scored questions
"""

import json
import logging

from livekit.agents import Agent, RunContext, function_tool
from livekit.agents.job import get_job_context

from difficulty import DifficultyEngine
from feedback import compile_feedback
from prompts import build_system_prompt
from email_service import send_feedback_email

logger = logging.getLogger("mockprep")


class InterviewAgent(Agent):
    def __init__(
        self,
        domain_id: str = "frontend",
        topic_ids: list[str] | None = None,
        difficulty_id: str = "mid",
        length_mode: str = "duration",
        duration_minutes: int = 30,
        question_count: int | None = None,
    ):
        instructions = build_system_prompt(
            domain_id=domain_id,
            topic_ids=topic_ids or [],
            difficulty_id=difficulty_id,
            length_mode=length_mode,
            duration_minutes=duration_minutes,
            question_count=question_count,
        )

        super().__init__(instructions=instructions)

        self._domain_id = domain_id
        self._topic_ids = topic_ids or []
        self._starting_difficulty = difficulty_id
        self._length_mode = length_mode
        self._duration_minutes = duration_minutes
        self._max_questions = question_count
        self._difficulty_engine = DifficultyEngine(difficulty_id)
        self._scores: list[dict] = []
        self._question_count = 0
        self._interview_ended = False

        logger.info(
            f"InterviewAgent initialized: domain={domain_id}, "
            f"difficulty={difficulty_id}, mode={length_mode}, "
            f"{'questions=' + str(question_count) if length_mode == 'questions' else 'duration=' + str(duration_minutes) + 'min'}"
        )

    @function_tool()
    async def score_answer(
        self,
        context: RunContext,
        question_number: int,
        question_text: str,
        technical_accuracy: int,
        depth: int,
        communication: int,
        problem_solving: int,
        practical_experience: int,
        strengths: str,
        improvements: str,
        candidate_answer_summary: str,
    ) -> str:
        """
        Score the candidate's answer. Call this after EVERY candidate answer.
        """
        scores = {
            "technical_accuracy": _clamp(technical_accuracy),
            "depth": _clamp(depth),
            "communication": _clamp(communication),
            "problem_solving": _clamp(problem_solving),
            "practical_experience": _clamp(practical_experience),
        }

        score_entry = {
            "question_number": question_number,
            "question_text": question_text,
            "scores": scores,
            "strengths": strengths,
            "improvements": improvements,
            "candidate_answer_summary": candidate_answer_summary,
            "difficulty_at_time": self._difficulty_engine.current,
        }

        self._scores.append(score_entry)
        self._question_count = question_number
        self._difficulty_engine.record_score(scores)

        avg = sum(scores.values()) / len(scores)
        logger.info(f"Q{question_number} scored: avg={avg:.1f}, difficulty={self._difficulty_engine.current}")

        # Publish score update to frontend
        try:
            score_update = {
                "type": "score_update",
                "question_number": question_number,
                "average_score": round(avg, 1),
                "current_difficulty": self._difficulty_engine.current,
            }
            # session = context.session
            # room = session.room
            job_ctx = get_job_context()
            if job_ctx.room and job_ctx.room.local_participant:
                await job_ctx.room.local_participant.publish_data(
                    json.dumps(score_update).encode(),
                    topic="interview_state",
                )
        except Exception as e:
            logger.warning(f"Could not publish score update: {e}")

        # Check difficulty adjustment
        suggested = self._difficulty_engine.should_adjust()
        hint = ""
        if suggested:
            hint = (
                f" Consider adjusting difficulty to '{suggested}' — "
                f"use the adjust_difficulty tool if you agree."
            )

        # ── AUTO-END: question count mode ──
        if (
            self._length_mode == "questions"
            and self._max_questions
            and question_number >= self._max_questions
            and not self._interview_ended
        ):
            logger.info(
                f"Question limit reached ({question_number}/{self._max_questions}). "
                f"Triggering auto-end."
            )
            return (
                f"Score recorded for question {question_number} (avg: {avg:.1f}).{hint}\n\n"
                f"⚠️ IMPORTANT: You have now asked all {self._max_questions} questions. "
                f"You MUST now call the `end_interview` tool immediately to wrap up. "
                f"Do NOT ask any more technical questions. Deliver a brief closing, then call end_interview."
            )

        # Progress hint for question mode
        progress_hint = ""
        if self._length_mode == "questions" and self._max_questions:
            remaining = self._max_questions - question_number
            progress_hint = f" ({remaining} question{'s' if remaining != 1 else ''} remaining)"

        return f"Score recorded for question {question_number} (avg: {avg:.1f}).{hint}{progress_hint}"

    @function_tool()
    async def adjust_difficulty(
        self,
        context: RunContext,
        new_level: str,
        reason: str,
    ) -> str:
        """Adjust interview difficulty based on candidate performance."""
        old_level = self._difficulty_engine.current

        try:
            self._difficulty_engine.set_difficulty(new_level)
        except ValueError as e:
            return str(e)

        logger.info(f"Difficulty adjusted: {old_level} → {new_level} ({reason})")

        try:
            update = {
                "type": "difficulty_change",
                "from": old_level,
                "to": new_level,
                "reason": reason,
                "question_number": self._question_count,
            }
            # session = context.session
            # room = session.room
            job_ctx = get_job_context()
            if job_ctx.room and job_ctx.room.local_participant:
                await job_ctx.room.local_participant.publish_data(
                    json.dumps(update).encode(),
                    topic="interview_state",
                )
        except Exception as e:
            logger.warning(f"Could not publish difficulty update: {e}")

        return (
            f"Difficulty adjusted from {old_level} to {new_level}. "
            f"Adjust your questions accordingly — do NOT tell the candidate."
        )

    @function_tool()
    async def end_interview(self, context: RunContext) -> str:
        """
        End the interview and generate the feedback report.
        Call when: time is up, question limit reached, or candidate asks to stop.
        """
        if self._interview_ended:
            return "Interview has already ended."

        self._interview_ended = True

        feedback = compile_feedback(
            scores=self._scores,
            difficulty_progression=self._difficulty_engine.progression,
            domain_id=self._domain_id,
            topic_ids=self._topic_ids,
            starting_difficulty=self._starting_difficulty,
        )

        logger.info(
            f"Interview ended: {len(self._scores)} questions, "
            f"overall score: {feedback['overall_score']}"
        )
        
        try:
            logger.info(f"_config exists: {hasattr(self, '_config')}")
            logger.info(f"_config value: {getattr(self, '_config', 'NOT SET')}")
            import pymysql
            logger.info("pymysql imported successfully")
            from db import save_interview
            config = getattr(self, '_config', {})
            logger.info(f"Attempting DB save: domain={config.get('domain')}, email={config.get('user_email')}")
            save_interview(feedback, config)
        except Exception as e:
            logger.error(f"DB save failed: {e}", exc_info=True)

        try:
            # session = context.session
            # room = session.room
            job_ctx = get_job_context()
            if job_ctx.room and job_ctx.room.local_participant:
                await job_ctx.room.local_participant.publish_data(
                    json.dumps(feedback).encode(),
                    topic="interview_feedback",
                )
                logger.info("Feedback payload sent to frontend.")
                try:
                    user_email = getattr(self, '_config', {}).get('user_email', '')
                    if user_email:
                        send_feedback_email(user_email, feedback)
                        logger.info("Feedback email sent.")
                except Exception as e:
                    logger.warning(f"Email send failed: {e}")
        except Exception as e:
            logger.warning(f"Could not publish feedback: {e}")

        stats = self._difficulty_engine.get_stats()
        score_summary = feedback.get("overall_score", "N/A")
        strengths = feedback.get("overall_strengths", [])
        improvements = feedback.get("areas_to_improve", [])

        return (
            f"Interview complete. Key points to share:\n\n"
            f"Overall score: {score_summary}/10\n"
            f"Questions answered: {len(self._scores)}\n"
            f"Strongest areas: {', '.join(strengths) if strengths else 'N/A'}\n"
            f"Areas to improve: {', '.join(improvements) if improvements else 'N/A'}\n"
            f"Difficulty progression: {' → '.join(stats['progression'])}\n\n"
            f"Now deliver warm, encouraging closing feedback to the candidate. "
            f"Highlight their top 2-3 strengths, then suggest 2-3 areas for improvement. "
            f"End with encouragement."
        )


def _clamp(value: int, minimum: int = 1, maximum: int = 10) -> int:
    return max(minimum, min(maximum, value))
