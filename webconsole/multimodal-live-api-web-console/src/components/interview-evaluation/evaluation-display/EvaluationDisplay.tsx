// src/components/interview-evaluation/evaluation-display/EvaluationDisplay.tsx
import React from "react";
import { useInterviewStore } from "../../../stores/interviewStore";
import "./evaluation-display.scss";

const EvaluationDisplay: React.FC = () => {
  const { evaluationFeedback, scores } = useInterviewStore();

  if (!evaluationFeedback) {
    return null;
  }

  // Split the feedback into sections
  const sections = evaluationFeedback
    .split(
      /##\s+|(?=TECHNICAL SKILLS ASSESSMENT|COMMUNICATION ASSESSMENT|OVERALL FEEDBACK)/i
    )
    .filter((section) => section.trim().length > 0);

  return (
    <div className="evaluation-display">
      <h2>Interview Evaluation</h2>

      {scores && (
        <div className="evaluation-scores">
          <div className="score-card technical">
            <div className="score-value">{scores.technical}</div>
            <div className="score-label">Technical</div>
          </div>
          <div className="score-card communication">
            <div className="score-value">{scores.communication}</div>
            <div className="score-label">Communication</div>
          </div>
          <div className="score-card overall">
            <div className="score-value">
              {Math.round((scores.technical + scores.communication) / 2)}
            </div>
            <div className="score-label">Overall</div>
          </div>
        </div>
      )}

      <div className="evaluation-sections">
        {sections.map((section, index) => {
          const isHeading =
            section.includes("ASSESSMENT") || section.includes("FEEDBACK");
          const sectionType = section.includes("TECHNICAL")
            ? "technical"
            : section.includes("COMMUNICATION")
            ? "communication"
            : section.includes("OVERALL")
            ? "overall"
            : "";

          if (isHeading) {
            return (
              <h3 key={index} className={`section-heading ${sectionType}`}>
                {section.trim()}
              </h3>
            );
          } else {
            return (
              <div key={index} className="section-content">
                {section.split("\n").map((line, lineIndex) => {
                  if (line.includes("Score:")) {
                    return (
                      <div key={lineIndex} className="score-line">
                        {line.trim()}
                      </div>
                    );
                  } else {
                    return <p key={lineIndex}>{line.trim()}</p>;
                  }
                })}
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

export default EvaluationDisplay;
