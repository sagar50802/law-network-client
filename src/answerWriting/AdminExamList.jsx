import React, { useEffect, useState } from "react";
import { fetchExams, createExam } from "./api/answerWritingApi";
import "./answerWriting.css";

export default function AdminExamList({ onOpenExam }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newExamName, setNewExamName] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await fetchExams();
        setExams(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!newExamName.trim()) return;

    try {
      const { data } = await createExam({ name: newExamName });

      setExams((prev) => [...prev, data]);
      setNewExamName("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="aw-page">
      <div className="aw-page-header">
        <div>
          <div className="aw-pill">Admin · Answer Writing</div>
          <h1>Exam Management</h1>
        </div>
      </div>

      <div className="aw-grid aw-grid-2col">
        <div className="aw-card">
          <div className="aw-card-title">All Exams</div>

          {loading ? (
            <div className="aw-spinner small" />
          ) : exams.length === 0 ? (
            <p className="aw-muted">No exams yet.</p>
          ) : (
            <ul className="aw-exam-list">
              {exams.map((exam) => (
                <li key={exam._id} className="aw-exam-item">
                  <button
                    type="button"
                    className="aw-exam-main"
                    onClick={() => onOpenExam(exam)}
                  >
                    <span className="aw-exam-name">{exam.name}</span>
                    <span className="aw-muted">{exam.unitCount ?? 0} units</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="aw-card">
          <div className="aw-card-title">Create New Exam</div>

          <form className="aw-form" onSubmit={handleCreateExam}>
            <label className="aw-field">
              <span>Name</span>
              <input
                type="text"
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                placeholder="e.g. Bihar APO"
              />
            </label>

            <button type="submit" className="aw-btn aw-btn-primary">
              + Create Exam
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
