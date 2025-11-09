// client/src/pages/testseries/AdminTestManager.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function AdminTestManager() {
  const [tab, setTab] = useState("tests"); // "tests" | "results"
  const [rows, setRows] = useState([]);
  const [papers, setPapers] = useState([]);
  const [paperSel, setPaperSel] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState([]);

  // ✅ hard-fixed working API base (do not change)
  const API = "https://law-network.onrender.com/api";
  async function fetchJSON(url, opts) {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

  // ---------- Load tests + papers ----------
  useEffect(() => {
    (async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          fetchJSON(`${API}/testseries/papers`),
          fetchJSON(`${API}/testseries/tests`),
        ]);
        setPapers(pRes?.papers || []);
        setRows(tRes?.tests || []);
      } catch {
        setMsg("Failed to fetch");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---------- Load results when tab opens ----------
  useEffect(() => {
    if (tab !== "results") return;
    (async () => {
      try {
        const r = await fetchJSON(`${API}/testseries/results`, {
          headers: { "X-Owner-Key": localStorage.getItem("ownerKey") || "" },
        });
        setResults(r?.results || []);
      } catch {
        setResults([]);
      }
    })();
  }, [tab]);

  // ---------- Filters ----------
  const filteredTests = useMemo(() => {
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

  const filteredResults = useMemo(() => {
    const n = q.trim().toLowerCase();
    return results.filter((r) =>
      !n
        ? true
        : [r.testCode, r.user?.email, r.user?.name].join(" ").toLowerCase().includes(n)
    );
  }, [results, q]);

  // ---------- Actions ----------
  async function handleDelete(code) {
    if (!code) return;
    const ownerKey = localStorage.getItem("ownerKey") || "";
    if (!confirm(`Delete test "${code}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/testseries/${encodeURIComponent(code)}`, {
        method: "DELETE",
        headers: { "X-Owner-Key": ownerKey },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Delete failed");
      setRows((r) => r.filter((t) => t.code !== code));
      flash(`✅ Deleted ${code}`);
    } catch (e) {
      alert(e.message);
    }
  }

  async function deletePaper(paper) {
    if (!paper) return;
    const ownerKey = localStorage.getItem("ownerKey") || "";
    if (!confirm(`⚠️ Delete ALL tests under "${paper}"?`)) return;
    try {
      const res = await fetch(`${API}/testseries/paper/${encodeURIComponent(paper)}`, {
        method: "DELETE",
        headers: { "X-Owner-Key": ownerKey },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Delete failed");
      setRows((r) => r.filter((t) => t.paper !== paper));
      setPapers((ps) => ps.filter((p) => p.paper !== paper));
      setPaperSel("");
      flash(`🗑 Removed "${paper}" (${data.deleted || 0} tests)`);
    } catch (e) {
      alert(e.message);
    }
  }

  function flash(text) {
    setMsg(text);
    setTimeout(() => setMsg(""), 2500);
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Tabs */}
      <div className="flex border-b mb-6">
        {["tests", "results"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 font-medium border-b-2 ${
              tab === t
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-indigo-600"
            }`}
          >
            {t === "tests" ? "🧾 Tests" : "📊 Results"}
          </button>
        ))}
      </div>

      {/* Flash Message */}
      {msg && (
        <div className="mb-4 text-sm px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
          {msg}
        </div>
      )}

      {/* TESTS TAB */}
      {tab === "tests" && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6 gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={paperSel}
                onChange={(e) => setPaperSel(e.target.value)}
                className="border rounded-lg px-3 py-2 min-w-[220px]"
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
            </div>

            <div className="flex gap-2">
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
          </div>

          {!filteredTests.length ? (
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
                  {filteredTests.map((t) => (
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
                          Intro
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
        <>
          <div className="flex justify-between items-center mb-4 gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by code, user, or email..."
              className="w-full sm:w-80 border rounded-lg px-3 py-2"
            />
            <span className="text-sm text-gray-500">
              {filteredResults.length} results
            </span>
          </div>

          {!filteredResults.length ? (
            <div className="text-gray-600">No results found.</div>
          ) : (
            <div className="overflow-x-auto bg-white border rounded-2xl shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Test Code</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2 text-center">Score</th>
                    <th className="px-3 py-2 text-center">Time Taken</th>
                    <th className="px-3 py-2 text-center">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((r) => (
                    <tr key={r._id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono">{r.testCode}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.user?.name || "—"}</div>
                        <div className="text-xs text-gray-500">
                          {r.user?.email || ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">
                        {r.score}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">
                        {r.timeTakenSec ? `${r.timeTakenSec}s` : "—"}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="text-xs text-gray-500 mt-4">
        Tip: Keep your <span className="font-mono">ownerKey</span> in localStorage for admin actions.
      </div>
    </div>
  );
}
