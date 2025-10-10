import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getJSON } from "../../utils/api"; // ← fixed: relative import so Vite can resolve

export default function AdminTestResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getJSON("/api/testseries/results?_=" + Date.now());
        if (res?.success) setResults(res.results || []);
        else setError(res?.message || "Failed to load results");
      } catch (err) {
        setError(err?.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-gray-600">
        <Loader2 className="animate-spin w-8 h-8 mr-2" />
        Loading results...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-600 font-semibold">
        ⚠️ {error}
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className="text-center py-20 text-gray-600">
        No results yet.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8 text-[#0b1220] text-center">
        📊 All Test Results (Admin)
      </h1>

      <div className="overflow-x-auto bg-white shadow-md rounded-2xl border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-700 font-semibold">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Test Code</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={r._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3 font-mono">{r.testCode}</td>
                <td className="px-4 py-3">{r.user?.email || "Guest"}</td>
                <td className="px-4 py-3 font-semibold text-indigo-700">
                  {typeof r.score === "number" ? r.score.toFixed(2) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
