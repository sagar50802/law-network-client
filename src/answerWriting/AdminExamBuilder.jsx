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
  useEffect(() => {
    async function load() {
      try {
        const { data } = await fetchExamDetail(examId);
        setExam(data.exam);
      } catch (err) {
        console.error("Failed to load exam:", err);
      }
    }
    if (examId) load();
  }, [examId]);

  // ---------------- HELPERS ----------------
  const selectedLabels = {
    unit: selectedNode?.unit?.name || "None",
    topic: selectedNode?.topic?.name || "None",
    subtopic: selectedNode?.subtopic?.name || "None",
  };

  // ---------------- CREATE UNIT ----------------
  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;

    try {
      const { data } = await createUnit(examId, { name: newUnitName.trim() });
      setExam((prev) => ({
        ...prev,
        units: [...(prev?.units || []), { ...data.unit, topics: [] }],
      }));
      setNewUnitName("");
    } catch (err) {
      console.error("createUnit error", err);
      alert("Failed to create unit.");
    }
  };

  // ---------------- CREATE TOPIC ----------------
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!selectedNode?.unit) {
      alert("Please click a Unit in the Syllabus Tree first.");
      return;
    }
    if (!newTopicName.trim()) return;

    try {
      const { data } = await createTopic(selectedNode.unit._id, {
        name: newTopicName.trim(),
      });

      setExam((prev) => ({
        ...prev,
        units: (prev.units || []).map((u) =>
          u._id === selectedNode.unit._id
            ? { ...u, topics: [...(u.topics || []), { ...data.topic, subtopics: [] }] }
            : u
        ),
      }));

      setNewTopicName("");
    } catch (err) {
      console.error("createTopic error", err);
      alert("Failed to create topic.");
    }
  };

  // ---------------- CREATE SUBTOPIC ----------------
  const handleCreateSubtopic = async (e) => {
    e.preventDefault();
    if (!selectedNode?.topic) {
      alert("Please click a Topic in the Syllabus Tree first.");
      return;
    }
    if (!newSubtopicName.trim()) return;

    try {
      const { data } = await createSubtopic(selectedNode.topic._id, {
        name: newSubtopicName.trim(),
      });

      setExam((prev) => ({
        ...prev,
        units: (prev.units || []).map((u) => ({
          ...u,
          topics: (u.topics || []).map((t) =>
            t._id === selectedNode.topic._id
              ? {
                  ...t,
                  subtopics: [
                    ...(t.subtopics || []),
                    { ...data.subtopic, questions: [] },
                  ],
                }
              : t
          ),
        })),
      }));

      setNewSubtopicName("");
    } catch (err) {
      console.error("createSubtopic error", err);
      alert("Failed to create subtopic.");
    }
  };

  // ---------------- CREATE QUESTION ----------------
  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    const subtopic = selectedNode?.subtopic;
    if (!subtopic) {
      alert("Please click a Subtopic in the Syllabus Tree first.");
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

    if (!hindiText.trim() && !englishText.trim()) {
      alert("Write the question in Hindi or English first.");
      return;
    }

    const releaseAt =
      releaseDate && releaseTime
        ? new Date(`${releaseDate}T${releaseTime}:00`).toISOString()
        : new Date().toISOString();

    try {
      const { data } = await createQuestion(subtopic._id, {
        hindiText,
        englishText,
        hindiAnswer,
        englishAnswer,
        releaseAt,
      });

      setExam((prev) => ({
        ...prev,
        units: (prev.units || []).map((u) => ({
          ...u,
          topics: (u.topics || []).map((t) => ({
            ...t,
            subtopics: (t.subtopics || []).map((s) =>
              s._id === subtopic._id
                ? { ...s, questions: [...(s.questions || []), data.question] }
                : s
            ),
          })),
        })),
      }));

      setQuestionForm({
        hindiText: "",
        englishText: "",
        hindiAnswer: "",
        englishAnswer: "",
        releaseDate: "",
        releaseTime: "",
      });
    } catch (err) {
      console.error("createQuestion error", err);
      alert("Failed to create question.");
    }
  };

  // ---------------- TOGGLE LOCK ----------------
  const handleToggleLock = async () => {
    if (!selectedNode?.topic) {
      alert("Select a Topic first.");
      return;
    }

    const topic = selectedNode.topic;
    const newLocked = !topic.locked;

    try {
      await toggleLockTopic(topic._id, newLocked);

      setExam((prev) => ({
        ...prev,
        units: (prev.units || []).map((u) => ({
          ...u,
          topics: (u.topics || []).map((t) =>
            t._id === topic._id ? { ...t, locked: newLocked } : t
          ),
        })),
      }));

      // keep selection updated
      setSelectedNode((prevSel) =>
        prevSel?.topic?._id === topic._id
          ? { ...prevSel, topic: { ...prevSel.topic, locked: newLocked } }
          : prevSel
      );
    } catch (err) {
      console.error("toggleLock error", err);
      alert("Failed to lock/unlock topic.");
    }
  };

  // ---------------- FLATTEN QUESTIONS ----------------
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

  if (!exam) return <p>Loading exam…</p>;

  return (
    <div className="aw-page aw-admin-builder">
      <div className="aw-page-header">
        <div>
          <div className="aw-pill">Admin · {exam.name}</div>
          <h1>Exam Builder</h1>
          <p className="aw-muted">
            Define syllabus hierarchy and schedule bilingual questions &
            answers.
          </p>
        </div>
      </div>

      <div className="aw-grid aw-grid-3col">
        {/* LEFT: TREE + STRUCTURE */}
        <div className="aw-column">
          <UnitTopicTree
            data={exam.units || []}
            onSelectItem={(item) => setSelectedNode(item)}
          />

          <div className="aw-card aw-form-card">
            <div className="aw-card-title">Syllabus Structure</div>

            <div className="aw-selected-info">
              <div>Selected Unit: <strong>{selectedLabels.unit}</strong></div>
              <div>Selected Topic: <strong>{selectedLabels.topic}</strong></div>
              <div>
                Selected Subtopic: <strong>{selectedLabels.subtopic}</strong>
              </div>
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
                  onDelete={async () => {
                    try {
                      await deleteQuestion(q._id);
                      setExam((prev) => ({
                        ...prev,
                        units: (prev.units || []).map((u) => ({
                          ...u,
                          topics: (u.topics || []).map((t) => ({
                            ...t,
                            subtopics: (t.subtopics || []).map((s) => ({
                              ...s,
                              questions: (s.questions || []).filter(
                                (qq) => qq._id !== q._id
                              ),
                            })),
                          })),
                        })),
                      }));
                    } catch (err) {
                      console.error("deleteQuestion error", err);
                      alert("Failed to delete question.");
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
