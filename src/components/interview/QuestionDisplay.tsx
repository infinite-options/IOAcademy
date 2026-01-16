/**
 * Component to display interview questions
 */

import React from "react";
import { Question } from "../../types/interview";
import "./interview.scss";

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions?: number;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  questionNumber,
  totalQuestions,
}) => {
  return (
    <div className="question-display">
      <div className="question-header">
        <span className="question-number">
          Question {questionNumber}{totalQuestions ? ` of ${totalQuestions}` : ""}
        </span>
        <span className={`difficulty-badge difficulty-${question.difficulty}`}>
          {question.difficulty}
        </span>
        <span className="topic-badge">{question.topic}</span>
      </div>
      <div className="question-text">{question.question}</div>
      {question.key_points && question.key_points.length > 0 && (
        <div className="key-points">
          <strong>Key points to cover:</strong>
          <ul>
            {question.key_points.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QuestionDisplay;

