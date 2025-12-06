import React, { useEffect, useState } from "react";
import CountdownTimer from "./components/CountdownTimer";
import QuestionCard from "./components/QuestionCard";
import { fetchLiveQuestion } from "./api/answerWritingApi";
import "./answerWriting.css";

export default function LiveQuestionPage({ examId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // const { data } = await fetchLiveQuestion(examId);
        // if (!cancelled) setData(data);

        const mock = {
          examName: "Bihar APO",
          unitName: "Unit 1 – Preamble",
          completionPercent: 65,
          currentQuestion: {
            id: "q1",
            code: "Q1",
            title: "Preamble as part of the Constitution",
            hindiText:
              "केसवानंद भारती बनाम केरल राज्य मामले में सर्वोच्च न्यायालय ने निर्णय दिया कि प्रीएंबल संविधान का हिस्सा है।",
            englishText:
              "In Kesavananda Bharati v. State of Kerala, the Supreme Court held that the Preamble is part of the Constitution.",
            releaseAt: new Date().toISOString(),
            isReleased: true,
            topicName: "Preamble",
          },
          nextReleaseAt: new Date(
            Date.now() + 7 * 60 * 60 * 1000
          ).toISOString(),
          upcoming: [
            {
              code: "Q2",
              title: "Preamble not part – Beru Bari case",
              releaseAt: new Date(
                Date.now() + 7 * 60 * 60 * 1000
              ).toISOString(),
            },
            {
              code: "Q3",
              title: "Objectives of Preamble",
              releaseAt: new Date(
                Date.now() + 20 * 60 * 60 * 1000
              ).toISOString(),
            },
          ],
        };

        if (!cancelled) {
          setData(mock);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
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

  if (!data) {
    return (
      <div className="aw-page">
        <p>No live question right now.</p>
      </div>
    );
  }

  const { examName, unitName, completionPercent, currentQuestion, nextReleaseAt, upcoming } =
    data;

  return (
    <div className="aw-page">
      <div className="aw-page-header aw-page-header-split">
        <div>
          <div className="aw-pill">{examName} – Subject Q&A</div>
          <h1>{unitName}</h1>
          <p className="aw-muted">
            Questions are released automatically. Answer in exam-like format and
            track your completion in real time.
          </p>
        </div>
        <div className="aw-page-header-right">
          <span className="aw-muted">Unit Completion</span>
          <div className="aw-chip">
            <span className="aw-chip-value">{completionPercent}%</span>
          </div>
        </div>
      </div>

      <div className="aw-grid aw-grid-2col">
        <QuestionCard question={currentQuestion} showStatus={false} />

        <div className="aw-column-right">
          <CountdownTimer
            label="Next Question Countdown"
            targetTime={nextReleaseAt}
          />

          <div className="aw-card aw-upcoming-card">
            <div className="aw-card-title">Upcoming Q&A</div>
            <ul className="aw-upcoming-list">
              {upcoming?.map((q) => (
                <li key={q.code} className="aw-upcoming-item">
                  <div className="aw-upcoming-code">{q.code}</div>
                  <div className="aw-upcoming-main">
                    <div className="aw-upcoming-title">{q.title}</div>
                    <div className="aw-muted">
                      Release at{" "}
                      {new Date(q.releaseAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
