import os
import logging
import resend

logger = logging.getLogger("mockprep")

resend.api_key = os.getenv("RESEND_API_KEY")

# Use Resend's sandbox domain until you verify your own
FROM_EMAIL = "MockPrep <onboarding@resend.dev>"


def send_feedback_email(to_email: str, feedback: dict) -> bool:
    """Send interview feedback report via email."""
    try:
        score = feedback.get("overall_score", "N/A")
        strengths = feedback.get("overall_strengths", [])
        improvements = feedback.get("areas_to_improve", [])
        questions = feedback.get("questions", [])

        # Build HTML body
        q_html = ""
        for q in questions:
            avg = sum(q["scores"].values()) / len(q["scores"])
            q_html += f"""
            <div style="border:1px solid #27272A;border-radius:12px;padding:16px;margin-bottom:12px;">
              <strong>Q{q['question_number']}: {q['question_text']}</strong>
              <div style="color:#22D3EE;font-size:18px;margin:8px 0;">Score: {avg:.1f}/10</div>
              <div style="color:#4ADE80;">✓ {', '.join(q.get('strengths', []))}</div>
              <div style="color:#FBBF24;">△ {', '.join(q.get('improvements', []))}</div>
            </div>"""

        html = f"""
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0A0A0B;color:#FAFAFA;padding:32px;border-radius:16px;">
          <h1 style="color:#22D3EE;">MockPrep Interview Report</h1>
          <div style="font-size:48px;font-weight:bold;color:#FAFAFA;">{score}/10</div>
          <h3 style="color:#4ADE80;">Strengths</h3>
          <ul>{''.join(f'<li>{s}</li>' for s in strengths)}</ul>
          <h3 style="color:#FBBF24;">Areas to Improve</h3>
          <ul>{''.join(f'<li>{s}</li>' for s in improvements)}</ul>
          <h2>Question Breakdown</h2>
          {q_html}
        </div>"""

        r = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"MockPrep Results — {score}/10",
            "html": html,
        })

        logger.info(f"Feedback email sent to {to_email}: {r}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False