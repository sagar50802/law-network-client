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

        // Always set array → prevents .map crash
        setExams(res.data?.exams || []);
      } catch (err) {
        console.error(err);
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
          <p className="aw-muted">Choose your exam to begin answer writing practice.</p>
        </div>
      </div>

      <div className="aw-card" style={{ padding: "20px" }}>
        {loading ? (
          <p>Loading…</p>
        ) : exams.length === 0 ? (
          <p>No exams available yet.</p>
        ) : (
          exams.map((exam) => (
            <a
              key={exam._id}
              href={`/answer-writing/${exam._id}`}
              className="aw-exam-card"
            >
              {/* cover image */}
              {exam.coverUrl && (
                <img src={exam.coverUrl} alt="" className="aw-exam-cover" />
              )}

              <div className="aw-exam-info">
                <h3>{exam.name}</h3>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
