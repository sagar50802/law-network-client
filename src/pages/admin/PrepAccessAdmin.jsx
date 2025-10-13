// src/pages/admin/PrepAccessAdmin.jsx
import { useEffect, useMemo, useRef, useState } from "react";

/* =========================================================================
   Admin Access Panel (final)
   - Lists requests (pending / approved / rejected) with filters
   - View screenshot / metadata
   - Approve & grant, Reject, Revoke (with X-Owner-Key header)
   - Shows exam overlay config (trialDays, overlay mode, offsetDays, price)
   - Toggle "Auto-grant" per exam (uses PATCH /exams/:examId/overlay-config)
   ========================================================================= */

const OWNER = import.meta.env.VITE_OWNER_KEY || "";

/* ------------ tiny fetch helpers that ALWAYS send X-Owner-Key ------------ */
async function getSecureJSON(url) {
  const r = await fetch(url, {
    headers: { "Accept": "application/json", "X-Owner-Key": OWNER },
    credentials: "include",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.success === false) throw new Error(j?.error || j?.message || `GET ${url} failed (${r.status})`);
  return j;
}

async function postSecureJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", "Accept": "application/json", "X-Owner-Key": OWNER,
    },
    body: JSON.stringify(body || {}),
    credentials: "include",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.success === false) throw new Error(j?.error || j?.message || `POST ${url} failed (${r.status})`);
  return j;
}

async function patchSecureJSON(url, body) {
  const r = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json", "Accept": "application/json", "X-Owner-Key": OWNER,
    },
    body: JSON.stringify(body || {}),
    credentials: "include",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.success === false) throw new Error(j?.error || j?.message || `PATCH ${url} failed (${r.status})`);
  return j;
}

