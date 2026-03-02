"""
Adaptive difficulty engine.

Tracks candidate performance across answers and recommends
difficulty adjustments based on a rolling window of scores.
"""

from prompts.domains import get_all_difficulty_ids


# Thresholds for difficulty adjustment
ESCALATE_THRESHOLD = 7.5    # Average score above this → go harder
DEESCALATE_THRESHOLD = 4.0  # Average score below this → go easier
WINDOW_SIZE = 2             # Number of recent answers to consider


class DifficultyEngine:
    """
    Tracks scores and manages adaptive difficulty transitions.

    The engine maintains a rolling window of recent answer scores
    and recommends escalation or de-escalation based on thresholds.
    """

    def __init__(self, starting_difficulty: str):
        self._levels = get_all_difficulty_ids()
        self._current = starting_difficulty
        self._history: list[dict] = []  # All scores in order
        self._progression: list[str] = [starting_difficulty]  # Difficulty at each point

        if starting_difficulty not in self._levels:
            raise ValueError(
                f"Unknown difficulty '{starting_difficulty}'. "
                f"Available: {self._levels}"
            )

    @property
    def current(self) -> str:
        """Current difficulty level ID."""
        return self._current

    @property
    def current_index(self) -> int:
        """Current difficulty as a 0-based index."""
        return self._levels.index(self._current)

    @property
    def progression(self) -> list[str]:
        """Full history of difficulty levels throughout the interview."""
        return self._progression.copy()

    def record_score(self, scores: dict[str, int]) -> None:
        """
        Record a new answer's scores.

        Args:
            scores: Dict of dimension_id -> score (1-10)
        """
        self._history.append(scores)

    def should_adjust(self) -> str | None:
        """
        Check if difficulty should be adjusted based on recent performance.

        Returns:
            New difficulty ID if adjustment is recommended, None otherwise.
        """
        if len(self._history) < WINDOW_SIZE:
            return None

        # Get the last WINDOW_SIZE answers
        recent = self._history[-WINDOW_SIZE:]

        # Calculate average score across all dimensions for recent answers
        all_scores = []
        for answer_scores in recent:
            all_scores.extend(answer_scores.values())

        avg = sum(all_scores) / len(all_scores) if all_scores else 5.0

        current_idx = self.current_index

        if avg >= ESCALATE_THRESHOLD and current_idx < len(self._levels) - 1:
            return self._levels[current_idx + 1]
        elif avg <= DEESCALATE_THRESHOLD and current_idx > 0:
            return self._levels[current_idx - 1]

        return None

    def set_difficulty(self, new_difficulty: str) -> None:
        """
        Manually set the difficulty level.

        Args:
            new_difficulty: The new difficulty level ID.
        """
        if new_difficulty not in self._levels:
            raise ValueError(f"Unknown difficulty '{new_difficulty}'")
        self._current = new_difficulty
        self._progression.append(new_difficulty)

    def get_stats(self) -> dict:
        """Get summary statistics for the difficulty engine."""
        if not self._history:
            return {
                "questions_answered": 0,
                "current_difficulty": self._current,
                "progression": self._progression,
            }

        # Calculate overall averages per dimension
        dim_totals: dict[str, list[int]] = {}
        for answer_scores in self._history:
            for dim, score in answer_scores.items():
                dim_totals.setdefault(dim, []).append(score)

        dim_averages = {
            dim: round(sum(scores) / len(scores), 1)
            for dim, scores in dim_totals.items()
        }

        all_scores = [s for scores in self._history for s in scores.values()]
        overall_avg = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0

        return {
            "questions_answered": len(self._history),
            "current_difficulty": self._current,
            "overall_average": overall_avg,
            "dimension_averages": dim_averages,
            "progression": self._progression,
        }
