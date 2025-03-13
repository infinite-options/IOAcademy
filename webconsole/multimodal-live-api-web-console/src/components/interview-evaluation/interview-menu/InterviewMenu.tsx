// src/components/interview-menu/InterviewMenu.tsx
import React, { useState } from "react";
import "./interview-menu.scss";

export type InterviewType =
  | "general"
  | "frontend"
  | "backend"
  | "fullstack"
  | "data";
export type SkillLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

interface InterviewMenuProps {
  onSelectionComplete: (type: InterviewType, initialLevel: SkillLevel) => void;
}

const InterviewMenu: React.FC<InterviewMenuProps> = ({
  onSelectionComplete,
}) => {
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);
  const [showSkillAssessment, setShowSkillAssessment] = useState(false);

  const handleTypeSelection = (type: InterviewType) => {
    setSelectedType(type);
    setShowSkillAssessment(true);
  };

  const handleStartInterview = (initialLevel: SkillLevel) => {
    if (selectedType) {
      onSelectionComplete(selectedType, initialLevel);
    }
  };

  return (
    <div className="interview-menu">
      <h2>Technical Interview System</h2>

      {!showSkillAssessment && (
        <div className="interview-type-selection">
          <h3>Select Interview Type</h3>
          <div className="interview-type-buttons">
            <button onClick={() => handleTypeSelection("frontend")}>
              Front End Engineer
            </button>
            <button onClick={() => handleTypeSelection("backend")}>
              Backend Engineer
            </button>
            <button onClick={() => handleTypeSelection("fullstack")}>
              Fullstack Developer
            </button>
            <button onClick={() => handleTypeSelection("data")}>
              Data Engineer
            </button>
            <button onClick={() => handleTypeSelection("general")}>
              General Interview
            </button>
          </div>
        </div>
      )}

      {showSkillAssessment && selectedType && (
        <div className="skill-assessment">
          <h3>What is your experience level?</h3>
          <p>
            This helps us tailor the interview to an appropriate starting
            difficulty.
          </p>

          <div className="skill-level-selection">
            <button onClick={() => handleStartInterview(1)}>
              Beginner (1-2)
              <span className="level-description">
                Just starting out with basic concepts
              </span>
            </button>
            <button onClick={() => handleStartInterview(3)}>
              Junior (3-4)
              <span className="level-description">
                Familiar with fundamentals, some practical experience
              </span>
            </button>
            <button onClick={() => handleStartInterview(5)}>
              Mid-level (5-6)
              <span className="level-description">
                Solid practical experience, comfortable with standard tasks
              </span>
            </button>
            <button onClick={() => handleStartInterview(7)}>
              Senior (7-8)
              <span className="level-description">
                Advanced knowledge, significant project experience
              </span>
            </button>
            <button onClick={() => handleStartInterview(9)}>
              Expert (9-10)
              <span className="level-description">
                Deep expertise, mastery of advanced concepts
              </span>
            </button>
          </div>

          <button
            className="back-button"
            onClick={() => {
              setSelectedType(null);
              setShowSkillAssessment(false);
            }}
          >
            Back to Interview Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default InterviewMenu;
