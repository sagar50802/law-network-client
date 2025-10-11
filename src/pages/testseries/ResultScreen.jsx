import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getJSON } from "../../utils/api";

/* ---------- tiny UI helpers ---------- */
const btn = "px-4 py-2 rounded-lg font-semibold transition focus:outline-none focus:ring-2";
const primary = `${btn} bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-200`;
const ghost = `${btn} border bg-white hover:bg-gray-50 focus:ring-gray-200`;

const Card = ({ children, className = "" }) => (
  <div className={`bg-white border rounded-2xl shadow-sm ${className}`}>{children}</div>
);

function ProgressRing({ value = 0 }) {
  const pct = Math.max(0, Math.min(100, value));
  const deg = pct * 3.6;
  return (
    <div className="relative w-28 h-28">
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(#10b981 ${deg}deg, #e5e7eb ${deg}deg 360deg)` }}
      />
      <div className="absolute inset-2 rounded-full bg-white grid place-items-center">
        <div className="text-center">
          <div className="text-2xl font-bold">{Math.round(pct)}%</div>
          <div className="text-xs text-gray-500">Score</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- normalization helper ---------- */
function normLetter(v) {
  if (v == null) return "";
  let s = String(v).trim().toUpperCase();
  const num = Number(s);
  if (!isNaN(num) && num >= 1 && num <= 5) return String.fromCharCode(64 + num); // 1→A, etc.
  s = s.replace(/^\(|\)$/g, "");
  s = s.replace(/^OPTION\s*/i, "");
  s = s.replace(/[^A-E]/g, "");
  return s.length ? s[0] : "";
}

/* ---------- page ---------- */
export default function ResultScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // 1️⃣ Get saved result (includes questions if backend provided)
        const r1 = await getJSON(`/api/testseries/result/${id}`);
        if (!r1?.success || !r1.result) throw new Error(r1?.message || "Result not found");
        setResult(r1.result);

        // 2️⃣ Prefer questions from /result (they include correct keys)
        let qs = r1.questions || [];

        // 3️⃣ Fallback to /play only if missing
        if (!qs?.length && r1.result?.testCode) {
          const r2 = await getJSON(`/api/testseries/${r1.result.testCode}/play`);
          if (r2?.success) qs = r2.questions || [];
        }

        // 4️⃣ Normalize
        qs = qs.map((q, i) => ({
          ...q,
          qno: Number(q.qno ?? i + 1),
          correct: normLetter(q.correct),
          options: Array.isArray(q.options) ? q.options.map(String) : [],
        }));

        setQuestions(qs);
      } catch (e) {
        setErr(e?.message || "Failed to load result");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ---------- Stats ---------- */
  const stats = useMemo(() => {
    if (!result || !questions.length)
      return { attempted: 0, correct: 0, wrong: 0, skipped: 0, pct: 0 };

    let attempted = 0,
      correct = 0,
      wrong = 0;

    for (const q of questions) {
      const pick = normLetter(result.answers?.[q.qno]);
      if (!pick) continue;
      attempted++;
      if (pick === q.correct) correct++;
      else wrong++;
    }

    const skipped = questions.length - attempted;
    const pct = questions.length ? (correct / questions.length) * 100 : 0;
    return { attempted, correct, wrong, skipped, pct };
  }, [result, questions]);

  /* ---------- CSV Export ---------- */
  function downloadCsv() {
    if (!questions.length || !result) return;
    const rows = [["Qno", "Your", "Correct"]];
    for (const q of questions) {
      rows.push([q.qno, normLetter(result.answers?.[q.qno]) || "", q.correct || ""]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `result_${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- UI Rendering ---------- */
  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!result) return <div className="p-6">No result.</div>;

  const when = result.createdAt ? new Date(result.createdAt).toLocaleString() : "—";
  const email = result.user?.email || "—";

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 relative">
      {/* gradient band */}
      <div className="absolute inset-x-0 -top-6 h-32 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 pointer-events-none" />

      {/* header card */}
      <Card className="relative p-6 mb-6">
        <div className="flex items-center gap-6">
          <ProgressRing value={stats.pct} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
            <div className="rounded-xl border bg-white p-3">
              <div className="text-xs text-gray-500">Test Code</div>
              <div className="font-mono">{result.testCode}</div>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <div className="text-xs text-gray-500">Email</div>
              <div>{email}</div>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <div className="text-xs text-gray-500">Time Taken (sec)</div>
              <div className="font-semibold">{result.timeTakenSec ?? "—"}</div>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <div className="text-xs text-gray-500">Attempted</div>
              <div className="font-semibold">{stats.attempted}</div>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <div className="text-xs text-gray-500">Correct</div>
              <div className="font-semibold text-emerald-700">{stats.correct}</div>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <div className="text-xs text-gray-500">Wrong</div>
              <div className="font-semibold text-rose-700">{stats.wrong}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500">Submitted: {when}</div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => window.print()} className={ghost}>
            Print
          </button>
          <button onClick={downloadCsv} className={ghost}>
            Export CSV
          </button>
          <button onClick={() => navigator.clipboard?.writeText(location.href)} className={ghost}>
            Copy Link
          </button>
          <Link to={`/tests/${result.testCode}`} className={primary}>
            Retake Intro
          </Link>
          <button onClick={() => navigate("/tests")} className={ghost}>
            Back to Tests
          </button>
        </div>
      </Card>

      {/* answer review */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">Answer Review</h2>
        <div className="space-y-4">
          {questions.map((q) => {
            const pick = normLetter(result.answers?.[q.qno]);
            const corr = normLetter(q.correct);
            const isCorrect = pick && corr && pick === corr;
            const state = pick ? (isCorrect ? "correct" : "wrong") : "skipped";
            const badge =
              state === "correct"
                ? "bg-emerald-100 text-emerald-800"
                : state === "wrong"
                ? "bg-rose-100 text-rose-800"
                : "bg-slate-100 text-slate-700";

            return (
              <div key={q.qno} className="border rounded-xl p-4 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium">
                    Q{q.qno}. {q.text}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${badge}`}>
                      {state.toUpperCase()}
                    </span>
                    {!corr && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        No key
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid sm:grid-cols-2 gap-2">
                  {(q.options || []).map((optText, idx) => {
                    const letter = String.fromCharCode(65 + idx); // A/B/C/D/E
                    const isCorr = corr === letter;
                    const isPicked = pick === letter;

                    let cls = "rounded-lg border p-2 text-sm";
                    if (isCorr) cls += " bg-emerald-50 border-emerald-200"; // ✅ correct
                    else if (isPicked) cls += " bg-rose-50 border-rose-200"; // ❌ wrong
                    else cls += " bg-gray-50 border-gray-200";

                    return (
                      <div key={idx} className={cls}>
                        <span className="font-mono mr-2">({letter})</span>
                        {String(optText).replace(/^\([a-eA-E]\)\s*/, "")}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="text-xs text-gray-500 text-center mt-4">
        Result ID: <span className="font-mono">{result._id}</span>
      </div>
    </div>
  );
}
