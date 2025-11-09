// client/src/pages/testseries/TestPlayer.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getJSON, postJSON } from "../../utils/api";

/* ---------------- UI bits ---------------- */
const Card = ({ className = "", children }) => (
  <div className={`bg-white border rounded-2xl shadow-sm ${className}`}>{children}</div>
);

function ProgressRing({ value = 0, label = "Answered" }) {
  const pct = Math.max(0, Math.min(100, value));
  const deg = pct * 3.6;
  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20">
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(#6366f1 ${deg}deg, #e5e7eb ${deg}deg 360deg)` }}
      />
      <div className="absolute inset-2 rounded-full bg-white grid place-items-center">
        <div className="text-center leading-tight">
          <div className="text-base sm:text-lg font-bold">{Math.round(pct)}%</div>
          <div className="text-[10px] text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}
/* ----------------------------------------- */

export default function TestPlayer() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [durationMin, setDurationMin] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const startedAtRef = useRef(0);
  const timerRef = useRef(null);

  /* ---- fetch & sanitize ---- */
  useEffect(() => {
    (async () => {
      try {
        const r = await getJSON(`/api/testseries/${code}/play`);
        if (!r?.success) throw new Error(r?.message || "Failed to load questions");

        const raw = Array.isArray(r.questions) ? r.questions : [];
        const clean = raw
          .filter(Boolean)
          .map((q, i) => ({
            qno: q?.qno ?? q?.qNo ?? q?.no ?? i + 1,
            text: String(q?.text ?? q?.question ?? "").trim(),
            options: Array.isArray(q?.options) ? q.options.filter(Boolean) : [],
            correct: q?.correct ?? q?.answer ?? null,
            marks: q?.marks ?? 1,
            negative: q?.negative ?? 0,
          }))
          .filter((q) => q.text && q.options.length >= 2);

        setQuestions(clean);

        const est = Math.max(30, Math.ceil((clean.length || 60) / 2));
        setDurationMin(est);
        setTimeLeft(est * 60);
        startedAtRef.current = Date.now();
      } catch (e) {
        setErr(e?.message || "Failed to load questions");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  /* ---- timer ---- */
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

  /* ---- derived ---- */
  const total = questions.length;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const pctAnswered = total ? (answeredCount / total) * 100 : 0;

  /* ---- helpers ---- */
  function fmtTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function choose(qno, letter) {
    if (!qno) return;
    setAnswers((a) => ({ ...a, [qno]: letter }));
  }

  function go(i) {
    if (!total) return;
    const clamped = Math.max(0, Math.min(total - 1, i));
    setCurrent(clamped);
  }

  async function handleSubmit(auto = false) {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);

    try {
      const timeTakenSec =
        startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0;

      const email = localStorage.getItem("userEmail") || "guest@lawnetwork.com";
      const name = localStorage.getItem("userName") || "";

      const r = await postJSON(`/api/testseries/${code}/submit`, {
        answers,
        timeTakenSec,
        user: { email, name },
      });
      if (!r?.success) throw new Error(r?.message || "Submit failed");
      navigate(`/tests/result/${r.resultId}`);
    } catch (e) {
      alert(e?.message || "Submit failed");
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-4 sm:p-6">Loading…</div>;
  if (err) return <div className="p-4 sm:p-6 text-red-600">{err}</div>;
  if (!total) return <div className="p-4 sm:p-6">No questions were found for this test.</div>;

  const q = questions[current];
  const qno = q?.qno ?? current + 1;

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <Card className="p-3 sm:p-5">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <ProgressRing value={pctAnswered} label="Answered" />
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-gray-500">Test</div>
              <div className="text-xl sm:text-2xl font-bold text-[#0b1220] break-all">{code}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs">
                  {answeredCount}/{total} answered
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">
                  ⏱ {fmtTime(timeLeft)}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs">
                  {durationMin} min
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg font-semibold ${
              submitting ? "bg-gray-400 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>

        {/* number bar: horizontal scroll-snap on mobile */}
        <div className="mt-3 sm:mt-4 -mx-1">
          <div
            className="flex gap-2 overflow-x-auto px-1 pb-1 scroll-smooth"
            style={{ scrollbarWidth: "none" }}
          >
            {questions.map((qq, i) => {
              const done = !!answers[qq.qno];
              const active = i === current;
              return (
                <button
                  key={qq.qno ?? i}
                  onClick={() => go(i)}
                  className={`shrink-0 h-9 min-w-9 px-3 rounded-full text-xs font-medium border snap-center ${
                    active
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : done
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                  aria-label={`Go to question ${i + 1}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Question card */}
      <Card className="p-4 sm:p-5">
        {!q ? (
          <div className="text-gray-600">This question is unavailable. Use the number bar above.</div>
        ) : (
          <>
            <div className="font-semibold text-lg sm:text-xl mb-3">
              Q{qno}. {q.text}
            </div>

            <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
              {(q.options || []).map((optText, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const picked = answers[qno] === letter;
                return (
                  <button
                    key={idx}
                    onClick={() => choose(qno, letter)}
                    className={`text-left border rounded-xl px-3 py-3 transition ${
                      picked ? "bg-indigo-50 border-indigo-300" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-mono mr-2">({letter})</span>
                    {String(optText).replace(/^\([a-dA-D]\)\s*/, "")}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex gap-2 sm:gap-3">
              <button
                onClick={() => go(current - 1)}
                disabled={current === 0}
                className="w-1/2 sm:w-auto px-4 py-2 rounded-lg border bg-white disabled:opacity-50"
              >
                ← Prev
              </button>
              <button
                onClick={() => go(current + 1)}
                disabled={current >= total - 1}
                className="w-1/2 sm:w-auto px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </Card>

      {/* mobile safe-area spacer so bottom buttons don’t collide with gesture bar */}
      <div className="h-3 sm:h-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
    </div>
  );
}
