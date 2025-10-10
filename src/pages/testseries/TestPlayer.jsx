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
    <div className="relative w-20 h-20 sm:w-24 sm:h-24">
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(#6366f1 ${deg}deg, #e5e7eb ${deg}deg 360deg)` }}
      />
      <div className="absolute inset-2 rounded-full bg-white grid place-items-center">
        <div className="text-center leading-tight">
          <div className="text-lg sm:text-xl font-bold">{Math.round(pct)}%</div>
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
  const [answers, setAnswers] = useState({}); // { qno: "A" }
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
        // Drop falsy, normalize fields, ensure qno exists, strip empty options
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
          // keep only items that at least have a question text and 2+ options
          .filter((q) => q.text && q.options.length >= 2);

        setQuestions(clean);

        // timer: default 1 min per 2 questions (min 30)
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

  /* ---- guards ---- */
  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!total) return <div className="p-6">No questions were found for this test.</div>;

  const q = questions[current]; // may still be undefined if data weird; guard below
  const qno = q?.qno ?? current + 1;

  /* ---- UI ---- */
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ProgressRing value={pctAnswered} label="Answered" />
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500">Test</div>
              <div className="text-xl font-bold text-[#0b1220]">{code}</div>
              <div className="mt-1 flex gap-2 text-xs">
                <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700">
                  {answeredCount}/{total} answered
                </span>
                <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700">
                  ⏱ {fmtTime(timeLeft)}
                </span>
                <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700">
                  {durationMin} min
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className={`px-4 py-2 rounded-lg font-semibold ${
              submitting ? "bg-gray-400 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>

        {/* pill nav */}
        <div className="mt-4 grid grid-cols-8 gap-2">
          {questions.map((qq, i) => {
            const done = !!answers[qq.qno];
            const active = i === current;
            return (
              <button
                key={qq.qno ?? i}
                onClick={() => go(i)}
                className={`h-8 rounded-full text-xs font-medium border ${
                  active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : done
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Question card */}
      <Card className="p-5">
        {!q ? (
          <div className="text-gray-600">This question is unavailable. Use the number bar above.</div>
        ) : (
          <>
            <div className="font-semibold text-lg mb-3">
              Q{qno}. {q.text}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {(q.options || []).map((optText, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const picked = answers[qno] === letter;
                return (
                  <button
                    key={idx}
                    onClick={() => choose(qno, letter)}
                    className={`text-left border rounded-lg px-3 py-2 transition ${
                      picked ? "bg-indigo-50 border-indigo-300" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-mono mr-2">({letter})</span>
                    {String(optText).replace(/^\([a-dA-D]\)\s*/, "")}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => go(current - 1)}
                disabled={current === 0}
                className="px-4 py-2 rounded-lg border bg-white disabled:opacity-50"
              >
                ← Prev
              </button>
              <button
                onClick={() => go(current + 1)}
                disabled={current >= total - 1}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
