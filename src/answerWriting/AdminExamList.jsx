// src/answerWriting/AdminExamList.jsx
import React, { useEffect, useState } from "react";
import { fetchExams, createExam } from "./api/answerWritingApi";
import "./answerWriting.css";

export default function AdminExamList({ onOpenExam }) {
  const [exams, setExams] = useState([]);
  const [newExamName, setNewExamName] = useState("");
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

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!newExamName.trim()) return;
    try {
      const res = await createExam({ name: newExamName.trim() });
      const created = res.data?.exam;
      if (created) {
        setExams((prev) => [...prev, created]);
        setNewExamName("");
      }
    } catch (err) {
      console.error("createExam error", err);
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
        {/* Exams list */}
        <div className="aw-card">
          <div className="aw-card-title">All Exams</div>

          {loading ? (
            <p>Loading…</p>
          ) : exams.length === 0 ? (
            <p className="aw-muted">No exams created yet.</p>
          ) : (
            <ul className="aw-exam-list">
              {exams.map((exam) => (
                <li key={exam._id}>
                  <button
                    type="button"
                    className="aw-exam-item-btn"
                    onClick={() => onOpenExam?.(exam._id)} // ✅ pass only id
                  >
                    {exam.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Create exam */}
        <div className="aw-card">
          <div className="aw-card-title">Create New Exam</div>
          <form className="aw-form" onSubmit={handleCreateExam}>
            <label className="aw-field">
              <span>Name</span>
              <input
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                placeholder="e.g. Bihar APO"
              />
            </label>
            <button className="aw-btn aw-btn-primary" type="submit">
              + Create Exam
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
