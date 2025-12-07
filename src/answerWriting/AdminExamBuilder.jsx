// src/answerWriting/AdminExamBuilder.jsx
import React, { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);

  const [selectedNode, setSelectedNode] = useState(null);

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

  // ---------------- LOAD EXAM ----------------
  const loadExam = async () => {
    if (!examId) return;
    try {
      setLoading(true);
      const { data } = await fetchExamDetail(examId);
      setExam(data.exam);
    } catch (err) {
      console.error("Failed to load exam:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  // Small helper so we always refresh after any change
  const refreshAfterChange = async () => {
    await loadExam();
  };

  // --------------- CREATE UNIT ---------------
  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;

    try {
      await createUnit(examId, { name: newUnitName.trim() });
      setNewUnitName("");
      setSelectedNode(null);
      await refreshAfterChange();
    } catch (err) {
      console.error("createUnit error", err);
    }
  };

  // --------------- CREATE TOPIC --------------
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    const unit = selectedNode?.unit;
    if (!unit) return;
    if (!newTopicName.trim()) return;

    try {
      await createTopic(unit._id, { name: newTopicName.trim() });
      setNewTopicName("");
      await refreshAfterChange();
    } catch (err) {
      console.error("createTopic error", err);
    }
  };

  // ------------- CREATE SUBTOPIC -------------
  const handleCreateSubtopic = async (e) => {
    e.preventDefault();
    const topic = selectedNode?.topic;
    if (!topic) return;
    if (!newSubtopicName.trim()) return;

    try {
      await createSubtopic(topic._id, { name: newSubtopicName.trim() });
      setNewSubtopicName("");
      await refreshAfterChange();
    } catch (err) {
      console.error("createSubtopic error", err);
    }
  };

  // ------------- CREATE QUESTION -------------
  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    const subtopic = selectedNode?.subtopic;
    if (!subtopic) return;

    const {
      hindiText,
      englishText,
      hindiAnswer,
      englishAnswer,
      releaseDate,
      releaseTime,
    } = questionForm;

    if (!hindiText.trim() && !englishText.trim()) return;

    const releaseAt =
      releaseDate && releaseTime
        ? new Date(`${releaseDate}T${releaseTime}:00`).toISOString()
        : new Date().toISOString();

    try {
      await createQuestion(subtopic._id, {
        hindiText: hindiText.trim(),
        englishText: englishText.trim(),
        hindiAnswer: hindiAnswer.trim(),
        englishAnswer: englishAnswer.trim(),
        releaseAt,
      });

      setQuestionForm({
        hindiText: "",
        englishText: "",
        hindiAnswer: "",
        englishAnswer: "",
        releaseDate: "",
        releaseTime: "",
      });

      await refreshAfterChange();
    } catch (err) {
      console.error("createQuestion error", err);
    }
  };

  // --------------- TOGGLE LOCK ---------------
  const handleToggleLock = async () => {
    if (!selectedNode?.topic) return;
    const topic = selectedNode.topic;
    const newLocked = !topic.locked;

    try {
      await toggleLockTopic(topic._id, newLocked);
      await refreshAfterChange();
    } catch (err) {
      console.error("toggleLock error", err);
    }
  };

  // ------------ DELETE QUESTION --------------
  const handleDeleteQuestion = async (qId) => {
    try {
      await deleteQuestion(qId);
      await refreshAfterChange();
    } catch (err) {
      console.error("deleteQuestion error", err);
    }
  };

  // ------------- FLATTEN QUESTIONS -----------
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

  const selectedUnitName = selectedNode?.unit?.name || "None";
  const selectedTopicName = selectedNode?.topic?.name || "None";
  const selectedSubtopicName = selectedNode?.subtopic?.name || "None";

  if (loading || !exam) {
    return <p>Loading exam…</p>;
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

      <div className="aw-grid aw-grid-3col">
        {/* LEFT: TREE + STRUCTURE */}
        <div className="aw-column">
          <UnitTopicTree
            data={exam.units || []}
            selectedNode={selectedNode}
            onSelectItem={setSelectedNode}
          />

          <div className="aw-card aw-form-card">
            <div className="aw-card-title">Syllabus Structure</div>
            <div className="aw-selected-summary">
              <div>Selected Unit: {selectedUnitName}</div>
              <div>Selected Topic: {selectedTopicName}</div>
              <div>Selected Subtopic: {selectedSubtopicName}</div>
            </div>

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
                  onDelete={() => handleDeleteQuestion(q._id)}
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
