// src/pages/qna/AdminSyllabusManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./qna.css";
import { Link, useLocation } from "react-router-dom";
import SyllabusTabs from "./components/SyllabusTabs";
import {
  fetchExams,
  fetchUnits,
  fetchTopics,
  fetchSubtopics,
  createUnit,
  updateUnit,
  deleteUnit,
  createTopic,
  updateTopic,
  deleteTopic,
  createSubtopic,
  updateSubtopic,
  deleteSubtopic,
} from "./qnaApi";

const useQuery = () => new URLSearchParams(useLocation().search);

const AdminSyllabusManagement = () => {
  const query = useQuery();
  const examIdFromQuery = query.get("examId");

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(examIdFromQuery || "");
  const [activeTab, setActiveTab] = useState("Units");

  const [units, setUnits] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);

  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");

  const [modal, setModal] = useState(null); // {mode, type, id, value}

  const selectedExam = useMemo(
    () => exams.find((e) => e._id === selectedExamId),
    [exams, selectedExamId]
  );

  useEffect(() => {
    const loadExams = async () => {
      try {
        const res = await fetchExams();
        setExams(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadExams();
  }, []);

  useEffect(() => {
    const loadUnits = async () => {
      if (!selectedExamId) return;
      try {
        const res = await fetchUnits(selectedExamId);
        setUnits(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadUnits();
  }, [selectedExamId]);

  useEffect(() => {
    const loadTopics = async () => {
      if (!selectedUnitId) return;
      try {
        const res = await fetchTopics(selectedUnitId);
        setTopics(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadTopics();
  }, [selectedUnitId]);

  useEffect(() => {
    const loadSubtopics = async () => {
      if (!selectedTopicId) return;
      try {
        const res = await fetchSubtopics(selectedTopicId);
        setSubtopics(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadSubtopics();
  }, [selectedTopicId]);

  const openModal = (type, mode, item) => {
    setModal({
      type,
      mode,
      id: item?._id || null,
      value: item?.name || "",
    });
  };

  const closeModal = () => setModal(null);

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modal) return;
    try {
      if (modal.type === "unit") {
        if (modal.mode === "create") {
          await createUnit(selectedExamId, { name: modal.value });
        } else {
          await updateUnit(modal.id, { name: modal.value });
        }
        const res = await fetchUnits(selectedExamId);
        setUnits(res.data);
      }

      if (modal.type === "topic") {
        if (modal.mode === "create") {
          await createTopic(selectedUnitId, { name: modal.value });
        } else {
          await updateTopic(modal.id, { name: modal.value });
        }
        const res = await fetchTopics(selectedUnitId);
        setTopics(res.data);
      }

      if (modal.type === "subtopic") {
        if (modal.mode === "create") {
          await createSubtopic(selectedTopicId, { name: modal.value });
        } else {
          await updateSubtopic(modal.id, { name: modal.value });
        }
        const res = await fetchSubtopics(selectedTopicId);
        setSubtopics(res.data);
      }

      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm("Delete item?")) return;
    try {
      if (type === "unit") {
        await deleteUnit(id);
        const res = await fetchUnits(selectedExamId);
        setUnits(res.data);
      }
      if (type === "topic") {
        await deleteTopic(id);
        const res = await fetchTopics(selectedUnitId);
        setTopics(res.data);
      }
      if (type === "subtopic") {
        await deleteSubtopic(id);
        const res = await fetchSubtopics(selectedTopicId);
        setSubtopics(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="qna-page">
      <Link to="/qna/admin/exams" style={{ fontSize: 14, color: "#2563eb" }}>
        ← Back to Exams
      </Link>

      <h1
        className="qna-title"
        style={{ textAlign: "left", marginTop: 12 }}
      >
        {selectedExam
          ? `${selectedExam.name} - Syllabus Management`
          : "Syllabus Management"}
      </h1>
      <p className="qna-subtitle" style={{ textAlign: "left" }}>
        Build hierarchical syllabus structure
      </p>

      <div style={{ marginBottom: 16 }}>
        <select
          value={selectedExamId}
          onChange={(e) => {
            setSelectedExamId(e.target.value);
            setSelectedUnitId("");
            setSelectedTopicId("");
            setUnits([]);
            setTopics([]);
            setSubtopics([]);
          }}
          style={{ padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}
        >
          <option value="">Select Exam</option>
          {exams.map((ex) => (
            <option key={ex._id} value={ex._id}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      {selectedExamId && (
        <>
          <SyllabusTabs active={activeTab} onChange={setActiveTab} />

          {/* Units */}
          {activeTab === "Units" && (
            <div className="qna-card" style={{ marginTop: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <strong>Units</strong>
                <button
                  className="qna-btn-primary"
                  style={{ width: "auto", paddingInline: 16 }}
                  onClick={() => openModal("unit", "create")}
                >
                  + New Unit
                </button>
              </div>

              {units.map((u) => (
                <div key={u._id} className="qna-list-row">
                  <span
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSelectedUnitId(u._id);
                      setActiveTab("Topics");
                    }}
                  >
                    {u.name}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="qna-btn-secondary"
                      onClick={() => openModal("unit", "edit", u)}
                    >
                      ✏️
                    </button>
                    <button
                      className="qna-btn-danger"
                      onClick={() => handleDelete("unit", u._id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Topics */}
          {activeTab === "Topics" && (
            <div className="qna-card" style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 10, color: "#6b7280" }}>
                Topics in{" "}
                <strong>
                  {units.find((u) => u._id === selectedUnitId)?.name ||
                    "selected unit"}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <span>Topics</span>
                <button
                  className="qna-btn-primary"
                  style={{ width: "auto", paddingInline: 16 }}
                  disabled={!selectedUnitId}
                  onClick={() => openModal("topic", "create")}
                >
                  + New Topic
                </button>
              </div>

              {topics.map((t) => (
                <div key={t._id} className="qna-list-row">
                  <span
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSelectedTopicId(t._id);
                      setActiveTab("Subtopics");
                    }}
                  >
                    {t.name}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="qna-btn-secondary"
                      onClick={() => openModal("topic", "edit", t)}
                    >
                      ✏️
                    </button>
                    <button
                      className="qna-btn-danger"
                      onClick={() => handleDelete("topic", t._id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subtopics */}
          {activeTab === "Subtopics" && (
            <div className="qna-card" style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 10, color: "#6b7280" }}>
                Subtopics in{" "}
                <strong>
                  {topics.find((t) => t._id === selectedTopicId)?.name ||
                    "selected topic"}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <span>Subtopics</span>
                <button
                  className="qna-btn-primary"
                  style={{ width: "auto", paddingInline: 16 }}
                  disabled={!selectedTopicId}
                  onClick={() => openModal("subtopic", "create")}
                >
                  + New Subtopic
                </button>
              </div>

              {subtopics.map((s) => (
                <div key={s._id} className="qna-list-row">
                  <span>{s.name}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="qna-btn-secondary"
                      onClick={() => openModal("subtopic", "edit", s)}
                    >
                      ✏️
                    </button>
                    <button
                      className="qna-btn-primary"
                      style={{ width: "auto" }}
                      onClick={() =>
                        (window.location.href = `/qna/admin/questions?subtopicId=${s._id}`)
                      }
                    >
                      📄 Questions
                    </button>
                    <button
                      className="qna-btn-danger"
                      onClick={() => handleDelete("subtopic", s._id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Simple name modal */}
      {modal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="qna-card" style={{ width: 360, maxWidth: "90%" }}>
            <h3 style={{ marginBottom: 12 }}>
              {modal.mode === "create" ? "Create" : "Edit"}{" "}
              {modal.type.charAt(0).toUpperCase() + modal.type.slice(1)}
            </h3>
            <form onSubmit={handleModalSubmit}>
              <input
                autoFocus
                value={modal.value}
                onChange={(e) =>
                  setModal((m) => ({ ...m, value: e.target.value }))
                }
                required
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                }}
              />
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

export default AdminSyllabusManagement;
