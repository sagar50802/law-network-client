import React, { useEffect, useState } from "react";
import { fetchExams } from "./api/answerWritingApi";
import "./answerWriting.css";

export default function AnswerExamList() {
  const [exams, setExams] = useState([]);

  useEffect(() => {
    fetchExams().then(({ data }) => setExams(data));
  }, []);

  return (
    <div className="aw-page">
      <div className="aw-page-header">
        <h1>Select Your Exam</h1>
      </div>

      <div className="aw-card">
        {exams.length === 0 ? (
          <p className="aw-muted">No exams available yet.</p>
        ) : (
          exams.map((e) => (
            <a
              key={e._id}
              href={`/answer-writing/${e._id}`}
              className="aw-btn aw-btn-primary"
            >
              {e.name}
            </a>
          ))
        )}
      </div>
    </div>
  );
}
