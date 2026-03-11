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
    <body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:24px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">

            <!-- Header -->
            <tr>
              <td style="background-color:#0A0A0B; padding:24px 32px; text-align:center;">
                <span style="color:#22D3EE; font-size:24px; font-weight:bold;">MockPrep</span>
                <br/>
                <span style="color:#a1a1aa; font-size:14px;">Interview Performance Report</span>
              </td>
            </tr>

            <!-- Score -->
            <tr>
              <td style="padding:32px; text-align:center; border-bottom:1px solid #e4e4e7;">
                <span style="font-size:48px; font-weight:bold; color:#0A0A0B;">{overall}</span>
                <span style="font-size:20px; color:#71717a;">/10</span>
                <br/>
                <span style="color:#71717a; font-size:14px;">Overall Score</span>
              </td>
            </tr>

            <!-- Strengths -->
            <tr>
              <td style="padding:24px 32px;">
                <h3 style="margin:0 0 12px; color:#16a34a; font-size:16px;">Strengths</h3>
                {"".join(f'<p style="margin:4px 0; color:#27272a; font-size:14px;">&#x2713; {s}</p>' for s in strengths)}
              </td>
            </tr>

            <!-- Areas to Improve -->
            <tr>
              <td style="padding:0 32px 24px; border-bottom:1px solid #e4e4e7;">
                <h3 style="margin:0 0 12px; color:#dc2626; font-size:16px;">Areas to Improve</h3>
                {"".join(f'<p style="margin:4px 0; color:#27272a; font-size:14px;">&#x2022; {s}</p>' for s in improvements)}
              </td>
            </tr>

            <!-- Questions -->
            <tr>
              <td style="padding:24px 32px;">
                <h3 style="margin:0 0 16px; color:#0A0A0B; font-size:16px;">Question Breakdown</h3>
    """

    for q in questions:
        q_scores = q.get("scores", {})
        avg = sum(q_scores.values()) / len(q_scores) if q_scores else 0
        q_strengths = q.get('strengths', 'N/A')
        q_improvements = q.get('improvements', 'N/A')
        if isinstance(q_strengths, list):
            q_strengths = ", ".join(q_strengths)
        if isinstance(q_improvements, list):
            q_improvements = ", ".join(q_improvements)

        html += f"""
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb; border-radius:6px; margin-bottom:12px; border:1px solid #e4e4e7;">
                  <tr>
                    <td style="padding:16px;">
                      <p style="margin:0 0 8px; font-size:14px; color:#0A0A0B;"><strong>Q{q.get('question_number', '?')}:</strong> {q.get('question_text', '')}</p>
                      <p style="margin:0 0 4px; font-size:13px; color:#71717a;">Score: <strong style="color:#0A0A0B;">{avg:.1f}/10</strong></p>
                      <p style="margin:0 0 4px; font-size:13px; color:#16a34a;">Strengths: {q_strengths}</p>
                      <p style="margin:0; font-size:13px; color:#dc2626;">Improve: {q_improvements}</p>
                    </td>
                  </tr>
                </table>
        """

    html += """
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px; background-color:#f9fafb; text-align:center; border-top:1px solid #e4e4e7;">
                <span style="color:#a1a1aa; font-size:12px;">Sent by MockPrep — AI Mock Interview Platform</span>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
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