/* ---------------------------------- UI ---------------------------------- */
export default function PrepAccessAdmin() {
  const [items, setItems] = useState([]);
  const [examId, setExamId] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [status, setStatus] = useState("pending"); // pending | approved | rejected
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [last, setLast] = useState(null);

  // exam meta (overlay + payment + price/trial/autoGrant)
  const [meta, setMeta] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaErr, setMetaErr] = useState("");

  const pollRef = useRef(null);

  const qs = useMemo(() => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (examId) q.set("examId", examId.trim());
    return q.toString();
  }, [status, examId]);

  async function load() {
    setLoading(true); setErr("");
    try {
      const j = await getSecureJSON(`/api/prep/access/requests?${qs}`);
      let list = j?.items || [];
      if (emailFilter.trim()) {
        const e = emailFilter.trim().toLowerCase();
        list = list.filter(x => (x.userEmail || "").toLowerCase().includes(e));
      }
      setItems(list);
      setLast(new Date());
    } catch (e) {
      setErr(e.message || "Failed to load requests");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMeta() {
    if (!examId.trim()) { setMeta(null); setMetaErr(""); return; }
    setMetaLoading(true); setMetaErr("");
    try {
      const j = await getSecureJSON(`/api/prep/exams/${encodeURIComponent(examId.trim())}/meta?_=${Date.now()}`);
      setMeta(j || null);
    } catch (e) {
      setMeta(null);
      setMetaErr(e.message || "Failed to load overlay meta");
    } finally {
      setMetaLoading(false);
    }
  }

  useEffect(() => { load(); }, [qs, emailFilter]);
  useEffect(() => { loadMeta(); }, [examId]);

  // Auto-poll every 10s when viewing "pending"
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (status === "pending") pollRef.current = setInterval(load, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status, qs, emailFilter]);

  async function approve(id, grant = true) {
    if (!id) return;
    try {
      await postSecureJSON("/api/prep/access/admin/approve", { requestId: id, approve: grant });
      await load();
    } catch (e) {
      alert(e.message || "Approve failed");
    }
  }

  async function revokeRow(x) {
    try {
      await postSecureJSON("/api/prep/access/admin/revoke", { examId: x.examId, email: x.userEmail });
      await load();
    } catch (e) {
      alert(e.message || "Revoke failed");
    }
  }

  async function toggleAutoGrant(nextVal) {
    if (!examId.trim()) return;
    try {
      await patchSecureJSON(
        `/api/prep/exams/${encodeURIComponent(examId.trim())}/overlay-config`,
        { autoGrantRestart: !!nextVal }
      );
      await loadMeta();
      // on next user submission, server will auto-approve when enabled
    } catch (e) {
      alert(e.message || "Failed to toggle auto-grant");
    }
  }

  /* ------------------------------- render ------------------------------- */
  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="text-lg font-semibold mb-3">Prep • Access Requests</div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <select
          className="border px-2 py-1 rounded"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          title="Status filter"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <input
          className="border px-2 py-1 rounded w-48"
          placeholder="Filter by examId"
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
        />
        <input
          className="border px-2 py-1 rounded w-56"
          placeholder="Filter by email"
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
        />
        <button className="px-3 py-1 border rounded" onClick={load}>Refresh</button>

        <div className="text-xs text-gray-600 ml-auto">
          {loading ? "Loading…" : last ? `Last update: ${last.toLocaleTimeString()}` : ""}
        </div>
      </div>

      {/* Meta box for current examId */}
      {examId ? (
        <div className="border rounded p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm">Exam settings — <span className="font-mono">{examId}</span></div>
            {metaLoading && <div className="text-xs text-gray-500">Loading…</div>}
          </div>

          {metaErr && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 mt-2">
              {metaErr}
            </div>
          )}

          {meta && (
            <div className="mt-2 grid gap-2 text-sm">
              <div className="text-gray-700">
                <div><b>Name:</b> {meta?.name || "—"}</div>
                <div><b>Price:</b> ₹{Number(meta?.price ?? 0)}</div>
                <div><b>Trial days:</b> {Number(meta?.trialDays ?? 0)}</div>
              </div>

              <div className="text-gray-700">
                <div><b>Overlay mode:</b> {String(meta?.overlay?.mode || "—")}</div>
                {meta?.overlay?.mode === "fixed-date" && (
                  <div><b>Fixed at:</b> {meta?.overlay?.fixedAt ? new Date(meta.overlay.fixedAt).toLocaleString() : "—"}</div>
                )}
                {meta?.overlay?.mode === "offset-days" && (
                  <div><b>After N days (per user):</b> {Number(meta?.overlay?.offsetDays ?? 0)}</div>
                )}
                {meta?.overlay?.mode === "planDayTime" && (
                  <div>
                    <div><b>Show on day:</b> {Number(meta?.overlay?.showOnDay ?? 1)}</div>
                    <div><b>Show at (local):</b> {String(meta?.overlay?.showAtLocal || "09:00")}</div>
                    <div><b>Time zone:</b> {String(meta?.overlay?.tz || "Asia/Kolkata")}</div>
                  </div>
                )}
              </div>

              <div className="text-gray-700">
                <div><b>Auto-grant:</b> {meta?.autoGrantRestart ? "ON" : "OFF"}</div>
                <div className="mt-1 flex gap-2">
                  {!meta?.autoGrantRestart ? (
                    <button className="px-3 py-1 rounded bg-emerald-600 text-white"
                            onClick={() => toggleAutoGrant(true)}>Enable Auto-grant</button>
                  ) : (
                    <button className="px-3 py-1 rounded bg-rose-600 text-white"
                            onClick={() => toggleAutoGrant(false)}>Disable Auto-grant</button>
                  )}
                </div>
              </div>

              <div className="text-[12px] text-gray-600">
                Tip: With <b>After N days (per user)</b>, the user sees the payment overlay
                immediately after trial ends (e.g., trial=2 ⇒ overlay on day 3).
                If trial=0 and N=0, overlay shows on Day 1.
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Error banner for requests list */}
      {err && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 mb-3">
          {err}
          <div className="opacity-70 mt-1">
            Ensure <code>X-Owner-Key</code> is configured in your environment as <code>VITE_OWNER_KEY</code>.
          </div>
        </div>
      )}

      {/* Requests table/cards */}
      {!items.length && !loading ? (
        <div className="text-sm text-gray-600">No {status} requests{examId ? ` for ${examId}` : ""}.</div>
      ) : (
        <div className="grid gap-3">
          {items.map((x) => {
            const nm = x?.meta?.name || "";
            const ph = x?.meta?.phone || "";
            const plan = x?.meta?.planLabel ? ` • Plan: ${x.meta.planLabel}` : "";
            const when = x?.createdAt ? new Date(x.createdAt).toLocaleString() : "";
            return (
              <div key={x._id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {String(x.intent || "").toUpperCase()} • {x.examId}
                  </div>
                  <div className="text-xs text-gray-500">{when}</div>
                </div>

                <div className="text-xs text-gray-700 mt-1">
                  <div><b>Email:</b> {x.userEmail}</div>
                  {nm ? <div><b>Name:</b> {nm}</div> : null}
                  {ph ? <div><b>Phone:</b> {ph}</div> : null}
                  <div><b>Price:</b> ₹{x.priceAt ?? 0}{plan}</div>
                  {x.note ? <div className="mt-1"><b>Note:</b> {x.note}</div> : null}
                </div>

                {x.screenshotUrl ? (
                  <div className="mt-2">
                    <a
                      href={x.screenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline text-blue-600"
                    >
                      View Screenshot
                    </a>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-gray-500">No screenshot</div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {status === "pending" && (
                    <>
                      <button
                        className="px-3 py-1 rounded bg-emerald-600 text-white"
                        onClick={() => approve(x._id, true)}
                        title="Approve and grant access immediately"
                      >
                        Approve & Grant
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-rose-600 text-white"
                        onClick={() => approve(x._id, false)}
                        title="Mark as rejected"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  <button
                    className="px-3 py-1 rounded border"
                    onClick={() => revokeRow(x)}
                    title="Revoke the user’s existing access for this exam"
                  >
                    Revoke Access
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
