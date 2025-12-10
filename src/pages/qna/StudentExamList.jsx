// src/pages/qna/StudentExamList.jsx
import React, { useEffect, useState } from "react";
import "./qna.css";
import ExamCard from "./components/ExamCard";
import { fetchExams } from "./qnaApi";
import { useNavigate } from "react-router-dom";

const StudentExamList = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchExams();
        setExams(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleStart = (exam) => {
    navigate(`/qna/exams/${exam._id}`);
  };

  return (
    <div className="qna-page">
      <h1 className="qna-title">QnA Exam Platform</h1>
      <p className="qna-subtitle">
        Select an exam to begin your study session
      </p>

      {loading && <p>Loading...</p>}

      {!loading && exams.length === 0 && (
        <p style={{ textAlign: "center", color: "#6b7280" }}>
          No exams available yet.
        </p>
      )}

      {exams.map((exam) => (
        <div key={exam._id} style={{ marginTop: 24 }}>
          <ExamCard exam={exam} onStart={handleStart} />
        </div>
      ))}
    </div>
  );
};

export default StudentExamList;
