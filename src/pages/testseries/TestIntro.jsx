// client/src/pages/testseries/TestIntro.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getJSON } from "../../utils/api";

export default function TestIntro() {
  const { code } = useParams();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await getJSON(`/api/testseries/${encodeURIComponent(code)}?_=${Date.now()}`);
        if (!r?.success) throw new Error(r?.message || "Failed to load test");
        setInfo(r.test || null);
      } catch (e) {
        setErr(e?.message || "Failed to load test");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!info) return <div className="p-6 text-gray-600">Test not found.</div>;

  const { title, durationMin, totalQuestions, paper } = info;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <div className="text-gray-600 mb-6">
        Paper: <b>{paper || "—"}</b> • Code: <span className="font-mono">{code}</span>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <Stat label="Duration" value={`${durationMin ?? "—"} min`} />
        <Stat label="Questions" value={totalQuestions ?? "—"} />
        <Stat label="Negative Marking" value="As set per question" />
      </div>

      <div className="rounded-xl border bg-white p-4 mb-6">
        <h2 className="font-semibold mb-2">Instructions</h2>
        <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
          <li>Choose the best option for each question.</li>
          <li>You can navigate between questions freely.</li>
          <li>Your time will be recorded once you start.</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <Link
          to={`/tests/${encodeURIComponent(code)}/play`}
          className="px-4 py-2 rounded bg-indigo-600 text-white"
        >
          ▶ Start Test
        </Link>
        <Link to="/tests" className="px-4 py-2 rounded border bg-white">
          ← Back to Tests
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
