import { useEffect, useMemo, useRef, useState } from "react";

/* ----------------------------------------------------------------------------
   Backend base URL (no apiBase import required)
   -------------------------------------------------------------------------- */
const BACKEND =
  (import.meta.env && (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE)) ||
  (typeof window !== "undefined" ? window.location.origin : "");

// join BACKEND + path safely; keep absolute URLs intact
function abs(url) {
  try {
    // If already absolute (http/https), use as-is
    new URL(url);
    return url;
  } catch {
    // Relative path → prefix with BACKEND
    const base = (BACKEND || "").replace(/\/+$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${base}${path}`;
  }
}

/* --- helpers that ALWAYS send X-Owner-Key to the backend origin --- */
const RUNTIME_OWNER =
  (typeof window !== "undefined" && localStorage.getItem("ownerKey")) || "";
const OWNER_KEY = RUNTIME_OWNER || (import.meta.env.VITE_OWNER_KEY || "");

async function getSecureJSON(url) {
  const r = await fetch(abs(url), {
    headers: { Accept: "application/json", "X-Owner-Key": OWNER_KEY },
    credentials: "include",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.success === false) {
    throw new Error(j?.error || j?.message || `GET ${url} failed (${r.status})`);
  }
  return j;
}

async function postSecureJSON(url, body) {
  const r = await fetch(abs(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Owner-Key": OWNER_KEY,
    },
    body: JSON.stringify(body || {}),
    credentials: "include",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.success === false) {
    throw new Error(j?.error || j?.message || `POST ${url} failed (${r.status})`);
  }
  return j;
}

async function patchSecureJSON(url, body) {
  const r = await fetch(abs(url), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Owner-Key": OWNER_KEY,
    },
    body: JSON.stringify(body || {}),
    credentials: "include",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.success === false) {
    throw new Error(j?.error || j?.message || `PATCH ${url} failed (${r.status})`);
  }
  return j;
}

/* ------------------------------- Component ------------------------------- */
export default function PrepAccessAdmin() {
  const [items, setItems] = useState([]);
  const [examId, setExamId] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [status, setStatus] = useState("pending"); // pending | approved | rejected | all
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [last, setLast] = useState(null);

  // Auto-approval toggle (reads/writes exam.autoGrantRestart)
  const [autoGrant, setAutoGrant] = useState(false);
  const [autoGrantLoading, setAutoGrantLoading] = useState(false);

  const pollRef = useRef(null);

  // Always include status (including "all") so server doesn’t default to pending.
  const qs = useMemo(() => {
    const q = new URLSearchParams();
    q.set("status", status || "pending");
    if (examId) q.set("examId", examId.trim());
    return q.toString();
  }, [status, examId]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const j = await getSecureJSON(`/api/prep/access/requests?${qs}`);
      let list = j?.items || [];
      if (emailFilter.trim()) {
        const e = emailFilter.trim().toLowerCase();
        list = list.filter((x) => (x.userEmail || "").toLowerCase().includes(e));
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs, emailFilter]);

  // Read auto-approval flag whenever examId changes
  useEffect(() => {
    if (!examId) {
      setAutoGrant(false);
      return;
    }
    (async () => {
      try {
        setAutoGrantLoading(true);
        const meta = await getSecureJSON(
          `/api/prep/exams/${encodeURIComponent(examId)}/meta`
        );
        setAutoGrant(!!meta?.autoGrantRestart);
      } catch {
        // ignore; list can still load
      } finally {
        setAutoGrantLoading(false);
      }
    })();
  }, [examId]);

  // Auto-poll every 10s while viewing "pending"
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (status === "pending") pollRef.current = setInterval(load, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, qs, emailFilter]);

  async function approve(id, grant = true) {
    if (!id) return;
    try {
      await postSecureJSON("/api/prep/access/admin/approve", {
        requestId: id,
        approve: grant,
      });
      await load();
      alert(grant ? "Approved & access granted." : "Request rejected.");
    } catch (e) {
      alert(e.message || "Approve failed");
    }
  }

  async function revokeRow(x) {
    try {
      await postSecureJSON("/api/prep/access/admin/revoke", {
        examId: x.examId,
        email: x.userEmail,
      });
      await load();
      alert("Access revoked.");
    } catch (e) {
      alert(e.message || "Revoke failed");
    }
  }

  // NEW: delete a request row (admin cleanup)
  async function deleteRow(id) {
    try {
      await postSecureJSON("/api/prep/access/admin/delete", { requestId: id });
      await load();
      alert("Request deleted.");
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  async function toggleAutoGrant(nextVal) {
    if (!examId) {
      alert("Enter an examId first.");
      return;
    }
    try {
      setAutoGrantLoading(true);
      await patchSecureJSON(
        `/api/prep/exams/${encodeURIComponent(examId)}/overlay-config`,
        { autoGrantRestart: !!nextVal }
      );
      setAutoGrant(!!nextVal);
    } catch (e) {
      alert(e.message || "Failed to update auto-approval");
    } finally {
      setAutoGrantLoading(false);
    }
  }

  // quick local debug (talks to your debug endpoints)
  async function pingDebug() {
    try {
      const a = await getSecureJSON("/api/prep/access/requests-debug");
      alert(
        `counts: ${JSON.stringify(a.counts)}\nlatest:\n${
          a.latest?.map((x) => `${x.userEmail} ${x.examId} ${x.status}`).join("\n") ||
          "none"
        }`
      );
    } catch (e) {
      alert(e.message);
    }
  }

  const statusLabel = status === "all" ? "" : status;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="text-lg font-semibold mb-3">Prep • Access Requests</div>

      {/* Controls */}
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
          <option value="all">All</option>
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
        <button className="px-3 py-1 border rounded" onClick={load}>
          Refresh
        </button>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-700">
            Auto-approve restarts/purchases
          </label>
          <button
            className={`px-3 py-1 rounded ${
              autoGrant ? "bg-emerald-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => toggleAutoGrant(!autoGrant)}
            disabled={!examId || autoGrantLoading}
            title="When ON, new requests for this exam are immediately approved"
          >
            {autoGrantLoading ? "Saving…" : autoGrant ? "ON" : "OFF"}
          </button>
        </div>

        <button
          className="px-3 py-1 border rounded ml-2"
          onClick={pingDebug}
          title="Check server has rows"
        >
          Debug
        </button>

        <div className="text-xs text-gray-600">
          {loading
            ? "Loading…"
            : last
            ? `Last update: ${last.toLocaleTimeString()}`
            : ""}
        </div>
      </div>

      {err && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 mb-3">
          {err}
          <div className="opacity-70 mt-1">
            Make sure <code>X-Owner-Key</code> is set as <code>VITE_OWNER_KEY</code>.
          </div>
        </div>
      )}

      {/* List */}
      {!items.length && !loading ? (
        <div className="text-sm text-gray-600">
          {statusLabel ? `No ${statusLabel} requests.` : "No requests."}
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((x) => {
            const nm = x?.meta?.name || "";
            const ph = x?.meta?.phone || "";
            return (
              <div key={x._id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {String(x.intent || "").toUpperCase()} • {x.examId}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(x.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="text-xs text-gray-700 mt-1">
                  <div>
                    <b>Email:</b> {x.userEmail}
                  </div>
                  {nm ? (
                    <div>
                      <b>Name:</b> {nm}
                    </div>
                  ) : null}
                  {ph ? (
                    <div>
                      <b>Phone:</b> {ph}
                    </div>
                  ) : null}
                  <div>
                    <b>Price:</b> ₹{x.priceAt ?? 0}
                  </div>
                  {x.meta?.planLabel ? (
                    <div>
                      <b>Plan:</b> {x.meta.planLabel}
                    </div>
                  ) : null}
                  {x.note ? (
                    <div className="mt-1">
                      <b>Note:</b> {x.note}
                    </div>
                  ) : null}
                </div>

                {x.screenshotUrl && (
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
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {x.status === "pending" && (
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

                  {/* NEW: Delete row */}
                  <button
                    className="px-3 py-1 rounded border"
                    onClick={() => deleteRow(x._id)}
                    title="Remove this request from the list"
                  >
                    Delete Row
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
