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

  async function reloadExam() {
    const { data } = await fetchExamDetail(examId);
    setExam(data.exam);
  }

  useEffect(() => {
    if (examId) reloadExam();
  }, [examId]);

  /* ---------------- CREATE UNIT ---------------- */
  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;

    await createUnit(examId, { name: newUnitName });
    setNewUnitName("");
    reloadExam();
  };

  /* ---------------- CREATE TOPIC ---------------- */
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!selectedNode?.unit) return;
    if (!newTopicName.trim()) return;

    await createTopic(selectedNode.unit._id, { name: newTopicName });
    setNewTopicName("");
    reloadExam();
  };

  /* ---------------- CREATE SUBTOPIC ---------------- */
  const handleCreateSubtopic = async (e) => {
    e.preventDefault();
    if (!selectedNode?.topic) return;
    if (!newSubtopicName.trim()) return;

    await createSubtopic(selectedNode.topic._id, { name: newSubtopicName });
    setNewSubtopicName("");
    reloadExam();
  };

  /* ---------------- CREATE QUESTION ---------------- */
  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!selectedNode?.subtopic) return;

    const { releaseDate, releaseTime } = questionForm;

    const releaseAt =
      releaseDate && releaseTime
        ? new Date(`${releaseDate}T${releaseTime}:00`).toISOString()
        : new Date().toISOString();

    await createQuestion(selectedNode.subtopic._id, {
      ...questionForm,
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

    reloadExam();
  };

  /* ---------------- TOGGLE TOPIC LOCK ---------------- */
  const handleToggleLock = async () => {
    if (!selectedNode?.topic) return;

    await toggleLockTopic(selectedNode.topic._id, !selectedNode.topic.locked);
    reloadExam();
  };

  /* ---------------- DELETE QUESTION ---------------- */
  const handleDelete = async (qid) => {
    await deleteQuestion(qid);
    reloadExam();
  };

  if (!exam) return <p>Loading exam…</p>;

  const flatQuestions =
    exam.units.flatMap((u) =>
      u.topics.flatMap((t) =>
        t.subtopics.flatMap((s) =>
          s.questions.map((q) => ({
            ...q,
            topicName: t.name,
          }))
        )
      )
    );

  return (
    <div className="aw-page aw-admin-builder">
      <div className="aw-page-header">
        <div>
          <div className="aw-pill">Admin · {exam.name}</div>
          <h1>Exam Builder</h1>
        </div>
      </div>

      <div className="aw-grid aw-grid-3col">
        {/* LEFT COLUMN */}
        <div className="aw-column">
          <UnitTopicTree
            data={exam.units}
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
                />
              </label>
              <button
                className="aw-btn aw-btn-ghost"
                disabled={!selectedNode?.unit}
              >
                + Add Topic
              </button>
            </form>

            {/* SUBTOPIC */}
            <form className="aw-form" onSubmit={handleCreateSubtopic}>
              <label className="aw-field">
                <span>New Subtopic</span>
                <input
                  value={newSubtopicName}
                  onChange={(e) => setNewSubtopicName(e.target.value)}
                />
              </label>
              <button
                className="aw-btn aw-btn-ghost"
                disabled={!selectedNode?.topic}
              >
                + Add Subtopic
              </button>
            </form>

            <button
              className="aw-btn aw-btn-outline"
              disabled={!selectedNode?.topic}
              onClick={handleToggleLock}
            >
              {selectedNode?.topic?.locked ? "Unlock Topic" : "Lock Topic"}
            </button>
          </div>
        </div>

        {/* CENTER: QUESTION FORM */}
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
                    setQuestionForm((f) => ({ ...f, hindiText: e.target.value }))
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
                disabled={!selectedNode?.subtopic}
              >
                + Add Question (Auto Release)
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: QUESTION LIST */}
        <div className="aw-column">
          <div className="aw-card">
            <div className="aw-card-title">All Questions</div>

            {flatQuestions.length === 0 && (
              <p className="aw-muted">No questions created yet.</p>
            )}

            {flatQuestions.map((q) => (
              <QuestionCard
                key={q._id}
                question={q}
                onDelete={() => handleDelete(q._id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
