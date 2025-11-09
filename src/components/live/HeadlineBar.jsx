import { useEffect, useState, useRef } from "react";

/**
 * 📰 HeadlineBar — LawNetwork Live Scroller
 * -------------------------------------------------
 * ✅ Smooth slow scroll
 * ✅ LIVE red dot pulse
 * ✅ Auto-adjust speed (slower, based on text length)
 * ✅ Consistent cross-browser performance
 */
export default function HeadlineBar({ slide }) {
  const [headline, setHeadline] = useState("Loading latest headline...");
  const textRef = useRef(null);

  // 🧩 Build headline dynamically
  useEffect(() => {
    if (!slide) {
      setHeadline("Awaiting next broadcast from LawNetwork Live...");
      return;
    }
    const program = slide.programName?.trim() || "LawNetwork Live";
    const title = slide.title?.trim() || "Breaking Legal News";
    setHeadline(`${program} • ${title}`);
  }, [slide]);

  // 🎞 Adjust scroll speed dynamically (now slower)
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const length = headline.length;
    // ⚙️ Slower, smooth scroll speed — now 40s–100s range
    const speed = Math.min(100, Math.max(40, Math.round(length * 1.5)));
    el.style.animationDuration = `${speed}s`;
  }, [headline]);

  return (
    <div className="headline-bar">
      <div className="headline-inner" ref={textRef}>
        <span className="live-dot" />
        <div className="headline-text">{headline}</div>
      </div>
    </div>
  );
}
