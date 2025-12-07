// src/answerWriting/LiveQuestionPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import QuestionCard from "./components/QuestionCard";
import { fetchLiveQuestion } from "./api/answerWritingApi";
import "./answerWriting.css";

export default function LiveQuestionPage() {
  const { examId } = useParams();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await fetchLiveQuestion(examId);
        if (!cancelled) {
          setQuestion(data.question || null);
          setLoading(false);
        }
      } catch (e) {
        console.error("fetchLiveQuestion error", e);
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30000); // refresh every 30s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [examId]);

  if (loading) {
    return (
      <div className="aw-page">
        <p>Loading live question…</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="aw-page">
        <div className="aw-card">
          <p>No live question right now. Please check again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aw-page">
      <div className="aw-page-header">
        <div>
          <div className="aw-pill">Answer Writing · LIVE</div>
          <h1>Current Question</h1>
          <p className="aw-muted">
            Attempt the question in exam-like conditions. Tap ‘Show Answer’ to
            view the model answer in Hindi and English.
          </p>
        </div>
      </div>

      <QuestionCard question={question} showAnswerToggle />
    </div>
  );
}
