// src/pages/qna/StudentStudyPage.jsx
import React, { useEffect, useState } from "react";
import "./qna.css";
import { useParams, Link } from "react-router-dom";
import {
  fetchExamDetail,
  fetchUnits,
  fetchTopics,
  fetchSubtopics,
  fetchQuestionsBySubtopic,
} from "./qnaApi";
import NotebookQuestionView from "./components/NotebookQuestionView";

const StudentStudyPage = () => {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [units, setUnits] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activeQuestion, setActiveQuestion] = useState(null);

  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedSubtopic, setSelectedSubtopic] = useState("");

  useEffect(() => {
    const loadExam = async () => {
      try {
        const [examRes, unitsRes] = await Promise.all([
          fetchExamDetail(examId),
          fetchUnits(examId),
        ]);

        setExam(examRes.data);
        setUnits(unitsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadExam();
  }, [examId]);

  const handleUnitChange = async (e) => {
    const id = e.target.value;
    setSelectedUnit(id);
    setSelectedTopic("");
    setSelectedSubtopic("");
    setTopics([]);
    setSubtopics([]);
    setQuestions([]);
    setActiveQuestion(null);

    if (!id) return;
    try {
      const res = await fetchTopics(id);
      setTopics(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTopicChange = async (e) => {
    const id = e.target.value;
    setSelectedTopic(id);
    setSelectedSubtopic("");
    setSubtopics([]);
    setQuestions([]);
    setActiveQuestion(null);

    if (!id) return;
    try {
      const res = await fetchSubtopics(id);
      setSubtopics(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubtopicChange = async (e) => {
    const id = e.target.value;
    setSelectedSubtopic(id);
    setQuestions([]);
    setActiveQuestion(null);

    if (!id) return;
    try {
      const res = await fetchQuestionsBySubtopic(id);
      setQuestions(res.data);
      setActiveQuestion(res.data[0] || null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="qna-page">
      <Link to="/qna" style={{ fontSize: 14, color: "#2563eb" }}>
        ← Back to Exams
      </Link>

      <h1 className="qna-title" style={{ marginTop: 12 }}>
        {exam?.name || "Exam"}
      </h1>
      <p className="qna-subtitle">
        Navigate the syllabus and read released questions
      </p>

      <div className="qna-card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <select
            value={selectedUnit}
            onChange={handleUnitChange}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}
          >
            <option value="">Select Unit</option>
            {units.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            value={selectedTopic}
            onChange={handleTopicChange}
            disabled={!selectedUnit}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}
          >
            <option value="">Select Topic</option>
            {topics.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSubtopic}
            onChange={handleSubtopicChange}
            disabled={!selectedTopic}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}
          >
            <option value="">Select Subtopic</option>
            {subtopics.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {questions.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Questions:</div>
            {questions.map((q) => (
              <div
                key={q._id}
                className="qna-list-row"
                style={{
                  cursor: "pointer",
                  background:
                    activeQuestion?._id === q._id ? "#eff6ff" : "#f9fbff",
                }}
                onClick={() => setActiveQuestion(q)}
              >
                <span>Question {q.order || 1}</span>
                <span className="qna-badge">
                  {new Date(q.releaseAt) <= new Date()
                    ? "Released"
                    : "Scheduled"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <NotebookQuestionView question={activeQuestion} />
    </div>
  );
};

export default StudentStudyPage;
