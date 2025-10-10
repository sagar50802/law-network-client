import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJSON } from "../../utils/api";
import { Loader2 } from "lucide-react";
import confetti from "canvas-confetti";

export default function ResultScreen({ id }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    getJSON(`/api/testseries/result/${id}`)
      .then((res) => {
        if (res.success) {
          setResult(res.result);
          triggerConfetti();
        } else setError(res.message || "Failed to load result");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  function triggerConfetti() {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      scalar: 1.1,
    });
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-[70vh] text-gray-600">
        <Loader2 className="animate-spin w-8 h-8 mr-2" />
        Loading result...
      </div>
    );

  if (error)
    return (
      <div className="text-center py-20 text-red-600 font-semibold">
        ⚠️ {error}
      </div>
    );

  if (!result)
    return (
      <div className="text-center py-20 text-gray-600">
        Result not found.
      </div>
    );

  const { testCode, score, createdAt, user } = result;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 text-center">
      <div className="bg-white shadow-lg border border-gray-200 rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-[#0b1220] mb-4">
          🏆 Test Result
        </h1>

        <p className="text-gray-500 mb-6">
          <strong>Test Code:</strong> {testCode}
          <br />
          <strong>User:</strong> {user?.email || "Guest"}
          <br />
          <strong>Date:</strong>{" "}
          {new Date(createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-10 rounded-xl shadow-inner mb-6">
          <p className="text-5xl font-bold mb-2">{score.toFixed(2)}</p>
          <p className="text-lg font-medium tracking-wide">Your Final Score</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/tests")}
            className="flex-1 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
          >
            🔁 Take Another Test
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition"
          >
            🖨 Print Result
          </button>
        </div>
      </div>

      <p className="text-gray-500 mt-8 text-sm">
        Tip: You can review your answers or retake this test after admin updates
        the paper set.
      </p>
    </div>
  );
}
