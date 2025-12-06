import React, { useEffect, useState } from "react";
import "./CountdownTimer.css"; // optional

export default function CountdownTimer({ label = "Countdown", targetTime }) {
  const [timeLeft, setTimeLeft] = useState(getRemaining(targetTime));

  function getRemaining(t) {
    if (!t) return { h: "00", m: "00", s: "00" };

    const diff = Math.max(0, new Date(t).getTime() - Date.now());

    const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");

    return { h, m, s };
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getRemaining(targetTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  return (
    <div className="aw-card aw-countdown-card">
      <div className="aw-card-title">{label}</div>

      <div className="aw-countdown-display">
        <div className="time-box">{timeLeft.h}</div>
        <span className="sep">:</span>
        <div className="time-box">{timeLeft.m}</div>
        <span className="sep">:</span>
        <div className="time-box">{timeLeft.s}</div>
      </div>

      <div className="aw-muted">
        Target:{" "}
        {targetTime
          ? new Date(targetTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Not set"}
      </div>
    </div>
  );
}
