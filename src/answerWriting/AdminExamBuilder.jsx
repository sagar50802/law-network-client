// src/answerWriting/AdminExamBuilder.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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

function buildNestedExam(payload) {
  const { exam, units = [], topics = [], subtopics = [], questions = [] } =
    payload || {};

  if (!exam) return null;

  const sameId = (a, b) => String(a) === String(b);

  const unitsWithTree = units.map((u) => {
    const unitTopics = topics
      .filter((t) => sameId(t.unitId, u._id || u.id))
      .map((t) => {
        const topicSubtopics = subtopics
          .filter((s) => sameId(s.topicId, t._id || t.id))
          .map((s) => {
            const subQuestions = questions.filter((q) =>
              sameId(q.subtopicId, s._id || s.id)
            );
            return { ...s, questions: subQuestions };
          });

        return { ...t, subtopics: topicSubtopics };
      });

    return { ...u, topics: unitTopics };
  });

  return {
    ...exam,
    units: unitsWithTree,
  };
}

export default function AdminExamBuilder() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const [newUnitName, setNewUnitName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [newSubtopicName, setNewSubtopicName] = useState("");

  const [questionForm, setQuestionForm] = useState({
    hindiText: "",
    englishText: "",
    releaseDate: "",
    releaseTime: "",
  });

  // Load exam + tree
  useEffect(() => {
    async function load() {
      try {
        const { data } = await fetchExamDetail(examId);
        const nested = buildNestedExam(data);
        setExam(nested);
      } catch (err) {
        console.error("Failed to load exam detail", err);
      }
    }
    if (examId) load();
  }, [examId]);

  // ---------- CREATE UNIT ----------
  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;

    try {
      const { data } = await createUnit(examId, { name: newUnitName.trim() });
      const unit = data.unit;

      setExam((prev) => ({
        ...prev,
        units: [...(prev?.units || []), { ...unit, topics: [] }],
      }));
      setNewUnitName("");
    } catch (err) {
      console.error("Failed to create unit", err);
    }
  };

  // ---------- CREATE TOPIC ----------
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!selectedNode?.unit || !newTopicName.trim()) return;

    const unit = selectedNode.unit;
    const unitId = unit._id || unit.id;

    try {
      const { data } = await createTopic(unitId, { name: newTopicName.trim() });
      const topic = data.topic;

      setExam((prev) => ({
        ...prev,
        units: prev.units.map((u) =>
          (u._id || u.id) === unitId
            ? { ...u, topics: [...(u.topics || []), { ...topic, subtopics: [] }] }
            : u
        ),
      }));
      setNewTopicName("");
    } catch (err) {
      console.error("Failed to create topic", err);
    }
  };

  // ---------- CREATE SUBTOPIC ----------
  const handleCreateSubtopic = async (e) => {
    e.preventDefault();
    if (!selectedNode?.topic || !newSubtopicName.trim()) return;

    const topic = selectedNode.topic;
    const topicId = topic._id || topic.id;

    try {
      const { data } = await createSubtopic(topicId, {
        name: newSubtopicName.trim(),
      });
      const subtopic = data.subtopic;

      setExam((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({
          ...u,
          topics: u.topics.map((t) =>
            (t._id || t.id) === topicId
              ? { ...t, subtopics: [...(t.subtopics || []), { ...subtopic, questions: [] }] }
              : t
          ),
        })),
      }));
      setNewSubtopicName("");
    } catch (err) {
      console.error("Failed to create subtopic", err);
    }
  };

  // ---------- CREATE QUESTION ----------
  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    const subtopic = selectedNode?.subtopic;
    if (!subtopic) return;

    const { hindiText, englishText, releaseDate, releaseTime } = questionForm;
    if (!hindiText && !englishText) return;

    if (!releaseDate || !releaseTime) {
      alert("Please select release date and time.");
      return;
    }

    const releaseAt = new Date(
      `${releaseDate}T${releaseTime}:00`
    ).toISOString();

    const subtopicId = subtopic._id || subtopic.id;

    try {
      const { data } = await createQuestion(subtopicId, {
        hindiText,
        englishText,
        releaseAt,
      });
      const question = data.question;

      setExam((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({
          ...u,
          topics: u.topics.map((t) => ({
            ...t,
            subtopics: t.subtopics.map((s) =>
              (s._id || s.id) === subtopicId
                ? { ...s, questions: [...(s.questions || []), question] }
                : s
            ),
          })),
        })),
      }));

      setQuestionForm({
        hindiText: "",
        englishText: "",
        releaseDate: "",
        releaseTime: "",
      });
    } catch (err) {
      console.error("Failed to create question", err);
    }
  };

  // ---------- TOGGLE LOCK ----------
  const handleToggleLock = async () => {
    const topic = selectedNode?.topic;
    if (!topic) return;

    const topicId = topic._id || topic.id;
    const newLocked = !topic.locked;

    try {
      await toggleLockTopic(topicId, newLocked);

      setExam((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({
          ...u,
          topics: u.topics.map((t) =>
            (t._id || t.id) === topicId ? { ...t, locked: newLocked } : t
          ),
        })),
      }));
    } catch (err) {
      console.error("Failed to toggle lock", err);
    }
  };

  // ---------- FLAT QUESTIONS FOR RIGHT PANEL ----------
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

  if (!exam) {
    return <p>Loading exam…</p>;
  }

  return (
    <div className="aw-page aw-admin-builder">
      <div className="aw-page-header">
        <div>
          <div className="aw-pill">Admin · {exam.name}</div>
          <h1>Exam Builder</h1>
          <p className="aw-muted">
            Define syllabus hierarchy and control automatic question release.
          </p>
        </div>
      </div>

      <div className="aw-grid aw-grid-3col">
        {/* LEFT: TREE & STRUCTURE FORMS */}
        <div className="aw-column">
          <UnitTopicTree
            data={exam.units || []}
            onSelectItem={(item) => setSelectedNode(item)}
          />

          <div className="aw-card aw-form-card">
            <div className="aw-card-title">Syllabus Structure</div>

            {/* Unit */}
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

            {/* Topic */}
            <form className="aw-form" onSubmit={handleCreateTopic}>
              <label className="aw-field">
                <span>New Topic (under selected Unit)</span>
                <input
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Topic name"
                />
              </label>
              <button className="aw-btn aw-btn-ghost" type="submit">
                + Add Topic
              </button>
            </form>

            {/* Subtopic */}
            <form className="aw-form" onSubmit={handleCreateSubtopic}>
              <label className="aw-field">
                <span>New Subtopic (under selected Topic)</span>
                <input
                  value={newSubtopicName}
                  onChange={(e) => setNewSubtopicName(e.target.value)}
                  placeholder="Subtopic name"
                />
              </label>
              <button className="aw-btn aw-btn-ghost" type="submit">
                + Add Subtopic
              </button>
            </form>

            {/* Lock */}
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

        {/* CENTER: QUESTION CREATION */}
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

              <button className="aw-btn aw-btn-primary" type="submit">
                + Add Question (Auto Release)
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: QUESTION LIST */}
        <div className="aw-column">
          <div className="aw-card">
            <div className="aw-card-title">All Questions</div>

            <div className="aw-question-list">
              {flatQuestions.map((q) => (
                <QuestionCard
                  key={q._id || q.id}
                  question={q}
                  onDelete={async () => {
                    try {
                      await deleteQuestion(q._id || q.id);

                      setExam((prev) => ({
                        ...prev,
                        units: prev.units.map((u) => ({
                          ...u,
                          topics: u.topics.map((t) => ({
                            ...t,
                            subtopics: t.subtopics.map((s) => ({
                              ...s,
                              questions: (s.questions || []).filter(
                                (qq) => (qq._id || qq.id) !== (q._id || q.id)
                              ),
                            })),
                          })),
                        })),
                      }));
                    } catch (err) {
                      console.error("Failed to delete question", err);
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
