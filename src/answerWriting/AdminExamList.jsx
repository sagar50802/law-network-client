import React, { useEffect, useState } from "react";
import { fetchExams, createExam } from "./api/answerWritingApi";
import "./answerWriting.css";

export default function AdminExamList({ onOpenExam }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newExamName, setNewExamName] = useState("");

  useEffect(() => {
    async function load() {
      try {
        // const { data } = await fetchExams();
        // setExams(data);

        setExams([
          { id: "bihar-apo", name: "Bihar APO", unitCount: 3 },
          { id: "up-apo", name: "UP APO", unitCount: 2 },
          { id: "cg-apo", name: "CG APO", unitCount: 1 },
        ]);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!newExamName.trim()) return;

    const temp = { id: newExamName.toLowerCase().replace(/\s+/g, "-"), name: newExamName };
    setExams((prev) => [...prev, temp]);
    setNewExamName("");

    try {
      // await createExam({ name: newExamName });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="aw-page">
      <div className="aw-page-header">
        <div>
          <div className="aw-pill">Admin · Answer Writing</div>
          <h1>Exam Management</h1>
          <p className="aw-muted">
            Create exams (Bihar APO, UP APO, CG APO…) and manage their syllabus
            and scheduled questions.
          </p>
        </div>
      </div>

      <div className="aw-grid aw-grid-2col">
        <div className="aw-card">
          <div className="aw-card-title">All Exams</div>
          {loading ? (
            <div className="aw-spinner small" />
          ) : (
            <ul className="aw-exam-list">
              {exams.map((exam) => (
                <li key={exam.id} className="aw-exam-item">
                  <button
                    type="button"
                    className="aw-exam-main"
                    onClick={() => onOpenExam?.(exam)}
                  >
                    <span className="aw-exam-name">{exam.name}</span>
                    <span className="aw-muted">
                      {exam.unitCount ?? 0} units
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="aw-card">
          <div className="aw-card-title">Create New Exam</div>
          <form className="aw-form" onSubmit={handleCreateExam}>
            <label className="aw-field">
              <span>Name</span>
              <input
                type="text"
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                placeholder="e.g. Bihar APO"
              />
            </label>
            <button type="submit" className="aw-btn aw-btn-primary">
              + Create Exam
            </button>
          </form>
          <p className="aw-muted aw-hint">
            Once created, you can add Units → Topics → Subtopics → Questions
            with full scheduling controls.
          </p>
        </div>
      </div>
    </div>
  );
}
