import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getJSON, postJSON } from "../../utils/api";

export default function TestPlayer(props) {
  // Accept code via prop OR URL param
  const params = useParams();
  const code = props.code || params.code;

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [duration, setDuration] = useState(0); // minutes
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);

  /* ----------------- Fetch questions ----------------- */
  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        const res = await getJSON(`/api/testseries/${encodeURIComponent(code)}/play`);
        if (res?.success && Array.isArray(res.questions)) {
          setQuestions(res.questions);

          // default duration = 1 min per 2 questions, fallback 30 mins
          const est = Math.ceil(res.questions.length / 2) || 30;
          setDuration(est);
          setTimeLeft(est * 60);
          startedAtRef.current = Date.now();
        } else {
          throw new Error(res?.message || "Failed to load questions");
        }
      } catch (err) {
        setError(err?.message || "Failed to load questions");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  /* ----------------- Timer countdown ----------------- */
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true); // auto-submit when timer ends
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  /* ----------------- Helpers ----------------- */
  function handleOptionSelect(qno, optLetter) {
    setAnswers((prev) => ({ ...prev, [qno]: optLetter }));
  }

  function next() {
    if (current < questions.length - 1) setCurrent((c) => c + 1);
  }

  function prev() {
    if (current > 0) setCurrent((c) => c - 1);
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  /* ----------------- Submit ----------------- */
  async function handleSubmit(auto = false) {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);

    try {
      const startedAt = startedAtRef.current || Date.now();
      const timeTakenSec = Math.max(0, Math.round((Date.now() - startedAt) / 1000));

      const email = localStorage.getItem("userEmail") || "guest@lawnetwork.com";
      const name = localStorage.getItem("userName") || "";

      const res = await postJSON(`/api/testseries/${encodeURIComponent(code)}/submit`, {
        answers,
        user: { email, name },
        timeTakenSec,
      });

      if (res?.success) {
        if (auto) alert("⏱ Time is up! Your test was auto-submitted.");
        navigate(`/tests/result/${res.resultId}`);
      } else {
        throw new Error(res?.message || "Submission failed");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert(err?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ----------------- Rendering ----------------- */
  if (loading)
    return (
      <div className="flex items-center justify-center h-[60vh] text-gray-600">
        Loading test…
      </div>
    );

  if (error)
    return (
      <div className="text-center py-20 text-red-600 font-semibold">
        ⚠️ {error}
      </div>
    );

  if (!questions.length)
    return (
      <div className="text-center py-20 text-gray-600">
        No questions found.
      </div>
    );

  const q = questions[current];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header with timer */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0b1220]">
          🧾 Question {current + 1} / {questions.length}
        </h1>
        <div
          className={`px-4 py-2 rounded-lg font-semibold ${
            timeLeft < 60 ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-700"
          }`}
          title="Time remaining"
        >
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {/* Question */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-8">
        <p className="font-medium text-lg mb-4">
          {q.qno}. {q.text}
        </p>
        <div className="space-y-3">
          {(q.options || []).map((opt, i) => {
            const letter = String.fromCharCode(65 + i); // A,B,C,D
            const selected = answers[q.qno] === letter;
            const cleanText = String(opt || "").replace(/^\([a-dA-D]\)\s*/, "");
            return (
              <label
                key={i}
                className={`block border rounded-lg p-3 cursor-pointer transition ${
                  selected
                    ? "bg-indigo-600 text-white border-indigo-700"
                    : "bg-gray-50 hover:bg-gray-100 border-gray-200"
                }`}
                onClick={() => handleOptionSelect(q.qno, letter)}
              >
                ({letter}) {cleanText}
              </label>
            );
          })}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={prev}
          disabled={current === 0}
          className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
        >
          ← Prev
        </button>

        {current < questions.length - 1 ? (
          <button
            onClick={next}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className={`px-5 py-2 rounded-lg font-semibold ${
              submitting ? "bg-gray-400" : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {submitting ? "Submitting..." : "Submit Test"}
          </button>
        )}
      </div>
    </div>
  );
}
