// src/answerWriting/AnswerExamList.jsx
import React, { useEffect, useState } from "react";
import { fetchExams } from "./api/answerWritingApi";
import "./answerWriting.css";

export default function AnswerExamList() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchExams();
        setExams(res.data?.exams || []);
      } catch (err) {
        console.error("fetchExams error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="aw-page">
      <div className="aw-page-header">
        <div>
          <div className="aw-pill">Answer Writing</div>
          <h1>Select Your Exam</h1>
          <p className="aw-muted">
            Choose your exam to begin answer writing practice.
          </p>
        </div>
      </div>

      <div className="aw-card">
        {loading ? (
          <p>Loading…</p>
        ) : exams.length === 0 ? (
          <p>No exams available yet.</p>
        ) : (
          <ul className="aw-exam-list">
            {exams.map((exam) => (
              <li key={exam._id}>
                <a
                  href={`/answer-writing/${exam._id}`}
                  className="aw-exam-item-btn"
                >
                  {exam.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
