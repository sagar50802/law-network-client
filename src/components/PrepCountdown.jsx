import React, { useEffect, useState } from "react";

export default function PrepCountdown({ modules = [] }) {
  const [next, setNext] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const now = Date.now();
    const upcoming = modules
      .filter((m) => m.releaseAt && new Date(m.releaseAt).getTime() > now)
      .sort(
        (a, b) =>
          new Date(a.releaseAt).getTime() - new Date(b.releaseAt).getTime()
      );
    if (upcoming.length) setNext(upcoming[0]);
  }, [modules]);

  useEffect(() => {
    if (!next) return;
    const target = new Date(next.releaseAt).getTime();
    const totalWindow = 6 * 60 * 60 * 1000; // show 6h window

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("Releasing soon!");
        setProgress(100);
        clearInterval(timer);
        return;
      }

      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${hrs}h ${mins}m ${secs}s`);

      const passed = Math.max(0, totalWindow - diff);
      setProgress(Math.min((passed / totalWindow) * 100, 100));
    }, 1000);

    return () => clearInterval(timer);
  }, [next]);

  if (!next) return null;

  return (
    <div
      style={{
        background: "white",
        borderRadius: "1rem",
        padding: "1rem",
        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.3rem",
          fontSize: "0.9rem",
          color: "#444",
        }}
      >
        <span>Next: {next.title || "Upcoming Module"}</span>
        <span>{timeLeft}</span>
      </div>
      <div
        style={{
          width: "100%",
          height: "6px",
          background: "#eee",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "#007bff",
            transition: "width 1s linear",
          }}
        />
      </div>
    </div>
  );
}
