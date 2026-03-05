"""
Email service using SMTP.
Sends interview feedback to candidates.
"""

import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("mockprep")


def send_feedback_email(to_email: str, feedback: dict) -> None:
    sender_email = os.environ.get("SUPPORT_EMAIL")
    sender_password = os.environ.get("SUPPORT_PASSWORD")
    sender_name = os.environ.get("MAIL_DEFAULT_SENDER", sender_email)
    smtp_host = os.environ.get("MAIL_SERVER", "smtp.mydomain.com")
    smtp_port = int(os.environ.get("MAIL_PORT", 465))

    if not sender_email or not sender_password:
        logger.warning("SMTP credentials not set — skipping email.")
        return

    overall = feedback.get("overall_score", "N/A")
    strengths = feedback.get("overall_strengths", [])
    improvements = feedback.get("areas_to_improve", [])
    questions = feedback.get("questions", [])

    html = f"""
    <html>
    <body style="font-family: sans-serif; background: #0A0A0B; color: #E4E4E7; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <h1 style="color: #22D3EE;">MockPrep Interview Results</h1>
        <p style="font-size: 18px;">Overall Score: <strong>{overall}/10</strong></p>

        <h3 style="color: #4ADE80;">Strengths</h3>
        <ul>{"".join(f"<li>{s}</li>" for s in strengths)}</ul>

        <h3 style="color: #F87171;">Areas to Improve</h3>
        <ul>{"".join(f"<li>{s}</li>" for s in improvements)}</ul>

        <h3 style="color: #22D3EE;">Question Breakdown</h3>
    """

    for q in questions:
        q_scores = q.get("scores", {})
        avg = sum(q_scores.values()) / len(q_scores) if q_scores else 0
        html += f"""
        <div style="background: #18181B; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <p><strong>Q{q.get('question_number', '?')}:</strong> {q.get('question_text', '')}</p>
          <p>Score: {avg:.1f}/10</p>
          <p style="color: #4ADE80;">Strengths: {q.get('strengths', 'N/A')}</p>
          <p style="color: #F87171;">Improve: {q.get('improvements', 'N/A')}</p>
        </div>
        """

    html += """
        <p style="color: #71717A; font-size: 12px; margin-top: 24px;">
          Sent by MockPrep — AI Mock Interview Platform
        </p>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"MockPrep Results — Score: {overall}/10"
    msg["From"] = sender_email
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        logger.info(f"SMTP config: host={smtp_host}, port={smtp_port}")
        logger.info(f"SMTP sender: email={sender_email}, name={sender_name}")
        logger.info(f"SMTP recipient: {to_email}")
        logger.info(f"SMTP From header: {msg['From']}")
        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
            server.set_debuglevel(0)
            logger.info("SMTP connected, attempting login...")
            server.login(sender_email, sender_password)
            logger.info("SMTP login successful, sending...")
            server.sendmail(sender_email, to_email, msg.as_string())
        logger.info(f"Feedback email sent to {to_email}")
    except Exception as e:
        logger.error(f"SMTP email failed: {e}")
        raise