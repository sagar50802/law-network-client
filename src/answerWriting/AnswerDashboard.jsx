import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchStudentDashboard } from "./api/answerWritingApi";
import "./answerWriting.css";

export default function AnswerDashboard() {
  const { examId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await fetchStudentDashboard(examId);
        setData(data);
      } catch (err) {
        console.error("fetchStudentDashboard error", err);
      }
    }
    load();
  }, [examId]);

  const totalReleased = data?.progress?.totalReleased || 0;
  const totalQuestions = data?.progress?.totalQuestions || 0;

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
        <div className="aw-page-header-right">
          <span className="aw-muted">Questions Released</span>
          <div className="aw-chip">
            {totalReleased} / {totalQuestions}
          </div>
        </div>
      </div>

      <div className="aw-card">
        <p>
          Live questions are released automatically. When a new question is live,
          you can open the live screen to see it with the exam timer.
        </p>
        <Link to={`/answer-writing/${examId}/live`} className="aw-btn aw-btn-primary">
          Go to Live Question Screen
        </Link>
      </div>
    </div>
  );
}
