import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJSON } from "@/utils/api";
import { Loader2 } from "lucide-react";

export default function TestDashboard() {
  const [papers, setPapers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getJSON("/api/testseries")
      .then((res) => {
        if (res.success) setPapers(res.papers || {});
        else setError(res.message || "Failed to load");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-[70vh] text-gray-600">
        <Loader2 className="animate-spin w-8 h-8 mr-2" />
        Loading tests...
      </div>
    );

  if (error)
    return (
      <div className="text-center py-20 text-red-600 font-semibold">
        ⚠️ {error}
      </div>
    );

  const paperNames = Object.keys(papers);
  if (!paperNames.length)
    return (
      <div className="text-center py-20 text-gray-600">
        No tests available yet.
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6 text-[#0b1220] text-center">
        🧠 Test Series Dashboard
      </h1>

      {paperNames.map((paper) => (
        <div
          key={paper}
          className="mb-10 bg-white shadow-md rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-5 text-lg font-semibold">
            {paper}
          </div>

          <div className="divide-y divide-gray-100">
            {papers[paper].map((test) => (
              <div
                key={test.code}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
              >
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {test.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {test.totalQuestions} Questions • {test.durationMin} mins
                  </p>
                </div>
                <Link
                  to={`/tests/${test.code}`}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition text-sm font-semibold"
                >
                  Start Test →
                </Link>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
