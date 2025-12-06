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

  useEffect(() => {
    async function load() {
      try {
        // const { data } = await fetchExamDetail(examId);
        // setExam(data);

        const mock = {
          id: examId,
          name:
            examId === "up-apo" ? "UP APO" : examId === "cg-apo" ? "CG APO" : "Bihar APO",
          units: [
            {
              id: "u1",
              name: "Unit 1",
              locked: false,
              topics: [
                {
                  id: "t1",
                  name: "Preamble",
                  locked: false,
                  hasScheduledQuestions: true,
                  subtopics: [
                    {
                      id: "s1",
                      name: "Unit 1",
                      questions: [
                        {
                          id: "q1",
                          code: "Q1",
                          topicName: "Preamble",
                          hindiText:
                            "केसवानंद भारती बनाम केरल राज्य मामले में...",
                          englishText:
                            "In Kesavananda Bharati v. State of Kerala...",
                          releaseAt: new Date().toISOString(),
                          isReleased: true,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        };

        setExam(mock);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [examId]);

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;

    const newUnit = {
      id: `u-${Date.now()}`,
      name: newUnitName,
      locked: false,
      topics: [],
    };

    setExam((prev) => ({ ...prev, units: [...(prev?.units || []), newUnit] }));
    setNewUnitName("");

    try {
      // await createUnit(examId, { name: newUnitName });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    const parentUnit =
      selectedNode?.unit || exam?.units?.[0]; // fallback to first unit
    if (!parentUnit || !newTopicName.trim()) return;

    const newTopic = {
      id: `t-${Date.now()}`,
      name: newTopicName,
      locked: false,
      hasScheduledQuestions: false,
      subtopics: [],
    };

    setExam((prev) => ({
      ...prev,
      units: prev.units.map((u) =>
        u.id === parentUnit.id ? { ...u, topics: [...u.topics, newTopic] } : u
      ),
    }));
    setNewTopicName("");

    try {
      // await createTopic(parentUnit.id, { name: newTopicName });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubtopic = async (e) => {
    e.preventDefault();
    const parentTopic =
      selectedNode?.topic ||
      exam?.units?.[0]?.topics?.[0]; // simple fallback for now
    if (!parentTopic || !newSubtopicName.trim()) return;

    const newSubtopic = {
      id: `s-${Date.now()}`,
      name: newSubtopicName,
      questions: [],
    };

    setExam((prev) => ({
      ...prev,
      units: prev.units.map((u) => ({
        ...u,
        topics: u.topics.map((t) =>
          t.id === parentTopic.id
            ? { ...t, subtopics: [...(t.subtopics || []), newSubtopic] }
            : t
        ),
      })),
    }));
    setNewSubtopicName("");

    try {
      // await createSubtopic(parentTopic.id, { name: newSubtopicName });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    const targetSubtopic =
      selectedNode?.subtopic ||
      exam?.units?.[0]?.topics?.[0]?.subtopics?.[0];

    if (!targetSubtopic) return;

    const { hindiText, englishText, releaseDate, releaseTime } = questionForm;
    if (!hindiText && !englishText) return;

    const releaseAt =
      releaseDate && releaseTime
        ? new Date(`${releaseDate}T${releaseTime}:00`).toISOString()
        : null;

    const newQuestion = {
      id: `q-${Date.now()}`,
      code: `Q${(targetSubtopic.questions?.length || 0) + 1}`,
      topicName: selectedNode?.topic?.name || "Topic",
      hindiText,
      englishText,
      releaseAt,
      isReleased: false,
    };

    setExam((prev) => ({
      ...prev,
      units: prev.units.map((u) => ({
        ...u,
        topics: u.topics.map((t) => ({
          ...t,
          hasScheduledQuestions:
            t.id === selectedNode?.topic?.id ? true : t.hasScheduledQuestions,
          subtopics: t.subtopics.map((s) =>
            s.id === targetSubtopic.id
              ? {
                  ...s,
                  questions: [...(s.questions || []), newQuestion],
                }
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

    try {
      // await createQuestion(targetSubtopic.id, { hindiText, englishText, releaseAt });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleLock = async () => {
    const topic =
      selectedNode?.topic || (selectedNode?.subtopic && selectedNode.topic);
    if (!topic) return;

    const newLocked = !topic.locked;

    setExam((prev) => ({
      ...prev,
      units: prev.units.map((u) => ({
        ...u,
        topics: u.topics.map((t) =>
          t.id === topic.id ? { ...t, locked: newLocked } : t
        ),
      })),
    }));

    try {
      // await toggleLockTopic(topic.id, newLocked);
    } catch (err) {
      console.error(err);
    }
  };

  const flatQuestions = [];
  exam?.units?.forEach((u) =>
    u.topics?.forEach((t) =>
      t.subtopics?.forEach((s) =>
        (s.questions || []).forEach((q) =>
          flatQuestions.push({ ...q, topicName: t.name })
        )
      )
    )
  );

  return (
    <div className="aw-page aw-admin-builder">
      <div className="aw-page-header">
        <div>
          <div className="aw-pill">Admin · {exam?.name}</div>
          <h1>Exam Builder</h1>
          <p className="aw-muted">
            Define syllabus hierarchy and control automatic question release for
            each cohort. Topics turn green automatically when questions are
            scheduled.
          </p>
        </div>
      </div>

      <div className="aw-grid aw-grid-3col">
        {/* Left: syllabus tree & creation forms */}
        <div className="aw-column">
          <UnitTopicTree
            data={exam?.units || []}
            onSelectItem={(item) => setSelectedNode(item)}
          />

          <div className="aw-card aw-form-card">
            <div className="aw-card-title">Syllabus Structure</div>

            <form className="aw-form" onSubmit={handleCreateUnit}>
              <label className="aw-field">
                <span>New Unit</span>
                <input
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="Unit 1"
                />
              </label>
              <button type="submit" className="aw-btn aw-btn-ghost">
                + Add Unit
              </button>
            </form>

            <form className="aw-form" onSubmit={handleCreateTopic}>
              <label className="aw-field">
                <span>New Topic (under selected Unit)</span>
                <input
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Preamble"
                />
              </label>
              <button type="submit" className="aw-btn aw-btn-ghost">
                + Add Topic
              </button>
            </form>

            <form className="aw-form" onSubmit={handleCreateSubtopic}>
              <label className="aw-field">
                <span>New Subtopic (under selected Topic)</span>
                <input
                  value={newSubtopicName}
                  onChange={(e) => setNewSubtopicName(e.target.value)}
                  placeholder="Unit 1"
                />
              </label>
              <button type="submit" className="aw-btn aw-btn-ghost">
                + Add Subtopic
              </button>
            </form>

            <button
              type="button"
              className="aw-btn aw-btn-outline"
              onClick={handleToggleLock}
              disabled={!selectedNode}
            >
              {selectedNode?.topic?.locked ? "Unlock Topic" : "Lock Topic"}
            </button>
          </div>
        </div>

        {/* Center: create question */}
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
                  placeholder="प्रश्न हिन्दी में लिखें…"
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
                  placeholder="Write question in English…"
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

              <button type="submit" className="aw-btn aw-btn-primary">
                + Add Question (Auto Release)
              </button>
              <p className="aw-muted aw-hint">
                Questions will be released automatically at the scheduled time
                for all students in the cohort. No manual intervention required.
              </p>
            </form>
          </div>
        </div>

        {/* Right: list of questions */}
        <div className="aw-column">
          <div className="aw-card">
            <div className="aw-card-title">All Questions</div>
            <div className="aw-question-list">
              {flatQuestions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  onDelete={async () => {
                    setExam((prev) => ({
                      ...prev,
                      units: prev.units.map((u) => ({
                        ...u,
                        topics: u.topics.map((t) => ({
                          ...t,
                          subtopics: t.subtopics.map((s) => ({
                            ...s,
                            questions: (s.questions || []).filter(
                              (qq) => qq.id !== q.id
                            ),
                          })),
                        })),
                      })),
                    }));
                    try {
                      // await deleteQuestion(q.id);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  onEdit={() => {
                    // later: open modal with this question prefilled
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
