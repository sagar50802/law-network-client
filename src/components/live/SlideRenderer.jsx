import { useEffect, useRef, useState } from "react";

export default function SlideRenderer({ slide, isMuted }) {
  if (!slide) return null;

  const isDebate = slide.programType === "DEBATE";

   return (
  <div className={`live-slide ${isDebate ? "debate-mode" : "standard-mode"}`}>
    {isDebate ? (
      <DebateStage slide={slide} isMuted={isMuted} />
    ) : (
      <StandardStage slide={slide} isMuted={isMuted} />
    )}

    {/* Share card added below stage */}
    <ShareCard slide={slide} />
  </div>
);

}

// ===========================
// 1️⃣ STANDARD STAGE COMPONENT
// ===========================
function StandardStage({ slide, isMuted }) {
  const [scrollPos, setScrollPos] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    setScrollPos(0);
    const el = scrollRef.current;
    if (!el) return;
    const total = el.scrollHeight - el.clientHeight;
    if (total <= 0) return;

    const duration = 25000; // 25s, adjust by text length if you like
    const start = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      el.scrollTop = t * total;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [slide._id]);

  return (
    <div className="standard-stage">
      <div className="standard-bg" />
      <div className="standard-main-panel">
        {/* Teleprompter Area */}
        <div className="standard-teleprompter" ref={scrollRef}>
          <h2 className="tele-headline">{slide.title}</h2>
          <p className="tele-text">{slide.content}</p>
        </div>

        {/* Anchor / Avatar Section */}
        <div className="anchor-box">
          <div
            className={`anchor-avatar anchor-${slide.programType.toLowerCase()}`}
          />
          <div className="anchor-meta">
            <div className="anchor-name">Adv. Kavya Shah</div>
            <div className="anchor-role">LawNetwork Legal Desk</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================
 // ===========================
// 2️⃣ DEBATE STAGE COMPONENT (Politics Ki Baat)
// ===========================
function DebateStage({ slide, isMuted }) {
  const [segments, setSegments] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Parse script text for multiple avatars
  useEffect(() => {
    const raw = slide.debateScriptRaw || slide.content || "";
    const avatars = slide.debateAvatars || [];
    const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);

    let parsed = [];

    // Tagged format like [A1] text
    if (lines.every((l) => /^\[A\d+\]/.test(l))) {
      parsed = lines
        .map((l) => {
          const m = l.match(/^\[(A\d+)\]\s*(.+)$/);
          return m ? { speakerCode: m[1], text: m[2] } : null;
        })
        .filter(Boolean);
    } else {
      // Distribute sequentially
      let i = 0;
      parsed = lines.map((t) => ({
        speakerCode:
          avatars.length > 0 ? avatars[i++ % avatars.length].code : "A1",
        text: t,
      }));
    }

    setSegments(parsed);
    setActiveIndex(0);
  }, [slide._id]);

  // Handle speaking transitions
  useEffect(() => {
    if (segments.length === 0) return;
    const seg = segments[activeIndex];

    // --- Simulate voice for active avatar ---
    if (!isMuted && "speechSynthesis" in window) {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(seg.text);

      const voices = synth.getVoices();
      const indian = voices.find((v) => /India|Hindi/i.test(v.name));
      if (indian) utter.voice = indian;
      utter.rate = 0.9;
      utter.pitch = 1.0;

      synth.speak(utter);
    }

    // --- Auto move to next segment ---
    const duration = Math.min(15000, Math.max(4000, seg.text.length * 70));
    const t = setTimeout(() => {
      setActiveIndex((prev) =>
        prev + 1 < segments.length ? prev + 1 : prev
      );
    }, duration);

    return () => clearTimeout(t);
  }, [activeIndex, segments.length, isMuted]);

  const avatars = slide.debateAvatars || [];
  const activeSeg = segments[activeIndex];
  const activeCode = activeSeg?.speakerCode;

  return (
    <div className="debate-stage">
      {/* Program title */}
      <div className="debate-title-bar">
        <span className="debate-title">
          {slide.programName || "Politics Ki Baat"}
        </span>
        <span className="debate-live-badge">LIVE</span>
      </div>

      {/* Avatar grid */}
      <div className={`debate-panel avatars-${avatars.length}`}>
        {avatars.map((av) => {
          const isActive = av.code === activeCode;
          return (
            <div
              key={av.code}
              className={`debate-avatar-frame ${
                isActive ? "active" : "inactive"
              }`}
            >
              <div
                className={`debate-avatar-img avatar-${av.avatarType.toLowerCase()}`}
              />
              <div className="debate-avatar-meta">
                <div className="debate-avatar-name">{av.name}</div>
                <div className="debate-avatar-role">{av.role}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Speech area */}
      <div className="debate-speech-box">
        {activeSeg ? (
          <>
            <div className="debate-speaker-name">
              {
                avatars.find((a) => a.code === activeSeg.speakerCode)
                  ?.name || "Speaker"
              }
            </div>
            <div className="debate-speech-text">{activeSeg.text}</div>
          </>
        ) : (
          <div className="debate-speech-text">Debate starting…</div>
        )}
      </div>
    </div>
  );
}

// ===========================
// 3️⃣ SHARE CARD COMPONENT
// ===========================
function ShareCard({ slide }) {
  if (!slide) return null;
  const program = slide.programName || "LawNetwork Live";
  const title = slide.title || "Breaking Legal Insight";
  const summary =
    slide.content?.slice(0, 140) + (slide.content?.length > 140 ? "..." : "");
  const shareUrl = `${window.location.origin}/live/${slide._id}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `${program}: ${title}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.log("Share canceled", err);
    }
  };

  return (
    <div className="share-card">
      <div className="share-card-bg" />
      <div className="share-card-content">
        <div className="share-card-program">{program}</div>
        <h3 className="share-card-title">{title}</h3>
        <p className="share-card-summary">{summary}</p>
        <button onClick={handleShare} className="share-btn">
          🔗 Share Now
        </button>
      </div>
    </div>
  );
}
