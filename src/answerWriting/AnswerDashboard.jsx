// src/answerWriting/AnswerDashboard.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchStudentDashboard } from "./api/answerWritingApi";
import "./answerWriting.css";

export default function AnswerDashboard() {
  const { examId } = useParams();
  const [progress, setProgress] = useState({ totalReleased: 0, totalQuestions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await fetchStudentDashboard(examId);
        setProgress(data.progress || { totalReleased: 0, totalQuestions: 0 });
      } catch (err) {
        console.error("fetchStudentDashboard error", err);
      } finally {
        setLoading(false);
      }
    }
    if (examId) load();
  }, [examId]);

  const released = progress.totalReleased || 0;
  const total = progress.totalQuestions || 0;

  return (
    <div className="aw-page">
      <div className="aw-page-header">
        <div>
          <div className="aw-pill">Answer Writing</div>
          <h1>Exam Dashboard</h1>
          <p className="aw-muted">
            Track questions released so far and attempt them in live mode.
          </p>
        </div>
        <div className="aw-stat-chip">
          Questions Released&nbsp;
          <strong>
            {released} / {total}
          </strong>
        </div>
      </div>

      <div className="aw-card">
        {loading ? (
          <p>Loading…</p>
        ) : (
          <>
            <p className="aw-muted">
              Live questions are released automatically. When a new question is
              live, you can open the live screen to see it with the exam timer.
            </p>
            <Link
              to={`/answer-writing/${examId}/live`}
              className="aw-btn aw-btn-primary"
            >
              Go to Live Question Screen
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
