import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getJSON, postJSON } from "../../utils/api";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function TestPlayer({ code }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [duration, setDuration] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  /* ----------------- Fetch questions ----------------- */
  useEffect(() => {
    if (!code) return;
    getJSON(`/api/testseries/${code}/play`)
      .then((res) => {
        if (res.success && Array.isArray(res.questions)) {
          setQuestions(res.questions);
          //  default duration = 1 min per 2 questions, fallback 30 mins
          const est = Math.ceil(res.questions.length / 2) || 30;
          setDuration(est);
          setTimeLeft(est * 60);
        } else setError(res.message || "Failed to load questions");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [code]);

  /* ----------------- Timer countdown ----------------- */
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true); // auto submit when timer ends
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  /* ----------------- Helpers ----------------- */
  function handleOptionSelect(qno, opt) {
    setAnswers((prev) => ({ ...prev, [qno]: opt }));
  }

  function next() {
    if (current < questions.length - 1) setCurrent(current + 1);
  }

  function prev() {
    if (current > 0) setCurrent(current - 1);
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
      const res = await postJSON(`/api/testseries/${code}/submit`, {
        answers,
        user: { email: "guest@lawnetwork.com" },
        timeTakenSec: duration * 60 - timeLeft,
      });

      if (res.success) {
        toast.success(auto ? "Time up! Auto-submitted." : "Test submitted!");
        navigate(`/tests/result/${res.resultId}`);
      } else throw new Error(res.message || "Submission failed");
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  /* ----------------- Rendering ----------------- */
  if (loading)
    return (
      <div className="flex items-center justify-center h-[70vh] text-gray-600">
        <Loader2 className="animate-spin w-8 h-8 mr-2" />
        Loading test...
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
        >
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {/* Question */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-8">
        <p className="font-medium text-lg mb-4">{q.qno}. {q.text}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i); // A,B,C,D
            const selected = answers[q.qno] === letter;
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
                ({letter}) {opt.replace(/^\([a-dA-D]\)\s*/, "")}
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
              submitting
                ? "bg-gray-400"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {submitting ? "Submitting..." : "Submit Test"}
          </button>
        )}
      </div>
    </div>
  );
}
