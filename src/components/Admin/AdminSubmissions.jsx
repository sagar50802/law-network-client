import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON, deleteJSON, absUrl } from "../../utils/api";
import useAccessSync from "../../hooks/useAccessSync";
import AccessTimer from "../common/AccessTimer";

export default function AdminSubmissions() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);

  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const [autoApprove, setAutoApprove] = useState(
    localStorage.getItem("autoApproveSubmissions") === "true"
  );
  useEffect(() => { localStorage.setItem("autoApproveSubmissions", autoApprove); }, [autoApprove]);

  const normalize = (r) => Array.isArray(r) ? r : r?.items || r?.data || r?.submissions || [];

  async function load() {
    try {
      const r = await getJSON("/submissions");
      const arr = normalize(r);
      setItems(arr);

      setSelected((old) => new Set([...old].filter((id) => arr.some((x) => (x._id || x.id) === id))));

      if (autoApprove) {
        const pending = arr.filter((s) => !s.approved && !s.revoked);
        for (const sub of pending) {
          const plan = (sub.plan?.label || "").toLowerCase();
          let seconds = 60 * 60 * 24;
          if (plan.includes("week")) seconds = 60 * 60 * 24 * 7;
          if (plan.includes("month")) seconds = 60 * 60 * 24 * 30;
          if (plan.includes("year")) seconds = 60 * 60 * 24 * 365;
          if (plan.includes("day")) seconds = 60 * 60 * 24;
          await approveOne(sub, seconds, true);
        }
      }
    } catch (err) {
      console.error("Failed to load submissions", err);
    }
  }

  useEffect(() => { (async () => {
    try { const r = await getJSON("/submissions/auto-mode"); if (r?.success) setAutoApprove(!!r.auto); } catch {}
    await load();
  })(); }, []);

  useEffect(() => { (async () => { try { await postJSON("/submissions/auto-mode", { auto: !!autoApprove }); } catch {} })(); }, [autoApprove]);

  useEffect(() => { const t = setInterval(load, 7000); return () => clearInterval(t); }, [autoApprove]);

  useAccessSync((detail) => { if (!detail) return; if (detail.storageSync) load(); });

  async function approveOne(sub, seconds, _isAuto = false) {
    const id = sub._id || sub.id;
    try {
      await postJSON(`/submissions/${id}/approve`, { seconds });

      const ctx = sub.context || {};
      const featureId = ctx.id || ctx.playlist || ctx.subject;
      const type = ctx.type;
      const gmail = sub.email || sub.gmail;
      const expiry = Date.now() + seconds * 1000;

      if (gmail && type && featureId) {
        const detail = {
          feature: type,
          featureId,
          email: gmail,
          expiry,
          fastUnlock: 20000,
          message: `🎉 Congratulations ${sub.name || "User"}! Your plan is now active.`,
        };
        window.dispatchEvent(new CustomEvent("accessUpdated", { detail }));
        window.dispatchEvent(new CustomEvent("accessGranted", { detail }));
      }

      setItems((prev) =>
        prev.map((x) =>
          (x._id || x.id) === id ? { ...x, approved: true, revoked: false, expiry } : x
        )
      );
    } catch (err) {
      console.warn("Approve failed, fallback", err);
      await deleteJSON(`/submissions/${id}`);
    }
  }

  async function revokeOne(sub) {
    const id = sub._id || sub.id;
    try { await postJSON(`/submissions/${id}/revoke`, {}); }
    catch { await deleteJSON(`/submissions/${id}`); }

    const ctx = sub.context || {};
    const featureId = ctx.id || ctx.playlist || ctx.subject;
    const type = ctx.type;
    const gmail = sub.email || sub.gmail;

    if (gmail && type && featureId) {
      // 🔑 include revoked:true to force clients to clear local cache instantly
      const detail = { feature: type, featureId, email: gmail, revoked: true };
      window.dispatchEvent(new CustomEvent("accessUpdated", { detail }));
      window.dispatchEvent(new CustomEvent("accessRevoked", { detail }));
    }

    setItems((prev) =>
      prev.map((x) =>
        (x._id || x.id) === id ? { ...x, revoked: true, approved: false, expiry: null } : x
      )
    );
  }

  async function deleteOne(sub) {
    const id = sub._id || sub.id;
    try { await deleteJSON(`/submissions/${id}`); } catch (e) { console.warn("Delete failed", e); }
    setItems((prev) => prev.filter((x) => (x._id || x.id) !== id));
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  async function deleteMany() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const ids = new Set(selected);
      const mapById = new Map(items.map((s) => [s._id || s.id, s]));
      await Promise.all(
        [...ids].map(async (id) => {
          const s = mapById.get(id);
          if (s) { try { await deleteJSON(`/submissions/${id}`); } catch (e) { console.warn("Batch delete failed for", id, e); } }
        })
      );
      setItems((prev) => prev.filter((x) => !ids.has(x._id || x.id)));
      setSelected(new Set());
    } finally { setBusy(false); }
  }

  const allIds = useMemo(() => items.map((s) => s._id || s.id), [items]);
  const allSelected = selected.size > 0 && selected.size === allIds.length;
  const toggleOne = (id) => setSelected((s) => { const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAll = () => setSelected((s) => (s.size === allIds.length ? new Set() : new Set(allIds)));

  const getContentInfo = (s) => {
    const ctx = s.context || {};
    const raw = (ctx.type || s.type || s.subjectLabel || "").toLowerCase();
    let label = "—", icon = "•";
    if (raw.includes("playlist") || raw.includes("video")) { label = "Video"; icon = "🎬"; }
    else if (raw.includes("podcast")) { label = "Podcast"; icon = "🎧"; }
    else if (raw.includes("pdf") || raw.includes("notebook")) { label = "Notebook"; icon = "📓"; }
    else if (raw.includes("article")) { label = "Article"; icon = "📰"; }
    const subject = ctx.id || ctx.playlist || ctx.subject || s.subjectLabel || "";
    return { label, icon, subject };
  };

  const filtered = useMemo(() => {
    let arr = items;
    if (filter === "pending")  arr = arr.filter((s) => !s.approved && !s.revoked);
    if (filter === "approved") arr = arr.filter((s) => s.approved && !s.revoked);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter((s) =>
        [s.name, s.email, s.gmail, s.phone, s.number, s.plan?.label, s.planKey]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle))
      );
    }
    return arr;
  }, [items, filter, q]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">User Submissions</h3>
        <span className="text-sm text-gray-500">({items.length})</span>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">{selected.size} selected</span>
          <button className="px-3 py-1 rounded border text-red-600 disabled:opacity-50"
                  onClick={deleteMany} disabled={busy || selected.size === 0}>Delete selected</button>
        </div>

        <div className="ml-auto flex gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span>Mode:</span>
            <select value={autoApprove ? "auto" : "manual"} onChange={(e) => setAutoApprove(e.target.value === "auto")}
                    className="border rounded p-1 text-sm">
              <option value="manual">Manual</option>
              <option value="auto">Auto Approval</option>
            </select>
          </label>

          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="border rounded p-2 text-sm" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded p-2 text-sm">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 divide-y divide-gray-200 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Screenshot</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gmail</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((s, idx) => {
              const id = s._id || s.id;
              const { label, icon, subject } = getContentInfo(s);
              const proof = s.proofUrl || s.screenshotPath || s.screenshot || s.proof || ""; // ✅ tolerant
              return (
                <tr key={id} className={s.revoked ? "bg-red-50" : ""}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(id)} onChange={() => toggleOne(id)} />
                  </td>
                  <td className="px-3 py-2">{idx + 1}</td>
                  <td className="px-3 py-2 text-sm">{s.name || "-"}</td>
                  <td className="px-3 py-2 text-sm">{s.plan?.label || "-"}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <span>{icon}</span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100">{label}</span>
                    </div>
                    {subject && <div className="text-xs text-gray-500 truncate mt-0.5">{subject}</div>}
                  </td>
                  <td className="px-3 py-2">
                    {proof ? (
                      <a href={absUrl(proof)} target="_blank" rel="noreferrer">
                        <img src={absUrl(proof)} alt="submission proof" className="w-20 h-14 object-cover rounded shadow-sm" />
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-sm">{s.email || s.gmail || "-"}</td>
                  <td className="px-3 py-2 text-sm">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm">
                    {s.revoked ? ("🔒 Revoked") :
                      s.expiry ? (
                        <div className="flex items-center gap-1">
                          <span className="text-green-600 font-bold">✓</span>
                          <AccessTimer timeLeftMs={s.expiry - Date.now()} />
                        </div>
                      ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-sm flex gap-2">
                    {autoApprove ? (
                      <span className="text-xs text-gray-500">Auto mode active</span>
                    ) : (
                      <ManualGrantButton sub={s} onApprove={approveOne} />
                    )}
                    <button className="px-2 py-1 rounded border text-red-600" onClick={() => revokeOne(s)}>Revoke</button>
                    <button className="px-2 py-1 rounded border text-gray-700" onClick={() => deleteOne(s)}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-gray-400">No submissions</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManualGrantButton({ sub, onApprove }) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const toSeconds = () => days * 86400 + hours * 3600 + minutes * 60;

  return (
    <div className="flex items-center gap-1">
      <input type="number" min="0" value={days} onChange={(e) => setDays(+e.target.value)} className="w-12 px-1 py-0.5 border rounded text-xs" placeholder="D" />
      <input type="number" min="0" value={hours} onChange={(e) => setHours(+e.target.value)} className="w-12 px-1 py-0.5 border rounded text-xs" placeholder="H" />
      <input type="number" min="0" value={minutes} onChange={(e) => setMinutes(+e.target.value)} className="w-12 px-1 py-0.5 border rounded text-xs" placeholder="M" />
      <button onClick={() => { const sec = toSeconds(); if (sec > 0) onApprove(sub, sec, false); }} className="px-2 py-1 rounded border bg-green-50 text-xs">
        Grant
      </button>
    </div>
  );
}
