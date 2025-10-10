import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJSON, postJSON } from "../../utils/api";

/** Small pill button styles */
const btn = "px-4 py-2 rounded-lg font-semibold transition focus:outline-none focus:ring-2";
const primary = `${btn} bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-200`;
const ghost = `${btn} border bg-white hover:bg-gray-50 focus:ring-gray-200`;

function QNav({ total, answers, onJump }) {
  return (
    <div className="sticky top-16 bg-white/80 backdrop-blur rounded-xl border p-3">
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
          const picked = !!answers[n];
          return (
            <button
              key={n}
              onClick={() => onJump(n)}
              className={`h-8 rounded text-sm font-medium transition active:scale-[.98]
                ${picked ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
              title={picked ? "Answered" : "Unanswered"}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TestPlayer({ code }) {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { qno: "A" }
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [current, setCurrent] = useState(1);

  // simple timer (estimate: 1 min per 2 q, min 30)
  const [durationMin, setDurationMin] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const r = await getJSON(`/api/testseries/${code}/play`);
        if (!r?.success) throw new Error(r?.message || "Failed to load questions");
        if (ignore) return;

        const qs = r.questions || [];
        setQuestions(qs);
        const est = Math.max(30, Math.ceil(qs.length / 2));
        setDurationMin(est);
        setTimeLeft(est * 60);
        startedAtRef.current = Date.now();
        setCurrent(qs.length ? qs[0].qno : 1);
      } catch (e) {
        setErr(e?.message || "Failed to load questions");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [code]);

  // countdown
  useEffect(() => {
    if (!timeLeft) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") handleSubmit(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, answers]);

  const total = questions.length;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  function choose(qno, letter) {
    setAnswers((a) => ({ ...a, [qno]: letter }));
  }
  function jump(n) {
    setCurrent(n);
  }
  function next() {
    const idx = questions.findIndex((q) => q.qno === current);
    if (idx >= 0 && idx < total - 1) setCurrent(questions[idx + 1].qno);
  }
  function prev() {
    const idx = questions.findIndex((q) => q.qno === current);
    if (idx > 0) setCurrent(questions[idx - 1].qno);
  }
  function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  async function handleSubmit(auto) {
    clearInterval(timerRef.current);
    try {
      const timeTakenSec = startedAtRef.current
        ? Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000))
        : durationMin * 60 - timeLeft;

      const email = localStorage.getItem("userEmail") || "guest@lawnetwork.com";
      const name = localStorage.getItem("userName") || "";
      const r = await postJSON(`/api/testseries/${code}/submit`, {
        answers,
        timeTakenSec,
        user: { email, name },
      });
      if (!r?.success) throw new Error(r?.message || "Submit failed");
      if (auto) alert("Time up! Auto-submitted.");
      navigate(`/tests/result/${r.resultId}`);
    } catch (e) {
      alert(e?.message || "Submit failed");
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!questions.length) return <div className="p-6">No questions.</div>;

  const q = questions.find((x) => x.qno === current);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* soft gradient band */}
      <div className="absolute inset-x-0 -top-6 h-32 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 pointer-events-none" />
      <div className="relative grid lg:grid-cols-[260px,1fr] gap-6">
        {/* left column: navigator */}
        <QNav total={total} answers={answers} onJump={jump} />

        {/* main */}
        <div>
          <header className="flex items-center justify-between mb-4">
            <div className="text-lg">
              <b>{code}</b> — {answeredCount}/{total} answered
            </div>
            <div
              className={`px-3 py-1.5 rounded-lg font-semibold border bg-white
                ${timeLeft < 60 ? "text-red-600 border-red-200" : "text-indigo-700 border-indigo-200"}`}
              aria-live="polite"
            >
              ⏱ {formatTime(timeLeft)}
            </div>
          </header>

          {/* card */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="font-semibold mb-3 text-lg">
              Q{q.qno}. {q.text}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {(q.options || []).map((optText, idx) => {
                const letter = String.fromCharCode(65 + idx); // A B C D …
                const active = answers[q.qno] === letter;
                return (
                  <button
                    key={idx}
                    onClick={() => choose(q.qno, letter)}
                    className={`text-left border rounded-xl p-3 transition active:scale-[.99]
                      ${active ? "bg-indigo-600 text-white border-indigo-700"
                               : "bg-gray-50 hover:bg-gray-100 border-gray-200"}`}
                  >
                    <span className="font-mono mr-2">({letter})</span>
                    {String(optText).replace(/^\([a-dA-D]\)\s*/, "")}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={prev} disabled={current === questions[0].qno} className={ghost + " disabled:opacity-50"}>
                ← Prev
              </button>
              {current !== questions[questions.length - 1].qno ? (
                <button onClick={next} className={primary}>
                  Next →
                </button>
              ) : (
                <button onClick={() => handleSubmit(false)} className={`${btn} bg-green-600 text-white hover:bg-green-700`}>
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
