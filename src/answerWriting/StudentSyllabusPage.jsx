// ---------------------------------------------
// StudentSyllabusPage.jsx
// ---------------------------------------------
import React, { useEffect, useState } from "react";
import {
  fetchExamDetail,
  fetchReleasedQuestions,
} from "../api/answerWritingApi";
import "../answerWriting/answerWriting.css";

export default function StudentSyllabusPage({ examId }) {
  const [exam, setExam] = useState(null);
  const [released, setReleased] = useState([]); // only released questions
  const [error, setError] = useState("");

  useEffect(() => {
    loadExam();
    loadReleased();
  }, [examId]);

  async function loadExam() {
    try {
      const { data } = await fetchExamDetail(examId);
      setExam(data.exam);
    } catch (err) {
      setError("Failed to load exam.");
    }
  }

  async function loadReleased() {
    try {
      const { data } = await fetchReleasedQuestions(examId);
      setReleased(data.questions);
    } catch (err) {
      setError("Error fetching released questions.");
    }
  }

  function getQuestionsForTopic(topicId) {
    return released.filter((q) => q.topic === topicId); // released only
  }

  function getQuestionsForSubtopic(subId) {
    return released.filter((q) => q.subtopic === subId);
  }

  if (!exam) return <div className="aw-card">Loading exam...</div>;
  if (error) return <div className="aw-error">{error}</div>;

  return (
    <div className="aw-container">
      <h1 className="aw-title">{exam.name} — Syllabus & Questions</h1>

      <div className="aw-card">
        <h2 className="aw-card-title">Syllabus Tree</h2>

        <ul className="aw-tree">
          {exam.units.map((unit) => (
            <li key={unit._id}>
              <span className="aw-tree-unit">{unit.name}</span>

              <ul>
                {unit.topics.map((topic) => {
                  const topicQuestions = getQuestionsForTopic(topic._id);

                  return (
                    <li key={topic._id}>
                      <span className="aw-tree-topic">{topic.name}</span>

                      {/* ---- If NO subtopics → show topic questions directly ---- */}
                      {!topic.subtopics.length && (
                        <div className="aw-question-box">
                          {topicQuestions.length === 0 ? (
                            <p className="aw-muted">No released questions yet.</p>
                          ) : (
                            topicQuestions.map((q) => (
                              <div key={q._id} className="aw-question-card">
                                <h3>{q.questionHindi}</h3>
                                <p className="aw-qen">{q.questionEnglish}</p>

                                <details className="aw-answer">
                                  <summary>Show Answer</summary>
                                  <p>{q.answerHindi}</p>
                                  <p className="aw-qen">{q.answerEnglish}</p>
                                </details>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* ---- If subtopics exist ---- */}
                      {topic.subtopics.length > 0 && (
                        <ul>
                          {topic.subtopics.map((sub) => {
                            const subQuestions = getQuestionsForSubtopic(
                              sub._id
                            );
                            return (
                              <li key={sub._id}>
                                <span className="aw-tree-subtopic">
                                  {sub.name}
                                </span>

                                <div className="aw-question-box">
                                  {subQuestions.length === 0 ? (
                                    <p className="aw-muted">
                                      No released questions yet.
                                    </p>
                                  ) : (
                                    subQuestions.map((q) => (
                                      <div
                                        key={q._id}
                                        className="aw-question-card"
                                      >
                                        <h3>{q.questionHindi}</h3>
                                        <p className="aw-qen">
                                          {q.questionEnglish}
                                        </p>

                                        <details className="aw-answer">
                                          <summary>Show Answer</summary>
                                          <p>{q.answerHindi}</p>
                                          <p className="aw-qen">
                                            {q.answerEnglish}
                                          </p>
                                        </details>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
