/**
 * Component to display evaluation results
 */

import React from "react";
import { Evaluation } from "../../types/interview";
import "./interview.scss";

interface EvaluationDisplayProps {
  evaluation: Evaluation;
}

const EvaluationDisplay: React.FC<EvaluationDisplayProps> = ({
  evaluation,
}) => {
  const scorePercentage = Math.round(evaluation.score * 100);

  return (
    <div className="evaluation-display">
      <div className="evaluation-header">
        <h3>Evaluation</h3>
        <div className={`score-badge score-${getScoreLevel(evaluation.score)}`}>
          {scorePercentage}%
        </div>
      </div>

      <div className="score-explanation">
        <p>{evaluation.explanation}</p>
      </div>

      {evaluation.strengths && evaluation.strengths.length > 0 && (
        <div className="strengths">
          <h4>Strengths</h4>
          <ul>
            {evaluation.strengths.map((strength, idx) => (
              <li key={idx}>{strength}</li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
        <div className="weaknesses">
          <h4>Areas for Improvement</h4>
          <ul>
            {evaluation.weaknesses.map((weakness, idx) => (
              <li key={idx}>{weakness}</li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.key_points_covered &&
        evaluation.key_points_covered.length > 0 && (
          <div className="key-points-covered">
            <h4>Key Points Covered</h4>
            <ul>
              {evaluation.key_points_covered.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
        )}

      {evaluation.key_points_missing &&
        evaluation.key_points_missing.length > 0 && (
          <div className="key-points-missing">
            <h4>Key Points Missing</h4>
            <ul>
              {evaluation.key_points_missing.map((point, idx) => (
                <li key={idx}>{point}</li>
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

export default EvaluationDisplay;

