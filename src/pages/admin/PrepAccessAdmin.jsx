// client/src/components/Prep/PrepAccessAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

/**
 * PrepAccessAdmin (Requests-only)
 * - NO payment editing here (UPI / WhatsApp / price live in AdminPrepPanel.jsx)
 * - Load requests for an exam
 * - Approve / Reject / Revoke
 * - Delete single / Batch delete
 * - Read-only summary shows current payment config pulled from /api/prep/exams/:examId/meta
 *
 * Props:
 *   examId?: string (optional; if omitted, admin can type one and Load)
 */
export default function PrepAccessAdmin({ examId: initialExamId }) {
  const [examId, setExamId] = useState(initialExamId || "");
  const [typingExamId, setTypingExamId] = useState(initialExamId || "");
  const [loading, setLoading] = useState(false);

  // Requests list
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(() => new Set()); // selected ids for batch delete

  // Quick readonly meta pulled from AdminPrepPanel's source of truth
  const [meta, setMeta] = useState({
    name: "",
    payment: { upiId: "", upiName: "", priceINR: "", whatsappNumber: "", whatsappText: "" },
  });

  // UI filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all|pending|approved|rejected
  const [intentFilter, setIntentFilter] = useState("all"); // all|purchase|restart

  // derived: filtered + searched
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

  async function loadRequestsAndMeta(id) {
    if (!id) return;
    setLoading(true);
    try {
      const [listRes, metaRes] = await Promise.all([
        getJSON(`/api/prep/access/admin/requests?examId=${encodeURIComponent(id)}`),
        getJSON(`/api/prep/exams/${encodeURIComponent(id)}/meta?_=${Date.now()}`),
      ]);

      if (listRes?.success && Array.isArray(listRes?.items)) {
        setItems(listRes.items);
        setSel(new Set());
      } else {
        setItems([]);
        setSel(new Set());
      }

      const name = metaRes?.name || id.toUpperCase();
      const pay = {
        ...(metaRes?.payment || {}),
        ...(metaRes?.overlay?.payment || {}),
      };
      setMeta({
        name,
        payment: {
          upiId: pay.upiId || "",
          upiName: pay.upiName || "",
          priceINR: pay.priceINR ?? (metaRes?.price ?? ""),
          whatsappNumber: pay.whatsappNumber || "",
          whatsappText: pay.whatsappText || "",
        },
      });
    } catch (e) {
      console.error(e);
      alert("Failed to load requests/meta");
    } finally {
      setLoading(false);
    }
  }

  // initial
  useEffect(() => {
    if (initialExamId) {
      setExamId(initialExamId);
      setTypingExamId(initialExamId);
      loadRequestsAndMeta(initialExamId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExamId]);

  function toast(msg) {
    try {
      window.toast?.success?.(msg);
    } catch {
      alert(msg);
    }
  }

  async function doApprove(email, mode) {
    if (!examId) return;
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
      await loadRequestsAndMeta(examId);
    } catch (e) {
      console.error(e);
      alert("Action failed");
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

  async function deleteOne(id) {
    if (!id) return;
    if (!confirm("Delete this request?")) return;
    try {
      const r = await postJSON("/api/prep/access/admin/delete", { ids: [id] });
      if (!r?.success) throw new Error(r?.error || "Failed");
      toast("Deleted 1 request");
      await loadRequestsAndMeta(examId);
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
      await loadRequestsAndMeta(examId);
    } catch (e) {
      console.error(e);
      alert("Batch delete failed");
    }
  }

  const pay = meta.payment || {};
  const priceLabel =
    pay?.priceINR != null && pay?.priceINR !== ""
      ? `₹${Number(pay.priceINR) || pay.priceINR}`
      : "—";

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
            loadRequestsAndMeta(id);
          }}
        >
          Load
        </button>
        <button
          className="px-4 py-2 rounded border"
          onClick={() => {
            if (!examId) return;
            loadRequestsAndMeta(examId);
          }}
        >
          Refresh
        </button>
      </div>

      {/* Read-only payment summary (from AdminPrepPanel config) */}
      {examId && (
        <div className="rounded-xl border p-4 mb-6 bg-white">
          <div className="text-lg font-semibold mb-2">Current Payment (read-only)</div>
          <div className="grid md:grid-cols-4 gap-3 text-sm">
            <Info label="Course" value={meta.name || examId} mono={false} />
            <Info label="Price" value={priceLabel} />
            <Info label="UPI ID" value={pay.upiId || "—"} />
            <Info label="UPI Name" value={pay.upiName || "—"} />
            <Info label="WhatsApp" value={pay.whatsappNumber || "—"} />
            <div className="md:col-span-3">
              <Info
                label="WhatsApp Prefill"
                value={(pay.whatsappText || "—").toString()}
                wrap
              />
            </div>
          </div>
          <div className="text-[12px] text-gray-500 mt-2">
            Edit these in <b>AdminPrepPanel</b>. This panel is only for access requests & approvals.
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
            onClick={() => examId && loadRequestsAndMeta(examId)}
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
              <th className="p-2 w-72">Actions</th>
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
                    <td className="p-2 align-top font-mono">{r.email}</td>
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
                    <td className="p-2 align-top max-w-[300px] break-words">
                      {r.note || "—"}
                    </td>
                    <td className="p-2 align-top whitespace-nowrap">{created}</td>
                    <td className="p-2 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-2 py-1 rounded bg-emerald-600 text-white"
                          onClick={() => doApprove(r.email, "grant")}
                        >
                          Grant
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-amber-600 text-white"
                          onClick={() => doApprove(r.email, "reject")}
                        >
                          Reject
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-gray-800 text-white"
                          onClick={() => doApprove(r.email, "revoke")}
                        >
                          Revoke
                        </button>
                        <button
                          className="px-2 py-1 rounded border border-red-300 text-red-700"
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

function Info({ label, value, mono = true, wrap = false }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div
        className={
          (mono ? "font-mono " : "") +
          "text-sm " +
          (wrap ? "break-words" : "truncate")
        }
        title={String(value || "")}
      >
        {value || "—"}
      </div>
    </div>
  );
}
