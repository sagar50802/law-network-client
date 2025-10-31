import React, { useEffect, useState } from "react";

 export default function PrepCountdown({ modules = [], onExpire }) {
  const [next, setNext] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(0);
  const [isHot, setIsHot] = useState(false); // 🔥 under 10 min

  // pick the next module in future
  useEffect(() => {
    const now = Date.now();
    const upcoming = (modules || [])
      .filter((m) => m?.releaseAt && new Date(m.releaseAt).getTime() > now)
      .sort(
        (a, b) =>
          new Date(a.releaseAt).getTime() - new Date(b.releaseAt).getTime()
      );

    if (upcoming.length) {
      setNext(upcoming[0]);
    } else {
      setNext(null);
    }
  }, [modules]);

  // countdown + progress
  useEffect(() => {
    if (!next) return;

    const target = new Date(next.releaseAt).getTime();
    const totalWindow = 6 * 60 * 60 * 1000; // 6h visual window

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = target - now;

      // 🔥 check if under 10 minutes (600000 ms)
      setIsHot(diff > 0 && diff <= 600000);

       if (diff <= 0) {
  setTimeLeft("Releasing…");
  setProgress(100);
  clearInterval(timer);
  if (typeof onExpire === "function") onExpire(); // 🔁 trigger refresh
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

  // small inline pulse animation — no tailwind change needed
  const pulseStyle = `
    @keyframes pulseAmber {
      0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, .35); }
      70% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
      100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
    }
  `;

  return (
    <>
      {/* inject tiny CSS once */}
      <style>{pulseStyle}</style>
      <div
        style={{
          background: "white",
          borderRadius: "1rem",
          padding: "1rem",
          marginBottom: "1rem",
          border: isHot ? "1px solid rgba(245,158,11,.5)" : "1px solid #f3f4f6",
          boxShadow: isHot
            ? "0 8px 28px rgba(245,158,11,0.25)"
            : "0 2px 6px rgba(0,0,0,0.03)",
          animation: isHot ? "pulseAmber 1.6s ease-out infinite" : "none",
          transition: "all .25s ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.3rem",
            fontSize: "0.9rem",
            color: "#374151",
          }}
        >
          <span style={{ fontWeight: 500 }}>
            Next: {next.title || "Upcoming module"}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              color: isHot ? "#b45309" : "#6b7280",
              fontWeight: isHot ? 600 : 400,
            }}
          >
            {timeLeft}
          </span>
        </div>

        <div
          style={{
            width: "100%",
            height: "7px",
            background: "#e5e7eb",
            borderRadius: "9999px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: isHot ? "#f59e0b" : "#fbbf24",
              transition: "width 1s linear",
              boxShadow: isHot ? "0 0 12px rgba(245,158,11,.8)" : "none",
            }}
          />
        </div>

        <div
          style={{
            fontSize: "0.7rem",
            color: "#9ca3af",
            marginTop: "0.4rem",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>
            Releases at:{" "}
            <b>
              {new Date(next.releaseAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </b>
          </span>
          {isHot && <span style={{ color: "#b45309" }}>almost there… 🔥</span>}
        </div>
      </div>
    </>
  );
}
