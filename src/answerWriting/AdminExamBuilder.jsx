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
    releaseDate: "",
    releaseTime: "",
  });

  // ✅ LOAD REAL EXAM DATA FROM BACKEND
  useEffect(() => {
    async function load() {
      try {
        const { data } = await fetchExamDetail(examId);
        setExam(data.exam);
      } catch (err) {
        console.error("Failed to load exam:", err);
      }
    }
    load();
  }, [examId]);

  // ---------------------------------------
  // CREATE UNIT
  // ---------------------------------------
  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;

    try {
      const { data } = await createUnit(examId, { name: newUnitName });

      setExam((prev) => ({
        ...prev,
        units: [...prev.units, data.unit],
      }));
      setNewUnitName("");
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------
  // CREATE TOPIC
  // ---------------------------------------
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!selectedNode?.unit) return;
    if (!newTopicName.trim()) return;

    try {
      const { data } = await createTopic(selectedNode.unit._id, {
        name: newTopicName,
      });

      setExam((prev) => ({
        ...prev,
        units: prev.units.map((u) =>
          u._id === selectedNode.unit._id
            ? { ...u, topics: [...u.topics, data.topic] }
            : u
        ),
      }));

      setNewTopicName("");
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------
  // CREATE SUBTOPIC
  // ---------------------------------------
  const handleCreateSubtopic = async (e) => {
    e.preventDefault();
    if (!selectedNode?.topic) return;
    if (!newSubtopicName.trim()) return;

    try {
      const { data } = await createSubtopic(selectedNode.topic._id, {
        name: newSubtopicName,
      });

      setExam((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({
          ...u,
          topics: u.topics.map((t) =>
            t._id === selectedNode.topic._id
              ? { ...t, subtopics: [...t.subtopics, data.subtopic] }
              : t
          ),
        })),
      }));

      setNewSubtopicName("");
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------
  // CREATE QUESTION
  // ---------------------------------------
  const handleCreateQuestion = async (e) => {
    e.preventDefault();

    const subtopic = selectedNode?.subtopic;
    if (!subtopic) return;

    const { hindiText, englishText, releaseDate, releaseTime } = questionForm;
    if (!hindiText && !englishText) return;

    const releaseAt =
      releaseDate && releaseTime
        ? new Date(`${releaseDate}T${releaseTime}:00`).toISOString()
        : null;

    try {
      const { data } = await createQuestion(subtopic._id, {
        hindiText,
        englishText,
        releaseAt,
      });

      setExam((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({
          ...u,
          topics: u.topics.map((t) => ({
            ...t,
            subtopics: t.subtopics.map((s) =>
              s._id === subtopic._id
                ? { ...s, questions: [...s.questions, data.question] }
                : s
            ),
          })),
        })),
      }));

      // Reset form
      setQuestionForm({
        hindiText: "",
        englishText: "",
        releaseDate: "",
        releaseTime: "",
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------
  // LOCK / UNLOCK TOPIC
  // ---------------------------------------
  const handleToggleLock = async () => {
    if (!selectedNode?.topic) return;

    const topic = selectedNode.topic;
    const newLocked = !topic.locked;

    try {
      await toggleLockTopic(topic._id, newLocked);

      setExam((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({
          ...u,
          topics: u.topics.map((t) =>
            t._id === topic._id ? { ...t, locked: newLocked } : t
          ),
        })),
      }));
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------
  // FLATTEN QUESTIONS FOR RIGHT-SIDE PANEL
  // ---------------------------------------
  const flatQuestions =
    exam?.units?.flatMap((u) =>
      u.topics.flatMap((t) =>
        t.subtopics.flatMap((s) =>
          s.questions.map((q) => ({
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
          <div className="aw-pill">Admin · {exam?.name}</div>
          <h1>Exam Builder</h1>
          <p className="aw-muted">
            Define syllabus hierarchy and control automatic question release.
          </p>
        </div>
      </div>

      <div className="aw-grid aw-grid-3col">
        {/* LEFT SIDE: TREE */}
        <div className="aw-column">
          <UnitTopicTree
            data={exam.units}
            onSelectItem={(item) => setSelectedNode(item)}
          />

          {/* CREATE FORMS */}
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
              <button className="aw-btn aw-btn-ghost">+ Add Unit</button>
            </form>

            {/* TOPIC */}
            <form className="aw-form" onSubmit={handleCreateTopic}>
              <label className="aw-field">
                <span>New Topic</span>
                <input
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Topic name"
                />
              </label>
              <button className="aw-btn aw-btn-ghost">+ Add Topic</button>
            </form>

            {/* SUBTOPIC */}
            <form className="aw-form" onSubmit={handleCreateSubtopic}>
              <label className="aw-field">
                <span>New Subtopic</span>
                <input
                  value={newSubtopicName}
                  onChange={(e) => setNewSubtopicName(e.target.value)}
                  placeholder="Subtopic name"
                />
              </label>
              <button className="aw-btn aw-btn-ghost">+ Add Subtopic</button>
            </form>

            {/* LOCK BUTTON */}
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
                    setQuestionForm({ ...questionForm, hindiText: e.target.value })
                  }
                />
              </label>

              <label className="aw-field">
                <span>Question (English)</span>
                <textarea
                  rows={3}
                  value={questionForm.englishText}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, englishText: e.target.value })
                  }
                />
              </label>

              {/* DATE + TIME */}
              <div className="aw-form-row">
                <label className="aw-field">
                  <span>Release Date</span>
                  <input
                    type="date"
                    value={questionForm.releaseDate}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, releaseDate: e.target.value })
                    }
                  />
                </label>

                <label className="aw-field">
                  <span>Release Time</span>
                  <input
                    type="time"
                    value={questionForm.releaseTime}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, releaseTime: e.target.value })
                    }
                  />
                </label>
              </div>

              <button className="aw-btn aw-btn-primary">+ Add Question</button>
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
                        units: prev.units.map((u) => ({
                          ...u,
                          topics: u.topics.map((t) => ({
                            ...t,
                            subtopics: t.subtopics.map((s) => ({
                              ...s,
                              questions: s.questions.filter((qq) => qq._id !== q._id),
                            })),
                          })),
                        })),
                      }));
                    } catch (err) {
                      console.error(err);
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
