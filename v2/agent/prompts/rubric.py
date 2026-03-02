"""
Scoring rubric definitions.

Defines the 5 dimensions candidates are scored on,
and generates the rubric section of the system prompt.
"""

SCORING_DIMENSIONS = {
    "technical_accuracy": {
        "label": "Technical Accuracy",
        "description": "Correctness of technical content, facts, and terminology.",
        "levels": {
            "1-2": "Major misconceptions or incorrect information",
            "3-4": "Partially correct but with notable gaps or errors",
            "5-6": "Mostly correct with minor inaccuracies",
            "7-8": "Accurate with good understanding of nuances",
            "9-10": "Exceptionally precise, demonstrates expert knowledge",
        },
    },
    "depth": {
        "label": "Depth of Knowledge",
        "description": "How deep and nuanced the explanation is. Does the candidate go beyond surface-level?",
        "levels": {
            "1-2": "Surface-level only, textbook definitions",
            "3-4": "Some depth but stays in comfort zone",
            "5-6": "Reasonable depth with some real-world awareness",
            "7-8": "Strong depth, discusses internals, edge cases, and trade-offs",
            "9-10": "Exceptional depth — could teach a masterclass on this",
        },
    },
    "communication": {
        "label": "Communication & Clarity",
        "description": "How clearly and concisely the candidate explains concepts.",
        "levels": {
            "1-2": "Disorganized, hard to follow, excessive filler",
            "3-4": "Understandable but rambling or unclear structure",
            "5-6": "Clear enough with decent structure",
            "7-8": "Well-structured, concise, easy to follow",
            "9-10": "Exceptionally articulate — explains complex topics simply",
        },
    },
    "problem_solving": {
        "label": "Problem Solving Approach",
        "description": "How the candidate approaches thinking through problems and unknowns.",
        "levels": {
            "1-2": "No visible thought process, guesses at answers",
            "3-4": "Some structure but jumps to conclusions",
            "5-6": "Reasonable approach, considers a few options",
            "7-8": "Strong systematic thinking, weighs trade-offs well",
            "9-10": "Exceptional — breaks down ambiguity, considers constraints proactively",
        },
    },
    "practical_experience": {
        "label": "Practical Experience",
        "description": "Evidence of real-world application, war stories, and hands-on knowledge.",
        "levels": {
            "1-2": "Purely theoretical, no real-world examples",
            "3-4": "Limited examples, mostly from tutorials or coursework",
            "5-6": "Some real-world experience, a few concrete examples",
            "7-8": "Strong practical knowledge with specific, relevant stories",
            "9-10": "Deep battle scars — rich, detailed production experience",
        },
    },
}


def get_rubric_prompt() -> str:
    """Generate the scoring rubric section for the system prompt."""
    lines = [
        "## Scoring Rubric",
        "",
        "After EACH candidate answer, use the `score_answer` tool to rate their response.",
        "Score each dimension from 1 to 10:",
        "",
    ]

    for dim_id, dim in SCORING_DIMENSIONS.items():
        lines.append(f"### {dim['label']} (`{dim_id}`)")
        lines.append(dim["description"])
        for range_str, desc in dim["levels"].items():
            lines.append(f"  - **{range_str}**: {desc}")
        lines.append("")

    lines.extend([
        "**Important scoring guidelines:**",
        "- Be calibrated: a '7' should mean genuinely good, not just 'answered the question'.",
        "- Adjust expectations to the candidate's stated difficulty level.",
        "  A junior giving a solid junior-level answer is a 7-8, not a 5 because it lacks senior depth.",
        "- Always provide specific `strengths` and `improvements` — never generic praise.",
    ])

    return "\n".join(lines)
