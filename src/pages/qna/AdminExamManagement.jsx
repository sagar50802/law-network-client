// src/pages/qna/AdminExamManagement.jsx
import React, { useEffect, useState } from "react";
import "./qna.css";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchExams,
  createExam,
  updateExam,
  deleteExam,
  toggleExamLock,
} from "./qnaApi";

const emptyExam = { name: "", description: "" };

const AdminExamManagement = () => {
  const [exams, setExams] = useState([]);
  const [editingExam, setEditingExam] = useState(null);
  const [form, setForm] = useState(emptyExam);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await fetchExams();
      setExams(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingExam(null);
    setForm(emptyExam);
    setShowForm(true);
  };

  const openEdit = (exam) => {
    setEditingExam(exam);
    setForm({ name: exam.name, description: exam.description });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExam) {
        await updateExam(editingExam._id, form);
      } else {
        await createExam(form);
      }
      setShowForm(false);
      setForm(emptyExam);
      setEditingExam(null);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (examId) => {
    if (!window.confirm("Delete this exam?")) return;
    try {
      await deleteExam(examId);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleLock = async (examId) => {
    try {
      await toggleExamLock(examId);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="qna-page">
      <Link to="/qna/admin" style={{ fontSize: 14, color: "#2563eb" }}>
        ← Back to Dashboard
      </Link>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h1
            className="qna-title"
            style={{ textAlign: "left", marginBottom: 4 }}
          >
            Exam Management
          </h1>
          <p className="qna-subtitle" style={{ textAlign: "left" }}>
            Create and manage exam entries
          </p>
        </div>
        <button className="qna-btn-primary" onClick={openCreate}>
          + New Exam
        </button>
      </div>

      {exams.map((exam) => (
        <div key={exam._id} style={{ marginBottom: 16 }}>
          <div className="qna-card">
            <div className="qna-card-row">
              <div className="qna-card-main">
                <div className="qna-exam-icon" />
                <div>
                  <div className="qna-exam-info-title">{exam.name}</div>
                  <div className="qna-exam-info-desc">{exam.description}</div>
                </div>
              </div>
              <div style={{ fontSize: 18 }}>
                {exam.isLocked ? "🔒" : "🔓"}
              </div>
            </div>

            <button
              className="qna-btn-primary"
              style={{ marginTop: 16 }}
              onClick={() =>
                navigate(`/qna/admin/syllabus?examId=${exam._id}`)
              }
            >
              📖 Manage Syllabus
            </button>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                className="qna-btn-secondary"
                onClick={() => openEdit(exam)}
              >
                ✏️ Edit
              </button>
              <button
                className="qna-btn-secondary"
                onClick={() => handleToggleLock(exam._id)}
              >
                {exam.isLocked ? "Unlock" : "Lock"}
              </button>
              <button
                className="qna-btn-danger"
                onClick={() => handleDelete(exam._id)}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        </div>
      ))}

      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div className="qna-card" style={{ width: 420, maxWidth: "90%" }}>
            <h3 style={{ marginBottom: 16, fontWeight: 600 }}>
              {editingExam ? "Edit Exam" : "New Exam"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 14 }}>Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    marginTop: 4,
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 14 }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    marginTop: 4,
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 16,
                }}
              >
                <button
                  type="button"
                  className="qna-btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="qna-btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExamManagement;
