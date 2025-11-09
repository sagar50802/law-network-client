// client/src/pages/testseries/AdminTestResults.jsx
import { useEffect, useState } from "react";
import { getJSON } from "../../utils/api"; // <-- relative path, no "@/"

export default function AdminTestResults() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await getJSON("/api/testseries/results?_=" + Date.now());
        if (!r?.success) throw new Error(r?.message || "Failed to load results");
        setRows(r.results || []);
      } catch (e) {
        setErr(e?.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-gray-600">
        <span className="inline-block animate-pulse mr-2">⏳</span>
        Loading results…
      </div>
    );
  }

  if (err) {
    return (
      <div className="text-center py-20 text-red-600 font-semibold">
        ⚠️ {err}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="text-center py-20 text-gray-600">
        No results yet.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test Results (Admin)</h1>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Test Code</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Time (sec)</th>
              <th className="px-3 py-2">Result ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="px-3 py-2">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2 font-mono">{r.testCode}</td>
                <td className="px-3 py-2">
                  {r.user?.name || "—"}{" "}
                  <span className="text-gray-500">{r.user?.email || ""}</span>
                </td>
                <td className="px-3 py-2">{r.score}</td>
                <td className="px-3 py-2">{r.timeTakenSec ?? "—"}</td>
                <td className="px-3 py-2 font-mono">{r._id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
