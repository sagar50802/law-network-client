import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";   // ✅ NEW
import CountdownTimer from "./components/CountdownTimer";
import ProgressBar from "./components/ProgressBar";
import UnitTopicTree from "./components/UnitTopicTree";
import { fetchStudentDashboard } from "./api/answerWritingApi";
import "./answerWriting.css";

export default function AnswerDashboard() {
  const { examId } = useParams();   // ✅ REAL param from route

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await fetchStudentDashboard(examId);  // ✅ REAL API call
        if (!cancelled) {
          setDashboard(data);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    }

    load();

    // auto refresh every 30s
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
        <p>Loading Answer Writing Dashboard…</p>
      </div>
    );
  }

  const {
    examName,
    overallPercent,
    coveredCount,
    scheduledCount,
    totalCount,
    nextTask,
    dailyTaskWatch,
    subjectProgress,
    units,
  } = dashboard || {};

  const coveredLabel = `${coveredCount} Covered`;
  const scheduledLabel = `${scheduledCount} Scheduled`;
  const pendingLabel = `${totalCount - coveredCount - scheduledCount} Pending`;

  return (
    <div className="aw-page">
      <div className="aw-page-header">
        <div>
          <div className="aw-pill">Answer Writing Class</div>
          <h1>{examName} – Live Progress Monitor</h1>
          <p className="aw-muted">
            Real-time updates, automatic question release, and syllabus tracking
            in one place.
          </p>
        </div>
      </div>

      <div className="aw-grid aw-grid-main">
        {/* Top strip – progress summary */}
        <div className="aw-card aw-progress-summary">
          <div className="aw-progress-summary-header">
            <div className="aw-progress-summary-counts">
              <span className="aw-text-strong">{coveredLabel}</span>
              <span className="aw-link">{scheduledLabel}</span>
            </div>
            <div className="aw-progress-summary-percent">
              <span className="aw-percent-main">{overallPercent}%</span>
              <span className="aw-muted">Complete</span>
            </div>
          </div>
          <div className="aw-progress-summary-bar">
            <div className="aw-progress-bg large">
              <div
                className="aw-progress-fill large"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>
          <div className="aw-progress-summary-extra">
            <span className="aw-muted">{pendingLabel}</span>
          </div>
        </div>

        {/* Next task + Subject progress */}
        <div className="aw-grid aw-grid-2col">
          <CountdownTimer
            label="Next Task Countdown"
            targetTime={nextTask?.releaseAt}
          />

          <div className="aw-card aw-subject-progress">
            <div className="aw-card-title">Subject Progress</div>
            {subjectProgress?.map((s) => (
              <ProgressBar key={s.name} label={s.name} value={s.value} />
            ))}
          </div>
        </div>

        <div className="aw-grid aw-grid-2col">
          {/* Daily Watch */}
          <div className="aw-card aw-daily-watch">
            <div className="aw-card-title">Daily Task Watch</div>
            <div className="aw-daily-watch-body">
              <div className="aw-clock">
                <div className="aw-clock-face">
                  <div className="aw-clock-dot" />
                </div>
              </div>
              <div>
                <div className="aw-daily-watch-number">
                  {dailyTaskWatch ?? 0}
                </div>
                <div className="aw-muted">Tasks completed today</div>
              </div>
            </div>
          </div>

          {/* Unit / Topic Tree */}
          <UnitTopicTree
            data={units}
            onSelectItem={(item) => {
              console.log("selected", item); // Future: navigate to topic/questions
            }}
          />
        </div>
      </div>
    </div>
  );
}
