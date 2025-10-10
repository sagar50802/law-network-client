// client/src/pages/testseries/TestDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJSON } from "../../utils/api";

export default function TestDashboard() {
  const [papers, setPapers] = useState({});
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
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Series</h1>

      <div className="space-y-8">
        {paperNames.map((paper) => (
          <section key={paper} className="rounded-xl border bg-white">
            <header className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{paper}</h2>
              <span className="text-sm text-gray-500">
                {papers[paper]?.length || 0} test(s)
              </span>
            </header>

            <ul className="divide-y">
              {(papers[paper] || []).map((t) => (
                <li key={t.code} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-sm text-gray-500">
                      Code: <span className="font-mono">{t.code}</span> •{" "}
                      {t.totalQuestions ?? "—"} questions • {t.durationMin ?? "—"} min
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/tests/${encodeURIComponent(t.code)}`}
                      className="px-3 py-1.5 rounded border bg-white"
                      title="View test intro"
                    >
                      Details
                    </Link>
                    <Link
                      to={`/tests/${encodeURIComponent(t.code)}/play`}
                      className="px-3 py-1.5 rounded bg-indigo-600 text-white"
                      title="Start test"
                    >
                      Start
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
