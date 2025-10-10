import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJSON } from "@/utils/api";
import { Loader2 } from "lucide-react";

export default function TestIntro({ code }) {
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) return;
    getJSON(`/api/testseries/${code}`)
      .then((res) => {
        if (res.success) setTest(res.test);
        else setError(res.message || "Failed to load test");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-[70vh] text-gray-600">
        <Loader2 className="animate-spin w-8 h-8 mr-2" />
        Loading test details...
      </div>
    );

  if (error)
    return (
      <div className="text-center py-20 text-red-600 font-semibold">
        ⚠️ {error}
      </div>
    );

  if (!test)
    return (
      <div className="text-center py-20 text-gray-600">
        Test not found or unavailable.
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="bg-white shadow-md rounded-2xl border border-gray-200 p-8">
        <h1 className="text-3xl font-bold mb-4 text-[#0b1220] text-center">
          {test.title}
        </h1>

        <div className="text-center mb-6 text-gray-600">
          <p className="text-sm">
            <strong>Paper:</strong> {test.paper}
          </p>
          <p className="text-sm">
            <strong>Total Questions:</strong> {test.totalQuestions}
          </p>
          <p className="text-sm">
            <strong>Duration:</strong> {test.durationMin} minutes
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-700 leading-relaxed text-sm mb-6">
          <ul className="list-disc pl-6 space-y-1">
            <li>Each question carries {test.marks || 1} mark.</li>
            <li>There may be negative marking for wrong answers.</li>
            <li>You must finish the test within the allotted time.</li>
            <li>Do not refresh or close the tab while the test is running.</li>
          </ul>
        </div>

        <button
          onClick={() => navigate(`/tests/${code}/play`)}
          className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
        >
          ▶️ Start Test
        </button>
      </div>
    </div>
  );
}
