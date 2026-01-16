/**
 * Interview control buttons
 */

import React from "react";
import "./interview.scss";

interface InterviewControlsProps {
  onCancel: () => void;
}

const InterviewControls: React.FC<InterviewControlsProps> = ({ onCancel }) => {
  return (
    <div className="interview-controls">
      <button onClick={onCancel} className="cancel-button">
        Cancel Interview
      </button>
    </div>
  );
};

export default InterviewControls;

