// client/src/components/Prep/PrepAccessAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

/**
 * PrepAccessAdmin (requests-only)
 * - Select exam
 * - Show read-only payment/price summary (from /meta)
 * - List/search/filter requests
 * - Approve / Reject / Revoke
 * - Delete single + Batch delete
 *
 * Back-end routes:
 *   GET  /api/prep/exams/:examId/meta
 *   GET  /api/prep/access/admin/requests?examId=...
 *   POST /api/prep/access/admin/approve { examId, email, mode: "grant"|"reject"|"revoke" }
 *   POST /api/prep/access/admin/delete  { ids: string[] }
 */

export default function PrepAccessAdmin({ examId: initialExamId }) {
  const [examId, setExamId] = useState(initialExamId || "");
  const [typingExamId, setTypingExamId] = useState(initialExamId || "");

  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null);

  // Requests
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(() => new Set());

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all|pending|approved|rejected
  const [intentFilter, setIntentFilter] = useState("all"); // all|purchase|restart

  // ------- helpers -------
  function toast(msg) {
    try {
      window.toast?.success?.(msg);
    } catch {
      alert(msg);
    }
  }

  async function loadAll(id) {
    if (!id) return;
    setLoading(true);
    try {
      // pull payment+price summary from /meta (single source of truth set via AdminPrepPanel)
      const [metaRes, listRes] = await Promise.all([
        getJSON(`/api/prep/exams/${encodeURIComponent(id)}/meta?_=${Date.now()}`),
        getJSON(`/api/prep/access/admin/requests?examId=${encodeURIComponent(id)}&_=${Date.now()}`),
      ]);

      setMeta(metaRes || null);

      const list = Array.isArray(listRes?.items) ? listRes.items.slice() : [];
      // sort newest first
      list.sort((a, b) => (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
      setItems(list);
      setSel(new Set());
    } catch (e) {
      console.error(e);
      alert("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialExamId) {
      setExamId(initialExamId);
      setTypingExamId(initialExamId);
      loadAll(initialExamId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExamId]);

  // ------- actions -------
  async function doApprove(email, mode) {
    if (!examId || !email) return;
    try {
      const r = await postJSON("/api/prep/access/admin/approve", { examId, email, mode });
      if (!r?.success) throw new Error(r?.error || "Failed");
      toast(
        mode === "grant"
          ? `Granted: ${email}`
          : mode === "reject"
          ? `Rejected: ${email}`
          : `Revoked: ${email}`
      );
      await loadAll(examId);
    } catch (e) {
      console.error(e);
      alert("Action failed");
    }
  }

  async function deleteOne(id) {
    if (!id) return;
    if (!confirm("Delete this request?")) return;
    try {
      const r = await postJSON("/api/prep/access/admin/delete", { ids: [id] });
      if (!r?.success) throw new Error(r?.error || "Failed");
      toast("Request deleted");
      await loadAll(examId);
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    }
  }

  async function batchDelete() {
    if (!sel.size) return;
    if (!confirm(`Delete ${sel.size} selected request(s)?`)) return;
    try {
      const ids = Array.from(sel);
      const r = await postJSON("/api/prep/access/admin/delete", { ids });
      if (!r?.success) throw new Error(r?.error || "Failed");
      toast(`Deleted ${r.removed || 0} request(s)`);
      await loadAll(examId);
    } catch (e) {
      console.error(e);
      alert("Batch delete failed");
    }
  }

  function toggleSel(id) {
    setSel((prev) => {
      const ns = new Set(prev);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });
  }
  function selectAllCurrent() {
    setSel(new Set(filtered.map((r) => r.id)));
  }
  function clearSel() {
    setSel(new Set());
  }

  // ------- derived -------
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (items || []).filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (intentFilter !== "all" && String(r.intent || "purchase") !== intentFilter) return false;
      if (!term) return true;
      const hay = `${r.email} ${r.name || ""} ${r.phone || ""} ${r.intent || ""} ${r.note || ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [items, q, statusFilter, intentFilter]);

  // ------- render -------
  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header / exam picker */}
      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-1">Exam ID</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., UP_APO"
            value={typingExamId}
            onChange={(e) => setTypingExamId(e.target.value)}
          />
        </div>
        <button
          className="px-4 py-2 rounded bg-black text-white"
          onClick={() => {
            const id = typingExamId.trim();
            setExamId(id);
            loadAll(id);
          }}
        >
          Load
        </button>
        <button
          className="px-4 py-2 rounded border"
          onClick={() => examId && loadAll(examId)}
        >
          Refresh
        </button>
      </div>

      {/* Read-only payment summary from /meta */}
      {examId && (
        <div className="rounded-xl border p-4 mb-6 bg-white">
          <div className="text-lg font-semibold mb-3">Payment & Price (read-only)</div>
          <div className="text-sm grid md:grid-cols-2 gap-2">
            <Row label="Course" value={meta?.name || examId.toUpperCase()} />
            <Row
              label="Price (₹)"
              value={
                meta?.overlay?.payment?.priceINR ??
                meta?.payment?.priceINR ??
                meta?.price ??
                "—"
              }
            />
            <Row
              label="UPI ID"
              value={
                meta?.overlay?.payment?.upiId ||
                meta?.payment?.upiId ||
                "—"
              }
            />
            <Row
              label="UPI Name"
              value={
                meta?.overlay?.payment?.upiName ||
                meta?.payment?.upiName ||
                "—"
              }
            />
            <Row
              label="WhatsApp"
              value={
                meta?.overlay?.payment?.whatsappNumber ||
                meta?.payment?.whatsappNumber ||
                "—"
              }
            />
            <div className="md:col-span-2 text-gray-500">
              To edit payment or overlay schedule, use <b>AdminPrepPanel</b>. This panel is only for access requests & approvals.
            </div>
          </div>
        </div>
      )}

      {/* Requests toolbar */}
      <div className="rounded-xl border p-4 mb-2 bg-white">
        <div className="text-lg font-semibold mb-3">Access Requests</div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            className="border rounded px-3 py-2 flex-1 min-w-[220px]"
            placeholder="Search (email, name, phone, note)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            className="border rounded px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            className="border rounded px-3 py-2"
            value={intentFilter}
            onChange={(e) => setIntentFilter(e.target.value)}
          >
            <option value="all">All intents</option>
            <option value="purchase">Purchase</option>
            <option value="restart">Restart</option>
          </select>

          <div className="flex-1" />

          <button
            className="px-3 py-2 rounded border"
            onClick={selectAllCurrent}
            disabled={!filtered.length}
          >
            Select All (filtered)
          </button>
          <button
            className="px-3 py-2 rounded border"
            onClick={clearSel}
            disabled={!sel.size}
          >
            Clear Selection
          </button>
          <button
            className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-60"
            onClick={batchDelete}
            disabled={!sel.size}
          >
            Delete Selected ({sel.size})
          </button>
          <button
            className="px-3 py-2 rounded border"
            onClick={() => examId && loadAll(examId)}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-2 w-10">Sel</th>
              <th className="p-2">Email</th>
              <th className="p-2">Name</th>
              <th className="p-2">Phone</th>
              <th className="p-2">Intent</th>
              <th className="p-2">Status</th>
              <th className="p-2">Note</th>
              <th className="p-2">Created</th>
              <th className="p-2 w-[320px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={9}>
                  Loading…
                </td>
              </tr>
            ) : !filtered.length ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={9}>
                  No requests.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : "";
                const selected = sel.has(r.id);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 align-top">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSel(r.id)}
                      />
                    </td>
                    <td className="p-2 align-top font-mono break-all">{r.email}</td>
                    <td className="p-2 align-top">{r.name || "—"}</td>
                    <td className="p-2 align-top">{r.phone || "—"}</td>
                    <td className="p-2 align-top">{r.intent || "purchase"}</td>
                    <td className="p-2 align-top">
                      <span
                        className={
                          "px-1.5 py-0.5 rounded text-[11px] " +
                          (r.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : r.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700")
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-2 align-top max-w-[320px] break-words">
                      {r.note || "—"}
                    </td>
                    <td className="p-2 align-top whitespace-nowrap">
                      {created}
                    </td>
                    <td className="p-2 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-2 py-1 rounded bg-emerald-600 text-white"
                          onClick={() => doApprove(r.email, "grant")}
                          title="Grant access"
                        >
                          Grant
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-amber-600 text-white"
                          onClick={() => doApprove(r.email, "reject")}
                          title="Reject request"
                        >
                          Reject
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-gray-800 text-white"
                          onClick={() => doApprove(r.email, "revoke")}
                          title="Revoke existing access"
                        >
                          Revoke
                        </button>
                        <button
                          className="px-2 py-1 rounded border text-red-600"
                          onClick={() => deleteOne(r.id)}
                          title="Delete this request"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline gap-2">
      <div className="text-gray-500 w-40 shrink-0">{label}</div>
      <div className="font-mono break-all">{String(value ?? "—")}</div>
    </div>
  );
}
