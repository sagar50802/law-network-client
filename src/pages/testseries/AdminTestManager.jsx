import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getJSON, absUrl } from "../../utils/api";

export default function AdminTestManager() {
  const [tab, setTab] = useState("tests"); // "tests" | "results"

  /* ---------- TESTS STATE ---------- */
  const [rows, setRows] = useState([]);
  const [papers, setPapers] = useState([]);
  const [paperSel, setPaperSel] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  /* ---------- RESULTS STATE ---------- */
  const [results, setResults] = useState([]);
  const [resLoading, setResLoading] = useState(false);

  /* ---------- FETCH TESTS + PAPERS ---------- */
  useEffect(() => {
    (async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          getJSON("/api/testseries/papers"),
          getJSON("/api/testseries/tests"),
        ]);
        setPapers(pRes?.papers || []);
        setRows(tRes?.tests || []);
      } catch (e) {
        setMsg(e?.message || "Failed to load tests");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- FILTER TESTS ---------- */
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((t) => (paperSel ? t.paper === paperSel : true))
      .filter((t) =>
        !needle
          ? true
          : [t.code, t.title, t.paper].some((f) =>
              String(f || "").toLowerCase().includes(needle)
            )
      );
  }, [rows, q, paperSel]);

  /* ---------- DELETE TEST ---------- */
  async function handleDelete(code) {
    if (!code) return;
    const ownerKey = localStorage.getItem("ownerKey") || "";
    const yes = confirm(`Delete test "${code}"? This cannot be undone.`);
    if (!yes) return;

    try {
      const res = await fetch(absUrl(`/api/testseries/${code}`), {
        method: "DELETE",
        headers: { "X-Owner-Key": ownerKey },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success)
        throw new Error(data?.message || "Delete failed");

      setRows((r) => r.filter((t) => t.code !== code));
      setPapers((ps) =>
        ps
          .map((p) =>
            p.paper === (rows.find((t) => t.code === code)?.paper || p.paper)
              ? { ...p, count: Math.max(0, (p.count || 1) - 1) }
              : p
          )
          .filter((p) => p.count > 0)
      );
      flash(`✅ Deleted ${code}`);
    } catch (e) {
      alert(e?.message || "Delete failed");
    }
  }

  /* ---------- DELETE PAPER ---------- */
  async function deletePaper(paper) {
    if (!paper) return;
    const ownerKey = localStorage.getItem("ownerKey") || "";
    const yes = confirm(
      `⚠️ Delete ALL tests under "${paper}"? This cannot be undone.`
    );
    if (!yes) return;

    try {
      const res = await fetch(
        absUrl(`/api/testseries/paper/${encodeURIComponent(paper)}`),
        { method: "DELETE", headers: { "X-Owner-Key": ownerKey } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success)
        throw new Error(data?.message || "Delete failed");

      setRows((r) => r.filter((t) => t.paper !== paper));
      setPapers((ps) => ps.filter((p) => p.paper !== paper));
      setPaperSel("");
      flash(`🗑 Removed "${paper}" (${data.deleted || 0} tests)`);
    } catch (e) {
      alert(e?.message || "Delete paper failed");
    }
  }

  function flash(text) {
    setMsg(text);
    setTimeout(() => setMsg(""), 2500);
  }

  /* ---------- FETCH RESULTS ---------- */
  async function loadResults() {
    setResLoading(true);
    try {
      const r = await getJSON("/api/testseries/results");
      setResults(r?.results || []);
    } catch (e) {
      alert(e?.message || "Failed to load results");
    } finally {
      setResLoading(false);
    }
  }

  /* ---------- UI ---------- */
  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-[#0b1220]">
          🧮 Admin Test Manager
        </h1>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-lg ${
              tab === "tests"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setTab("tests")}
          >
            Tests
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${
              tab === "results"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => {
              setTab("results");
              if (!results.length) loadResults();
            }}
          >
            Results
          </button>
        </div>
      </div>

      {msg && (
        <div className="mb-4 text-sm px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
          {msg}
        </div>
      )}

      {/* TESTS TAB */}
      {tab === "tests" && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-6">
            <select
              value={paperSel}
              onChange={(e) => setPaperSel(e.target.value)}
              className="border rounded-lg px-3 py-2 min-w-[220px]"
              title="Filter by paper"
            >
              <option value="">All Papers</option>
              {papers.map((p) => (
                <option key={p.paper} value={p.paper}>
                  {p.paper} ({p.count})
                </option>
              ))}
            </select>

            {paperSel && (
              <button
                onClick={() => deletePaper(paperSel)}
                className="px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                Delete Paper
              </button>
            )}

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by code, title, paper…"
              className="w-full sm:w-72 border rounded-lg px-3 py-2"
            />
            <Link
              to="/owner/tests/import"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              + Import
            </Link>
          </div>

          {!filtered.length ? (
            <div className="text-gray-600">No tests found.</div>
          ) : (
            <div className="overflow-x-auto bg-white border rounded-2xl shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Paper</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2 text-center">Questions</th>
                    <th className="px-3 py-2 text-center">Duration</th>
                    <th className="px-3 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.code} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">{t.paper}</td>
                      <td className="px-3 py-2">{t.title}</td>
                      <td className="px-3 py-2 font-mono">{t.code}</td>
                      <td className="px-3 py-2 text-center">
                        {t.totalQuestions ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {t.durationMin ?? "—"} min
                      </td>
                      <td className="px-3 py-2 flex flex-wrap gap-2 justify-center">
                        <Link
                          to={`/tests/${t.code}`}
                          className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
                        >
                          Open Intro
                        </Link>
                        <Link
                          to={`/tests/${t.code}/play`}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-900"
                        >
                          Play
                        </Link>
                        <button
                          onClick={() => handleDelete(t.code)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* RESULTS TAB */}
      {tab === "results" && (
        <div className="bg-white border rounded-2xl shadow-sm p-4">
          {resLoading ? (
            <div className="p-4 text-gray-500">Loading results...</div>
          ) : !results.length ? (
            <div className="p-4 text-gray-500">No results found yet.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">Test Code</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2 text-center">Score</th>
                  <th className="px-3 py-2 text-center">Time (sec)</th>
                  <th className="px-3 py-2">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="px-3 py-2 font-mono">{r.testCode}</td>
                    <td className="px-3 py-2">
                      {r.user?.name || "—"}{" "}
                      <span className="text-gray-500 text-xs">
                        ({r.user?.email || "no email"})
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-indigo-700">
                      {r.score}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.timeTakenSec ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4">
        Tip: Keep your <span className="font-mono">ownerKey</span> in
        localStorage to authorize admin actions.
      </div>
    </div>
  );
}
