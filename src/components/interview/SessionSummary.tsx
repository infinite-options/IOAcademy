/**
 * Component to display interview session summary
 */

import React from "react";
import { InterviewSession, FeedbackResponse } from "../../types/interview";
import "./interview.scss";

interface SessionSummaryProps {
  feedback: FeedbackResponse;
  session: InterviewSession;
}

const SessionSummary: React.FC<SessionSummaryProps> = ({
  feedback,
  session,
}) => {
  const overallScore = feedback.final_scores?.overall_score;
  const scorePercentage = overallScore
    ? Math.round(overallScore * 100)
    : null;

  const topicScores = feedback.final_scores?.topic_scores || {};

  return (
    <div className="session-summary">
      <h2>Interview Complete</h2>

      <div className="summary-header">
        <div className="summary-info">
          <p>
            <strong>Candidate:</strong> {session.candidateName}
          </p>
          <p>
            <strong>Questions Asked:</strong> {session.questionsAsked.length}
          </p>
          {session.startTime && (
            <p>
              <strong>Duration:</strong>{" "}
              {session.endTime && session.startTime
                ? formatDuration(
                    session.endTime.getTime() - session.startTime.getTime()
                  )
                : "N/A"}
            </p>
          )}
        </div>

        {scorePercentage !== null && (
          <div className={`final-score score-${getScoreLevel(overallScore!)}`}>
            <div className="score-value">{scorePercentage}%</div>
            <div className="score-label">Overall Score</div>
          </div>
        )}
      </div>

      {feedback.feedback.overall_assessment && (
        <div className="overall-assessment">
          <h3>Overall Assessment</h3>
          <p>{feedback.feedback.overall_assessment}</p>
        </div>
      )}

      {feedback.feedback.strengths &&
        feedback.feedback.strengths.length > 0 && (
          <div className="summary-strengths">
            <h3>Strengths</h3>
            <ul>
              {feedback.feedback.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>
        )}

      {feedback.feedback.weaknesses &&
        feedback.feedback.weaknesses.length > 0 && (
          <div className="summary-weaknesses">
            <h3>Areas for Improvement</h3>
            <ul>
              {feedback.feedback.weaknesses.map((weakness, idx) => (
                <li key={idx}>{weakness}</li>
              ))}
            </ul>
          </div>
        )}

      {Object.keys(topicScores).length > 0 && (
        <div className="topic-scores">
          <h3>Topic Performance</h3>
          <div className="topic-scores-grid">
            {Object.entries(topicScores).map(([topic, score]) => (
              <div key={topic} className="topic-score-item">
                <span className="topic-name">{topic}</span>
                <span className={`topic-score score-${getScoreLevel(score)}`}>
                  {Math.round(score * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback.feedback.recommendations &&
        feedback.feedback.recommendations.length > 0 && (
          <div className="recommendations">
            <h3>Recommendations</h3>
            <ul>
              {feedback.feedback.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
};

function getScoreLevel(score: number): "high" | "medium" | "low" {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export default SessionSummary;

