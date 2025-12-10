import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchExams,
  adminCreateExam,
} from "../utils/qnaApi";
import "../styles/qna.css";

const AdminQnAExams = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    nameHindi: "",
    description: "",
    icon: "⚖️",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchExams();
      setExams(Array.isArray(data) ? data : data.exams || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Exam name is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await adminCreateExam(form);
      setForm({
        name: "",
        nameHindi: "",
        description: "",
        icon: "⚖️",
      });
      await loadExams();
    } catch (err) {
      console.error(err);
      setError("Failed to create exam");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="qna-root">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>QnA Admin – Exams</h1>
          <p>Configure judiciary / law exams for the QnA system.</p>
        </div>

        {/* Create Exam Form */}
        <div className="section">
          <h2>Create New Exam</h2>
          <form
            onSubmit={handleCreate}
            className="exam-form"
            style={{
              background: "#fff",
              padding: "1rem",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              maxWidth: "640px",
            }}
          >
            <div className="flex gap-4 mb-3">
              <div className="flex-1">
                <label className="block text-sm mb-1">
                  Exam Name (English)
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border rounded px-2 py-1"
                  placeholder="e.g. MP Civil Judge"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm mb-1">
                  Exam Name (Hindi)
                </label>
                <input
                  type="text"
                  name="nameHindi"
                  value={form.nameHindi}
                  onChange={handleChange}
                  className="w-full border rounded px-2 py-1"
                  placeholder="e.g. एमपी सिविल जज"
                />
              </div>
              <div style={{ width: "90px" }}>
                <label className="block text-sm mb-1">Icon</label>
                <input
                  type="text"
                  name="icon"
                  value={form.icon}
                  onChange={handleChange}
                  className="w-full border rounded px-2 py-1 text-center"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full border rounded px-2 py-1"
                rows={2}
                placeholder="Short description for this exam"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm mb-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create Exam"}
            </button>
          </form>
        </div>

        {/* Exams List */}
        <div className="section">
          <h2>Existing Exams</h2>

          {loading ? (
            <div>Loading exams...</div>
          ) : exams.length === 0 ? (
            <div className="text-sm text-gray-600">
              No exams configured yet. Once you create an exam here,
              it will appear on{" "}
              <code>/qna/exams</code> for students.
            </div>
          ) : (
            <div className="exam-grid">
              {exams.map((exam) => (
                <div
                  key={exam.id || exam._id}
                  className="exam-card"
                  style={{ cursor: "default" }}
                >
                  <div className="exam-icon">
                    {exam.icon || "⚖️"}
                  </div>
                  <h3>{exam.name}</h3>
                  {exam.description && <p>{exam.description}</p>}
                  <div className="exam-stats">
                    <span>
                      {exam.questionCount || 0} Questions
                    </span>
                  </div>

                  <div style={{ marginTop: "0.75rem" }}>
                    <button
                      className="px-3 py-1 text-xs rounded bg-blue-600 text-white mr-2"
                      onClick={() =>
                        navigate(
                          `/admin/qna/syllabus/${
                            exam.id || exam._id
                          }`
                        )
                      }
                    >
                      Manage Syllabus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminQnAExams;
