"""
Domain & topic configuration loader.

Reads domains.json and provides helper functions for looking up
domain info, topics, and difficulty levels.
"""

import json
from pathlib import Path
from typing import Optional

_config: Optional[dict] = None


def load_domains_config() -> dict:
    """Load and cache the domains configuration from domains.json."""
    global _config
    if _config is None:
        config_path = Path(__file__).parent.parent / "domains.json"
        with open(config_path) as f:
            _config = json.load(f)
    return _config


def get_domain(domain_id: str) -> dict:
    """Get a domain by ID. Raises ValueError if not found."""
    config = load_domains_config()
    for domain in config["domains"]:
        if domain["id"] == domain_id:
            return domain
    available = [d["id"] for d in config["domains"]]
    raise ValueError(f"Unknown domain '{domain_id}'. Available: {available}")


def get_difficulty(difficulty_id: str) -> dict:
    """Get a difficulty level by ID. Raises ValueError if not found."""
    config = load_domains_config()
    for diff in config["difficulties"]:
        if diff["id"] == difficulty_id:
            return diff
    available = [d["id"] for d in config["difficulties"]]
    raise ValueError(f"Unknown difficulty '{difficulty_id}'. Available: {available}")


def get_all_domain_ids() -> list[str]:
    """Return list of all available domain IDs."""
    config = load_domains_config()
    return [d["id"] for d in config["domains"]]


def get_all_difficulty_ids() -> list[str]:
    """Return ordered list of all difficulty IDs (easiest to hardest)."""
    config = load_domains_config()
    return [d["id"] for d in sorted(config["difficulties"], key=lambda x: x["level"])]


def get_topic_labels(domain_id: str, topic_ids: list[str]) -> list[str]:
    """Convert topic IDs to their human-readable labels."""
    domain = get_domain(domain_id)
    topic_map = {t["id"]: t["label"] for t in domain["topics"]}
    return [topic_map.get(tid, tid) for tid in topic_ids]
