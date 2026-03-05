"""
MySQL database integration via RDS.
"""

import json
import logging
import os

import pymysql

logger = logging.getLogger("mockprep")


def _get_connection():
    try:
        conn = pymysql.connect(
            host=os.environ.get("MYSQL_HOST"),
            port=int(os.environ.get("MYSQL_PORT", 3306)),
            user=os.environ.get("MYSQL_USER"),
            password=os.environ.get("MYSQL_PASSWORD"),
            database=os.environ.get("MYSQL_DATABASE"),
            autocommit=True,
        )
        logger.info("Connected to MySQL successfully.")
        return conn
    except Exception as e:
        logger.error(f"MySQL connection failed: {e}")
        raise


def save_interview(feedback: dict, config: dict) -> bool:
    try:
        logger.info(
            f"Saving interview: user={config.get('user_email', 'unknown')}, "
            f"domain={config.get('domain')}, score={feedback.get('overall_score')}"
        )
        conn = _get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO interviews (
                user_name, user_email, domain, difficulty,
                length_mode, duration, question_count,
                overall_score, category_averages, questions,
                difficulty_progression, overall_strengths, areas_to_improve
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                config.get("user_name", ""),
                config.get("user_email", ""),
                config.get("domain", ""),
                config.get("difficulty", ""),
                config.get("length_mode", "duration"),
                config.get("duration"),
                config.get("question_count"),
                feedback.get("overall_score", 0),
                json.dumps(feedback.get("category_averages", {})),
                json.dumps(feedback.get("questions", [])),
                json.dumps(feedback.get("difficulty_progression", [])),
                json.dumps(feedback.get("overall_strengths", [])),
                json.dumps(feedback.get("areas_to_improve", [])),
            ),
        )

        cursor.close()
        conn.close()
        logger.info(f"Interview saved to DB for {config.get('user_email', 'unknown')}")
        return True

    except pymysql.err.OperationalError as e:
        logger.error(f"MySQL operational error (check credentials/network): {e}")
        return False
    except pymysql.err.ProgrammingError as e:
        logger.error(f"MySQL programming error (check table/schema): {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to save interview to DB: {e}")
        return False