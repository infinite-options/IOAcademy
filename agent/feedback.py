"""
Structured feedback compiler.

Takes all the raw score data from an interview and produces
a clean, structured feedback payload that can be sent to the frontend.
"""

import json
from prompts.rubric import SCORING_DIMENSIONS


def compile_feedback(
    scores: list[dict],
    difficulty_progression: list[str],
    domain_id: str,
    topic_ids: list[str],
    starting_difficulty: str,
) -> dict:
    """
    Compile all interview scores into a structured feedback report.

    Args:
        scores: List of per-question score dicts from the agent's score_answer tool.
        difficulty_progression: List of difficulty IDs showing how difficulty changed.
        domain_id: The interview domain.
        topic_ids: Focus topics.
        starting_difficulty: The difficulty the interview started at.

    Returns:
        Structured feedback dict ready to be serialized to JSON.
    """
    if not scores:
        return {
            "type": "interview_complete",
            "overall_score": 0,
            "category_averages": {},
            "questions": [],
            "difficulty_progression": difficulty_progression,
            "overall_strengths": [],
            "areas_to_improve": [],
            "summary": "No questions were scored during this interview.",
        }

    # Calculate per-dimension averages
    dim_totals: dict[str, list[int]] = {}
    for question in scores:
        for dim_id in SCORING_DIMENSIONS:
            if dim_id in question.get("scores", {}):
                dim_totals.setdefault(dim_id, []).append(question["scores"][dim_id])

    category_averages = {
        dim_id: round(sum(vals) / len(vals), 1)
        for dim_id, vals in dim_totals.items()
        if vals
    }

    # Overall score = average of all dimension averages
    overall_score = round(
        sum(category_averages.values()) / len(category_averages), 1
    ) if category_averages else 0

    # Collect all strengths and improvements
    all_strengths = [q["strengths"] for q in scores if q.get("strengths")]
    all_improvements = [q["improvements"] for q in scores if q.get("improvements")]

    # Identify top strengths and weaknesses by dimension
    sorted_dims = sorted(category_averages.items(), key=lambda x: x[1], reverse=True)
    top_dimensions = [
        SCORING_DIMENSIONS[dim_id]["label"]
        for dim_id, _ in sorted_dims[:2]
    ]
    weak_dimensions = [
        SCORING_DIMENSIONS[dim_id]["label"]
        for dim_id, _ in sorted_dims[-2:]
        if category_averages.get(dim_id, 10) < 7
    ]

    # Format question breakdown
    question_details = []
    for q in scores:
        question_details.append({
            "question_number": q.get("question_number", 0),
            "question_text": q.get("question_text", ""),
            "answer_summary": q.get("candidate_answer_summary", ""),
            "scores": q.get("scores", {}),
            "strengths": q.get("strengths", ""),
            "improvements": q.get("improvements", ""),
            "difficulty_at_time": q.get("difficulty_at_time", starting_difficulty),
        })

    # Determine recommended next practice
    final_difficulty = difficulty_progression[-1] if difficulty_progression else starting_difficulty
    recommended_difficulty = final_difficulty
    if overall_score >= 7.5:
        # Recommend the next level up
        levels = ["intern", "junior", "mid", "senior", "staff"]
        idx = levels.index(final_difficulty) if final_difficulty in levels else 2
        if idx < len(levels) - 1:
            recommended_difficulty = levels[idx + 1]

    return {
        "type": "interview_complete",
        "overall_score": overall_score,
        "category_averages": category_averages,
        "category_labels": {
            dim_id: dim["label"]
            for dim_id, dim in SCORING_DIMENSIONS.items()
        },
        "questions": question_details,
        "difficulty_progression": difficulty_progression,
        "starting_difficulty": starting_difficulty,
        "final_difficulty": final_difficulty,
        "overall_strengths": top_dimensions,
        "areas_to_improve": weak_dimensions,
        "question_strengths": all_strengths,
        "question_improvements": all_improvements,
        "domain": domain_id,
        "topics": topic_ids,
        "recommended_next": {
            "difficulty": recommended_difficulty,
            "focus_areas": weak_dimensions,
        },
    }


def feedback_to_json(feedback: dict) -> str:
    """Serialize feedback to a JSON string for transmission."""
    return json.dumps(feedback, indent=2)
