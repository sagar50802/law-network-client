import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Minimal fetch helpers that ALWAYS send X-Owner-Key.
 * (Bypass getJSON/postJSON so we’re 100% sure the header is present.)
 */
async function getSecureJSON(url) {
  const r = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "X-Owner-Key": import.meta.env.VITE_OWNER_KEY || "",
    },
    credentials: "include",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || j?.message || `GET ${url} failed (${r.status})`);
  return j;
}

async function postSecureJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Owner-Key": import.meta.env.VITE_OWNER_KEY || "",
    },
    body: JSON.stringify(body || {}),
    credentials: "include",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || j?.message || `POST ${url} failed (${r.status})`);
  return j;
}

export default function PrepAccessAdmin() {
  const [items, setItems] = useState([]);
  const [examId, setExamId] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [status, setStatus] = useState("pending"); // pending | approved | rejected (server supports status filter)
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [last, setLast] = useState(null);

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

  useEffect(() => { load(); }, [qs, emailFilter]);

  // Auto-poll every 10s when viewing "pending"
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (status === "pending") {
      pollRef.current = setInterval(load, 10000);
    }
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

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="text-lg font-semibold mb-3">Prep • Access Requests</div>

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

      {err && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 mb-3">
          {err}
          <div className="opacity-70 mt-1">
            Make sure <code>X-Owner-Key</code> is set in your environment as <code>VITE_OWNER_KEY</code>.
          </div>
        </div>
      )}

      {!items.length && !loading ? (
        <div className="text-sm text-gray-600">No {status} requests.</div>
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
                  <div><b>Email:</b> {x.userEmail}</div>
                  {nm ? <div><b>Name:</b> {nm}</div> : null}
                  {ph ? <div><b>Phone:</b> {ph}</div> : null}
                  <div><b>Price:</b> ₹{x.priceAt ?? 0}</div>
                  {x.meta?.planLabel ? <div><b>Plan:</b> {x.meta.planLabel}</div> : null}
                  {x.note ? <div className="mt-1"><b>Note:</b> {x.note}</div> : null}
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
