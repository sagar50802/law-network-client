import React, { useState } from "react";
import { adminScheduleQuestion } from "../utils/qnaApi";
import { useParams } from "react-router-dom";

export default function AdminQnAScheduler() {
  const { questionId } = useParams();
  const [time, setTime] = useState("");

  const saveSchedule = async () => {
    await adminScheduleQuestion(questionId, { scheduledRelease: time });
    alert("Scheduled successfully");
  };

  return (
    <div className="qna-root" style={{ padding: "20px" }}>
      <h1>Schedule Question</h1>

      <input
        type="datetime-local"
        onChange={(e) => setTime(e.target.value)}
      />

      <button onClick={saveSchedule}>Save Schedule</button>
    </div>
  );
}
