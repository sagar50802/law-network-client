// src/answerWriting/components/QuestionCard.jsx
import React from "react";
import "../answerWriting.css";

export default function QuestionCard({
  question,
  onDelete,
  onEdit,
  showStatus = true,
}) {
  if (!question) return null;

  const {
    code,
    hindiText,
    englishText,
    releaseAt,
    isReleased,
    topicName,
  } = question;

  const releaseLabel = releaseAt
    ? new Date(releaseAt).toLocaleString()
    : "Not scheduled";

  return (
    <div className="aw-question-card">
      <div className="aw-question-header">
        {code && <span className="aw-question-code">{code}</span>}
        {topicName && <span className="aw-question-topic">{topicName}</span>}

        {showStatus && (
          <span
            className={`aw-status-pill ${
              isReleased ? "aw-status-live" : "aw-status-pending"
            }`}
          >
            {isReleased ? "Released" : "Scheduled"}
          </span>
        )}
      </div>

      {hindiText && (
        <p className="aw-question-text aw-question-text-hi">{hindiText}</p>
      )}
      {englishText && (
        <p className="aw-question-text aw-question-text-en">{englishText}</p>
      )}

      <div className="aw-question-footer">
        <span className="aw-muted small">Release at: {releaseLabel}</span>
        <div className="aw-question-actions">
          {onEdit && (
            <button
              type="button"
              className="aw-btn aw-btn-ghost aw-btn-sm"
              onClick={onEdit}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="aw-btn aw-btn-danger aw-btn-sm"
              onClick={onDelete}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
