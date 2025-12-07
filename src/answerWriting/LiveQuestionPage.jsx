// src/answerWriting/LiveQuestionPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import QuestionCard from "./components/QuestionCard";
import { fetchLiveQuestion } from "./api/answerWritingApi";
import "./answerWriting.css";

export default function LiveQuestionPage() {
  const { examId } = useParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await fetchLiveQuestion(examId);
        if (!cancelled) {
          setPayload(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load live question", err);
        if (!cancelled) setLoading(false);
      }
    }

    if (examId) load();
    const id = setInterval(load, 30000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [examId]);

  if (loading) {
    return (
      <div className="aw-page aw-loading-page">
        <div className="aw-spinner" />
        <p>Loading live question…</p>
      </div>
    );
  }

  if (!payload?.question) {
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
          <div className="aw-pill">Answer Writing · Live</div>
          <h1>Current Question</h1>
          <p className="aw-muted">
            Attempt this question in exam-like conditions. Questions are
            released automatically by the admin.
          </p>
        </div>
      </div>

      <div className="aw-card">
        <QuestionCard question={payload.question} showStatus={false} />
      </div>
    </div>
  );
}
