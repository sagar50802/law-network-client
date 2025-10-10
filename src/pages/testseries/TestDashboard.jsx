import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJSON } from "../../utils/api";

export default function TestDashboard() {
  const [papers, setPapers] = useState({});
  const [open, setOpen] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await getJSON("/api/testseries?_=" + Date.now());
        if (!r?.success) throw new Error(r?.message || "Failed to load tests");
        setPapers(r.papers || {});
      } catch (e) {
        setErr(e?.message || "Failed to load tests");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;

  const paperNames = Object.keys(papers);

  if (!paperNames.length) {
    return <div className="p-6 text-gray-600">No tests available yet.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">🧪 Test Series</h1>

      <div className="space-y-4">
        {paperNames.map((paper) => {
          const tests = papers[paper] || [];
          const isOpen = !!open[paper];
          return (
            <div
              key={paper}
              className="bg-white border rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Accordion header */}
              <button
                onClick={() => setOpen((o) => ({ ...o, [paper]: !o[paper] }))}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
              >
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    Paper
                  </div>
                  <div className="font-semibold text-lg text-gray-800">
                    {paper}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {tests.length} test{tests.length !== 1 ? "s" : ""}
                </div>
              </button>

              {/* Accordion body */}
              {isOpen && (
                <div className="border-t px-3 py-3">
                  <ul className="divide-y">
                    {tests.map((t) => (
                      <li
                        key={t.code}
                        className="py-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {t.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Code:{" "}
                            <span className="font-mono text-gray-700">
                              {t.code}
                            </span>{" "}
                            • {t.totalQuestions ?? "—"} Q •{" "}
                            {t.durationMin ?? "—"} min
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            to={`/tests/${encodeURIComponent(t.code)}`}
                            className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 transition text-sm"
                            title="View test intro"
                          >
                            Details
                          </Link>
                          <Link
                            to={`/tests/${encodeURIComponent(t.code)}/play`}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition text-sm"
                            title="Start test"
                          >
                            Start
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
