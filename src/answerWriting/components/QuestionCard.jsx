import React from "react";

export default function QuestionCard({
  question,
  showStatus = true,
  onEdit,
  onDelete,
}) {
  if (!question) return null;

  const {
    code,
    title,
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
    <div className="aw-card aw-question-card">
      <div className="aw-card-header">
        <div>
          <div className="aw-question-code">{code || "Q1"}</div>
          <div className="aw-question-topic">{topicName}</div>
        </div>
        {showStatus && (
          <div className="aw-question-status">
            <span
              className={
                "aw-status-dot " + (isReleased ? "aw-status-live" : "")
              }
            />
            <span>{isReleased ? "Live" : "Scheduled"}</span>
          </div>
        )}
      </div>

      {title && <div className="aw-question-title">{title}</div>}

      <div className="aw-question-body">
        {hindiText && (
          <div className="aw-question-block aw-question-hindi">
            <div className="aw-question-lang">Q (हिन्दी)</div>
            <p>{hindiText}</p>
          </div>
        )}
        {englishText && (
          <div className="aw-question-block aw-question-english">
            <div className="aw-question-lang">Q (English)</div>
            <p>{englishText}</p>
          </div>
        )}
      </div>

      <div className="aw-question-footer">
        <span className="aw-muted">Releases at: {releaseLabel}</span>
        {(onEdit || onDelete) && (
          <div className="aw-question-actions">
            {onEdit && (
              <button className="aw-btn aw-btn-ghost" onClick={onEdit}>
                Edit
              </button>
            )}
            {onDelete && (
              <button className="aw-btn aw-btn-danger" onClick={onDelete}>
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
