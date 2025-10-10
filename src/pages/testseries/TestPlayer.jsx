import { useEffect, useMemo, useRef, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

export default function TestPlayer({ code, userEmail="anon" }) {
  const [t, setT] = useState(null);
  const [i, setI] = useState(0);                 // question index
  const [answers, setAnswers] = useState({});     // {"1": 0, ...}
  const [submitting, setSubmitting] = useState(false);

  const endAt = useRef(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  useEffect(() => {
    getJSON(`/testseries/test/${code}`).then((data) => {
      setT(data);
      endAt.current = Date.now() + data.durationMin * 60 * 1000;
    });
  }, [code]);

  const timeLeft = Math.max(0, Math.floor((endAt.current ?? Date.now()) - now)/1000|0);
  useEffect(() => { if (t && timeLeft === 0) doSubmit(); }, [timeLeft, t]);

  if (!t) return <div className="p-6">Loading…</div>;
  const q = t.questions[i];
  const attempted = Object.keys(answers).length;
  const total = t.questions.length;

  function sel(optIdx) {
    setAnswers(a => ({ ...a, [String(q.n)]: optIdx }));
  }
  function next() { setI(x => Math.min(x+1, total-1)); }
  function prev() { setI(x => Math.max(x-1, 0)); }

  async function doSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await postJSON(`/testseries/attempt/${code}/submit`, {
        user: userEmail, answers, timeTakenSec: t.durationMin*60 - timeLeft
      });
      window.location.href = `/tests/result/${r.resultId}`;
    } catch (e) {
      alert("Submit failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm">Attempted: <b>{attempted}/{total}</b></div>
        <div className="text-sm">Time Left: <b>{fmt(timeLeft)}</b></div>
        <button className="px-4 py-2 rounded-lg border" onClick={doSubmit} disabled={submitting}>End Test</button>
      </div>

      {/* question */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="text-gray-500 mb-2">Question {q.n}</div>
        <div className="text-lg font-medium mb-4">{q.q}</div>
        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            const active = answers[String(q.n)] === idx;
            return (
              <button key={idx}
                onClick={() => sel(idx)}
                className={`w-full text-left p-4 rounded-xl border ${active ? "bg-blue-50 border-blue-600" : "hover:bg-gray-50"}`}>
                <span className="mr-2 font-semibold">{String.fromCharCode(65+idx)}.</span> {opt}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-6">
          <button onClick={prev} className="px-4 py-2 rounded-lg border">← Prev</button>
          <button onClick={next} className="px-4 py-2 rounded-lg border">Next →</button>
        </div>
      </div>
    </div>
  );
}
function fmt(s){const h=(s/3600)|0,m=((s%3600)/60)|0,ss=s%60|0;return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${ss.toString().padStart(2,"0")}`;}
