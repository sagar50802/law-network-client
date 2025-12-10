// src/pages/QnaExamList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPublicExams } from "../utils/qnaApi";
import "../styles/qna.css";

const QnaExamList = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchPublicExams()
      .then((data) => {
        if (mounted) setExams(data.exams || []);
      })
      .catch((err) => {
        console.error(err);
        if (mounted) setError("Failed to load exams.");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="qna-page">
      <div className="qna-page-header">
        <h1>QnA Exam Platform</h1>
        <p>Select an exam to begin your study session</p>
      </div>

      {loading && <p className="qna-muted">Loading exams...</p>}
      {error && <p className="qna-error">{error}</p>}

      <div className="qna-card-list">
        {exams.map((exam) => (
          <div key={exam._id} className="qna-card">
            <div className="qna-card-header">
              <div className="qna-icon-stack" />
              {exam.locked ? (
                <span className="qna-lock qna-lock--locked" />
              ) : (
                <span className="qna-lock qna-lock--unlocked" />
              )}
            </div>
            <h3 className="qna-card-title">{exam.title}</h3>
            <p className="qna-card-subtitle">
              {exam.description || "No description"}
            </p>

            {exam.locked ? (
              <button className="qna-btn qna-btn-locked" disabled>
                Locked
              </button>
            ) : (
              <button
                className="qna-btn qna-btn-primary"
                onClick={() => navigate(`/qna/exams/${exam._id}/notebook`)}
              >
                Start Studying
              </button>
            )}
          </div>
        ))}

        {!loading && exams.length === 0 && (
          <p className="qna-muted">No exams available right now.</p>
        )}
      </div>
    </div>
  );
};

export default QnaExamList;

