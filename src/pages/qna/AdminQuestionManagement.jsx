// src/pages/qna/AdminQuestionManagement.jsx
import React, { useEffect, useState } from "react";
import "./qna.css";
import { Link, useLocation } from "react-router-dom";
import {
  fetchQuestionsBySubtopic,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "./qnaApi";

const useQuery = () => new URLSearchParams(useLocation().search);

const emptyForm = {
  questionText: "",
  answerText: "",
  releaseAt: "",
};

const AdminQuestionManagement = () => {
  const query = useQuery();
  const subtopicId = query.get("subtopicId");

  const [questions, setQuestions] = useState([]);
  const [modal, setModal] = useState(null); // {mode, id, form}
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!subtopicId) return;
    setLoading(true);
    try {
      const res = await fetchQuestionsBySubtopic(subtopicId);
      setQuestions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [subtopicId]);

  const openCreate = () => {
    setModal({ mode: "create", id: null, form: emptyForm });
  };

  const openEdit = (q) => {
    setModal({
      mode: "edit",
      id: q._id,
      form: {
        questionText: q.questionText,
        answerText: q.answerText,
        releaseAt: new Date(q.releaseAt).toISOString().slice(0, 16),
      },
    });
  };

  const closeModal = () => setModal(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!modal) return;
    try {
      if (modal.mode === "create") {
        await createQuestion(subtopicId, modal.form);
      } else {
        await updateQuestion(modal.id, modal.form);
      }
      closeModal();
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete question?")) return;
    try {
      await deleteQuestion(id);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="qna-page">
      <Link
        to="/qna/admin/syllabus"
        style={{ fontSize: 14, color: "#2563eb" }}
      >
        ← Back to Syllabus
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <h1
            className="qna-title"
            style={{ textAlign: "left", marginBottom: 4 }}
          >
            Question Management
          </h1>
          <p className="qna-subtitle" style={{ textAlign: "left" }}>
            Create questions with answers and schedule releases
          </p>
        </div>
        <button
          className="qna-btn-primary"
          disabled={!subtopicId}
          onClick={openCreate}
        >
          + New Question
        </button>
      </div>

      <div className="qna-card">
        {loading && <p>Loading...</p>}
        {!loading &&
          questions.map((q, index) => (
            <div
              key={q._id}
              style={{
                padding: "14px 0",
                borderBottom:
                  index === questions.length - 1 ? "none" : "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  Question {q.order || index + 1}
                </div>
                <span className="qna-badge">
                  {new Date(q.releaseAt) <= new Date()
                    ? "Released"
                    : "Scheduled"}
                </span>
              </div>

              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                {new Date(q.releaseAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>

              <div style={{ fontSize: 14, marginBottom: 4 }}>
                <strong>Question:</strong> {q.questionText}
              </div>
              <div style={{ fontSize: 14, color: "#374151" }}>
                <strong>Answer:</strong> {q.answerText}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <button
                  className="qna-btn-secondary"
                  onClick={() => openEdit(q)}
                >
                  ✏️ Edit
                </button>
                <button
                  className="qna-btn-danger"
                  onClick={() => handleDelete(q._id)}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
      </div>

      {modal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="qna-card" style={{ width: 520, maxWidth: "95%" }}>
            <h3 style={{ marginBottom: 12 }}>
              {modal.mode === "create" ? "New Question" : "Edit Question"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 14 }}>Question</label>
                <textarea
                  required
                  rows={3}
                  value={modal.form.questionText}
                  onChange={(e) =>
                    setModal((m) => ({
                      ...m,
                      form: { ...m.form, questionText: e.target.value },
                    }))
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

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 14 }}>Answer</label>
                <textarea
                  required
                  rows={3}
                  value={modal.form.answerText}
                  onChange={(e) =>
                    setModal((m) => ({
                      ...m,
                      form: { ...m.form, answerText: e.target.value },
                    }))
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

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 14 }}>Release Time</label>
                <input
                  type="datetime-local"
                  required
                  value={modal.form.releaseAt}
                  onChange={(e) =>
                    setModal((m) => ({
                      ...m,
                      form: { ...m.form, releaseAt: e.target.value },
                    }))
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
                  onClick={closeModal}
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

export default AdminQuestionManagement;
