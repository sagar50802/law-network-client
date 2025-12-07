// src/answerWriting/AdminExamBuilder.jsx
import React, { useEffect, useState, useCallback } from "react";
import UnitTopicTree from "./components/UnitTopicTree";
import QuestionCard from "./components/QuestionCard";
import {
  fetchExamDetail,
  createUnit,
  createTopic,
  createSubtopic,
  createQuestion,
  toggleLockTopic,
  deleteQuestion,
} from "./api/answerWritingApi";
import "./answerWriting.css";

export default function AdminExamBuilder({ examId }) {
  const [exam, setExam] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newUnitName, setNewUnitName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [newSubtopicName, setNewSubtopicName] = useState("");

  const [questionForm, setQuestionForm] = useState({
    hindiText: "",
    englishText: "",
    hindiAnswer: "",
    englishAnswer: "",
    releaseDate: "",
    releaseTime: "",
  });

  const [error, setError] = useState("");

  // 🔁 Load / reload exam from backend
  const reloadExam = useCallback(async () => {
    if (!examId) return;
    try {
      setLoading(true);
      setError("");
      const { data } = await fetchExamDetail(examId);
      // backend: { success, exam: { ..., units: [...] } }
      setExam(data.exam || null);
    } catch (err) {
      console.error("fetchExamDetail error", err);
      setError("Failed to load exam details.");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    reloadExam();
  }, [reloadExam]);

  /* ---------- CREATE UNIT ---------- */
  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;

    try {
      setError("");
      const { data } = await createUnit(examId, { name: newUnitName.trim() });
      setNewUnitName("");
      // ✅ Reload everything from backend
      await reloadExam();
      // optionally select the new unit
      if (data.unit?._id) {
        setSelectedNode({ unit: data.unit });
      }
    } catch (err) {
      console.error("createUnit error", err);
      setError("Failed to create unit.");
    }
  };

  /* ---------- CREATE TOPIC ---------- */
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!selectedNode?.unit) {
      setError("Select a unit first.");
      return;
    }
    if (!newTopicName.trim()) return;

    try {
      setError("");
      await createTopic(selectedNode.unit._id, { name: newTopicName.trim() });
      setNewTopicName("");
      // ✅ Reload full exam tree
      await reloadExam();
    } catch (err) {
      console.error("createTopic error", err);
      setError("Failed to create topic.");
    }
  };

  /* ---------- CREATE SUBTOPIC ---------- */
  const handleCreateSubtopic = async (e) => {
    e.preventDefault();
    if (!selectedNode?.topic) {
      setError("Select a topic first.");
      return;
    }
    if (!newSubtopicName.trim()) return;

    try {
      setError("");
      await createSubtopic(selectedNode.topic._id, {
        name: newSubtopicName.trim(),
      });
      setNewSubtopicName("");
      // ✅ Reload full exam tree
      await reloadExam();
    } catch (err) {
      console.error("createSubtopic error", err);
      setError("Failed to create subtopic.");
    }
  };

  /* ---------- CREATE QUESTION ---------- */
  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    const subtopic = selectedNode?.subtopic;
    if (!subtopic) {
      setError("Select a subtopic first.");
      return;
    }

    const {
      hindiText,
      englishText,
      hindiAnswer,
      englishAnswer,
      releaseDate,
      releaseTime,
    } = questionForm;

    if (!hindiText && !englishText) {
      setError("Enter at least Hindi or English question text.");
      return;
    }

    const releaseAt =
      releaseDate && releaseTime
        ? new Date(`${releaseDate}T${releaseTime}:00`).toISOString()
        : new Date().toISOString();

    try {
      setError("");
      await createQuestion(subtopic._id, {
        hindiText,
        englishText,
        hindiAnswer,
        englishAnswer,
        releaseAt,
      });

      // clear form
      setQuestionForm({
        hindiText: "",
        englishText: "",
        hindiAnswer: "",
        englishAnswer: "",
        releaseDate: "",
        releaseTime: "",
      });

      // ✅ Reload full exam tree
      await reloadExam();
    } catch (err) {
      console.error("createQuestion error", err);
      setError("Failed to create question.");
    }
  };

  /* ---------- TOGGLE LOCK ---------- */
  const handleToggleLock = async () => {
    if (!selectedNode?.topic) return;

    const topic = selectedNode.topic;
    const newLocked = !topic.locked;

    try {
      setError("");
      await toggleLockTopic(topic._id, newLocked);
      // ✅ Reload full tree
      await reloadExam();
    } catch (err) {
      console.error("toggleLock error", err);
      setError("Failed to toggle lock.");
    }
  };

  /* ---------- FLAT QUESTIONS ---------- */
  const flatQuestions =
    exam?.units?.flatMap((u) =>
      (u.topics || []).flatMap((t) =>
        (t.subtopics || []).flatMap((s) =>
          (s.questions || []).map((q) => ({
            ...q,
            topicName: t.name,
          }))
        )
      )
    ) || [];

  if (loading || !exam) {
    return (
      <div className="aw-page aw-admin-builder">
        <p>Loading exam…</p>
      </div>
    );
  }

  return (
    <div className="aw-page aw-admin-builder">
      <div className="aw-page-header">
        <div>
          <div className="aw-pill">Admin · {exam.name}</div>
          <h1>Exam Builder</h1>
          <p className="aw-muted">
            Define syllabus hierarchy and schedule bilingual questions & answers.
          </p>
        </div>
      </div>

      {error && <p className="aw-error-text">{error}</p>}

      <div className="aw-grid aw-grid-3col">
        {/* LEFT: TREE + STRUCTURE */}
        <div className="aw-column">
          <UnitTopicTree
            data={exam.units || []}
            onSelectItem={(item) => setSelectedNode(item)}
          />

          <div className="aw-card aw-form-card">
            <div className="aw-card-title">Syllabus Structure</div>

            {/* UNIT */}
            <form className="aw-form" onSubmit={handleCreateUnit}>
              <label className="aw-field">
                <span>New Unit</span>
                <input
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="Unit name"
                />
              </label>
              <button className="aw-btn aw-btn-ghost" type="submit">
                + Add Unit
              </button>
            </form>

            {/* TOPIC */}
            <form className="aw-form" onSubmit={handleCreateTopic}>
              <label className="aw-field">
                <span>New Topic (under selected Unit)</span>
                <input
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Topic name"
                />
              </label>
              <button
                className="aw-btn aw-btn-ghost"
                type="submit"
                disabled={!selectedNode?.unit}
              >
                + Add Topic
              </button>
            </form>

            {/* SUBTOPIC */}
            <form className="aw-form" onSubmit={handleCreateSubtopic}>
              <label className="aw-field">
                <span>New Subtopic (under selected Topic)</span>
                <input
                  value={newSubtopicName}
                  onChange={(e) => setNewSubtopicName(e.target.value)}
                  placeholder="Subtopic name"
                />
              </label>
              <button
                className="aw-btn aw-btn-ghost"
                type="submit"
                disabled={!selectedNode?.topic}
              >
                + Add Subtopic
              </button>
            </form>

            <button
              type="button"
              className="aw-btn aw-btn-outline"
              onClick={handleToggleLock}
              disabled={!selectedNode?.topic}
            >
              {selectedNode?.topic?.locked ? "Unlock Topic" : "Lock Topic"}
            </button>
          </div>
        </div>

        {/* CENTER: CREATE QUESTION */}
        <div className="aw-column">
          <div className="aw-card aw-form-card">
            <div className="aw-card-title">Create Question & Schedule</div>

            <form className="aw-form" onSubmit={handleCreateQuestion}>
              <label className="aw-field">
                <span>Question (Hindi)</span>
                <textarea
                  rows={3}
                  value={questionForm.hindiText}
                  onChange={(e) =>
                    setQuestionForm((f) => ({
                      ...f,
                      hindiText: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="aw-field">
                <span>Question (English)</span>
                <textarea
                  rows={3}
                  value={questionForm.englishText}
                  onChange={(e) =>
                    setQuestionForm((f) => ({
                      ...f,
                      englishText: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="aw-field">
                <span>Answer (Hindi)</span>
                <textarea
                  rows={3}
                  value={questionForm.hindiAnswer}
                  onChange={(e) =>
                    setQuestionForm((f) => ({
                      ...f,
                      hindiAnswer: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="aw-field">
                <span>Answer (English)</span>
                <textarea
                  rows={3}
                  value={questionForm.englishAnswer}
                  onChange={(e) =>
                    setQuestionForm((f) => ({
                      ...f,
                      englishAnswer: e.target.value,
                    }))
                  }
                />
              </label>

              <div className="aw-form-row">
                <label className="aw-field">
                  <span>Release Date</span>
                  <input
                    type="date"
                    value={questionForm.releaseDate}
                    onChange={(e) =>
                      setQuestionForm((f) => ({
                        ...f,
                        releaseDate: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="aw-field">
                  <span>Release Time</span>
                  <input
                    type="time"
                    value={questionForm.releaseTime}
                    onChange={(e) =>
                      setQuestionForm((f) => ({
                        ...f,
                        releaseTime: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <button
                className="aw-btn aw-btn-primary"
                type="submit"
                disabled={!selectedNode?.subtopic}
              >
                + Add Question (Auto Release)
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: QUESTIONS LIST */}
        <div className="aw-column">
          <div className="aw-card">
            <div className="aw-card-title">All Questions</div>
            <div className="aw-question-list">
              {flatQuestions.map((q) => (
                <QuestionCard
                  key={q._id}
                  question={q}
                  onDelete={async () => {
                    try {
                      setError("");
                      await deleteQuestion(q._id);
                      // ✅ Reload everything
                      await reloadExam();
                    } catch (err) {
                      console.error("deleteQuestion error", err);
                      setError("Failed to delete question.");
                    }
                  }}
                />
              ))}

              {flatQuestions.length === 0 && (
                <p className="aw-muted">No questions created yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
