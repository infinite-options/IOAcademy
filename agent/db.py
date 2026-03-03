"""
Supabase database integration.
Saves interview results for history and analytics.
"""

import json
import logging
import os

from supabase import create_client, Client

logger = logging.getLogger("mockprep")

_client: Client | None = None


def get_client() -> Client | None:
    global _client
    if _client:
        return _client

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")

    if not url or not key:
        logger.warning("Supabase credentials not set — skipping DB integration.")
        return None

    _client = create_client(url, key)
    return _client


def save_interview(
    feedback: dict,
    config: dict,
) -> bool:
    """
    Save a completed interview to the database.
    Returns True on success, False on failure.
    """
    client = get_client()
    if not client:
        return False

    try:
        row = {
            "user_name": config.get("user_name", ""),
            "user_email": config.get("user_email", ""),
            "domain": config.get("domain", ""),
            "difficulty": config.get("difficulty", ""),
            "length_mode": config.get("length_mode", "duration"),
            "duration": config.get("duration"),
            "question_count": config.get("question_count"),
            "overall_score": feedback.get("overall_score", 0),
            "category_averages": json.dumps(feedback.get("category_averages", {})),
            "questions": json.dumps(feedback.get("questions", [])),
            "difficulty_progression": json.dumps(feedback.get("difficulty_progression", [])),
            "overall_strengths": json.dumps(feedback.get("overall_strengths", [])),
            "areas_to_improve": json.dumps(feedback.get("areas_to_improve", [])),
        }

        client.table("interviews").insert(row).execute()
        logger.info(f"Interview saved to DB for {config.get('user_email', 'unknown')}")
        return True

    except Exception as e:
        logger.error(f"Failed to save interview to DB: {e}")
        return False