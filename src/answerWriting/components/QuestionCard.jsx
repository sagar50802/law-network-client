// src/answerWriting/components/QuestionCard.jsx
import React, { useState } from "react";
import "../answerWriting.css";

export default function QuestionCard({
  question,
  onDelete,
  showAnswerToggle = false,
}) {
  const [showAns, setShowAns] = useState(false);

  if (!question) return null;

  return (
    <div className="aw-qcard">
      <div className="aw-qcard-header">
        <div className="aw-qcard-meta">
          {question.releaseAt && (
            <span className="aw-muted">
              Release:{" "}
              {new Date(question.releaseAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          )}
          {question.topicName && (
            <span className="aw-chip">Topic: {question.topicName}</span>
          )}
        </div>
        {onDelete && (
          <button
            className="aw-btn aw-btn-xs aw-btn-danger"
            onClick={onDelete}
          >
            Delete
          </button>
        )}
      </div>

      <div className="aw-qcard-body">
        {question.hindiText && (
          <>
            <div className="aw-label">प्रश्न (Hindi)</div>
            <p>{question.hindiText}</p>
          </>
        )}
        {question.englishText && (
          <>
            <div className="aw-label">Question (English)</div>
            <p>{question.englishText}</p>
          </>
        )}

        {showAnswerToggle &&
          (question.hindiAnswer || question.englishAnswer) && (
            <div className="aw-answer-toggle">
              <button
                type="button"
                className="aw-btn aw-btn-outline aw-btn-sm"
                onClick={() => setShowAns((v) => !v)}
              >
                {showAns ? "Hide Answer" : "Show Answer"}
              </button>

              {showAns && (
                <div className="aw-answer-block">
                  {question.hindiAnswer && (
                    <>
                      <div className="aw-label">उत्तर (Hindi)</div>
                      <p>{question.hindiAnswer}</p>
                    </>
                  )}
                  {question.englishAnswer && (
                    <>
                      <div className="aw-label">Answer (English)</div>
                      <p>{question.englishAnswer}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
