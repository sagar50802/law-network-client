// client/src/pages/testseries/ResultScreen.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getJSON } from "../../utils/api";

export default function ResultScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);      // TestResult doc
  const [questions, setQuestions] = useState([]);  // [{ qno, text, options, correct }]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // 1) Get saved result
        const r1 = await getJSON(`/api/testseries/result/${id}`);
        if (!r1?.success || !r1.result) throw new Error(r1?.message || "Result not found");
        setResult(r1.result);

        // 2) Fetch questions of the same test to compare correct vs chosen
        const r2 = await getJSON(`/api/testseries/${r1.result.testCode}/play`);
        if (!r2?.success) throw new Error(r2?.message || "Failed to load questions");
        setQuestions(r2.questions || []);
      } catch (e) {
        setErr(e?.message || "Failed to load result");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const stats = useMemo(() => {
    if (!result || !questions.length) return { attempted: 0, correct: 0, wrong: 0, skipped: 0 };
    let attempted = 0, correct = 0, wrong = 0;
    for (const q of questions) {
      const pick = result.answers?.[q.qno];
      if (!pick) continue;
      attempted++;
      if (pick === q.correct) correct++;
      else wrong++;
    }
    const skipped = questions.length - attempted;
    return { attempted, correct, wrong, skipped };
  }, [result, questions]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!result) return <div className="p-6">No result.</div>;

  const score = typeof result.score === "number" ? result.score.toFixed(2) : "—";
  const when = result.createdAt ? new Date(result.createdAt).toLocaleString() : "—";
  const email = result.user?.email || "—";
  const name = result.user?.name || "—";

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Header card */}
      <div className="bg-white border rounded-2xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Result Summary</div>
            <h1 className="text-2xl font-bold text-[#0b1220] mt-1">
              Test <span className="font-mono">{result.testCode}</span>
            </h1>
            <div className="text-sm text-gray-600 mt-1">
              {name !== "—" ? `${name} • ` : ""}{email}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Chip label="Score" value={score} tone="indigo" />
            <Chip
              label="Time (sec)"
              value={result.timeTakenSec ?? "—"}
              tone="slate"
            />
            <Chip label="Submitted" value={when} tone="emerald" />
          </div>
        </div>

        {/* quick stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <Stat title="Questions" value={questions.length} />
          <Stat title="Attempted" value={stats.attempted} />
          <Stat title="Correct" value={stats.correct} tone="green" />
          <Stat title="Wrong/Skipped" value={`${stats.wrong}/${stats.skipped}`} tone="red" />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate(`/tests/${result.testCode}`)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Retake Intro
          </button>
          <button
            onClick={() => navigate("/tests")}
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
          >
            Back to Tests
          </button>
        </div>
      </div>

      {/* Review list */}
      <div className="bg-white border rounded-2xl shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">Answer Review</h2>
        {!questions.length ? (
          <div className="text-gray-600">No questions found.</div>
        ) : (
          <ul className="space-y-4">
            {questions.map((q) => {
              const pick = result.answers?.[q.qno];
              const isCorrect = pick && pick === q.correct;
              const state =
                pick ? (isCorrect ? "correct" : "wrong") : "skipped";

              return (
                <li
                  key={q.qno}
                  className={`rounded-xl border p-4 ${
                    state === "correct"
                      ? "bg-emerald-50 border-emerald-200"
                      : state === "wrong"
                        ? "bg-rose-50 border-rose-200"
                        : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold">
                      Q{q.qno}. {q.text}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        state === "correct"
                          ? "bg-emerald-100 text-emerald-800"
                          : state === "wrong"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {state.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-3 grid sm:grid-cols-2 gap-2">
                    {(q.options || []).map((optText, idx) => {
                      const letter = String.fromCharCode(65 + idx); // A, B, C, …
                      const isUser = pick === letter;
                      const isRight = q.correct === letter;

                      // style each option
                      let cls =
                        "text-left border rounded-lg px-3 py-2 bg-white";
                      if (isRight) cls += " border-emerald-300 bg-emerald-50";
                      if (isUser && !isRight) cls += " border-rose-300 bg-rose-50";
                      if (isUser && isRight) cls += " ring-1 ring-emerald-400";

                      return (
                        <div key={idx} className={cls}>
                          <span className="font-mono mr-2">{letter}.</span>
                          <span>{optText.replace(/^\([a-dA-D]\)\s*/, "")}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            {isUser ? "• your choice" : ""}
                            {isUser && isRight ? " (correct)" : ""}
                            {!isUser && isRight ? " • correct" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* meta */}
      <div className="text-xs text-gray-500 text-center">
        Result ID: <span className="font-mono">{result._id}</span>
      </div>
    </div>
  );
}

/* ---------- tiny UI helpers ---------- */
function Chip({ label, value, tone = "slate" }) {
  const toneMap = {
    slate: "bg-slate-100 text-slate-800",
    indigo: "bg-indigo-100 text-indigo-800",
    emerald: "bg-emerald-100 text-emerald-800",
  };
  return (
    <div className={`px-3 py-2 rounded-xl ${toneMap[tone]} text-sm`}>
      <div className="text-[11px] uppercase tracking-wide opacity-75">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
function Stat({ title, value, tone = "slate" }) {
  const toneMap = {
    slate: "bg-gray-50",
    green: "bg-emerald-50",
    red: "bg-rose-50",
  };
  return (
    <div className={`rounded-xl border ${toneMap[tone]} p-4`}>
      <div className="text-xs uppercase tracking-wider text-gray-500">{title}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
