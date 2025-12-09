import React, { useEffect, useState } from "react";
import { fetchExams } from "../utils/qnaApi";
import { useNavigate } from "react-router-dom";

export default function AdminQnAExams() {
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExams().then(setExams);
  }, []);

  return (
    <div className="qna-root" style={{ padding: "20px" }}>
      <h1>QnA Admin – Exams</h1>

      <div className="exam-grid">
        {exams.map((exam) => (
          <div
            className="exam-card"
            key={exam.id}
            onClick={() => navigate(`/admin/qna/syllabus/${exam.id}`)}
          >
            <h3>{exam.name}</h3>
            <p>{exam.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
