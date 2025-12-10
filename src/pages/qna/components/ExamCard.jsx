// src/pages/qna/components/ExamCard.jsx
import React from "react";
import "../../qna/qna.css";

const ExamCard = ({ exam, onStart }) => {
  const isLocked = exam.isLocked;

  return (
    <div className="qna-card">
      <div className="qna-card-row">
        <div className="qna-card-main">
          <div className="qna-exam-icon" />
          <div>
            <div className="qna-exam-info-title">{exam.name}</div>
            <div className="qna-exam-info-desc">{exam.description}</div>
          </div>
        </div>
        {isLocked && (
          <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
            🔒 Locked
          </span>
        )}
      </div>

      <button
        className="qna-btn-primary"
        style={{ marginTop: 20 }}
        onClick={() => !isLocked && onStart(exam)}
        disabled={isLocked}
      >
        {isLocked ? "Locked" : "Start Studying"}
      </button>
    </div>
  );
};

export default ExamCard;
