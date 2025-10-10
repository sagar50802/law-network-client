// client/src/pages/testseries/ResultScreen.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getJSON } from "../../utils/api";

export default function ResultScreen() {
  const { id } = useParams();
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await getJSON(`/api/testseries/result/${id}`);
        if (r?.success) setRes(r.result);
        else setErr(r?.message || "Failed to load result");
      } catch (e) {
        setErr(e?.message || "Failed to load result");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-gray-600">
        Loading…
      </div>
    );
  }

  if (err) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center text-red-600">
        <div className="text-lg font-semibold mb-2">Error</div>
        <div>{err}</div>
        <div className="mt-6">
          <Link to="/tests" className="underline">
            Back to tests
          </Link>
        </div>
      </div>
    );
  }

  if (!res) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center text-gray-600">
        No result found.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl shadow border border-gray-200 p-6">
        <h1 className="text-2xl font-bold mb-4 text-[#0b1220]">
          Result Summary
        </h1>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Row label="Test Code" value={res.testCode || "—"} />
          <Row label="Email" value={res.user?.email || "—"} />
          <Row label="Name" value={res.user?.name || "—"} />
          <Row label="Score" value={String(res.score ?? "—")} />
          <Row label="Time Taken (sec)" value={String(res.timeTakenSec ?? "—")} />
          <Row
            label="Submitted At"
            value={res.createdAt ? new Date(res.createdAt).toLocaleString() : "—"}
          />
          <Row label="Result ID" value={res._id} mono />
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            to="/tests"
            className="px-4 py-2 rounded border bg-white hover:bg-gray-50"
          >
            Back to Tests
          </Link>
          <Link
            to={`/tests/${res.testCode}`}
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Retake Intro
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      <div className="text-gray-500">{label}</div>
      <div className={`${mono ? "font-mono" : "font-semibold"} text-[#0b1220]`}>
        {value}
      </div>
    </div>
  );
}
