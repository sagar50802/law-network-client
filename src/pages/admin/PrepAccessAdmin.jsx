// client/src/components/Prep/PrepAccessAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

/**
 * Admin panel for Prep Access:
 * - Edit exam config (name, planDays, autoGrant, payment fields)
 * - View & search requests
 * - Approve / Reject / Revoke
 * - Batch delete
 *
 * Requires server routes from: server/prep_access.js
 *
 * Props:
 *   examId?: string (optional; if omitted, admin can type one)
 */
export default function PrepAccessAdmin({ examId: initialExamId }) {
  const [examId, setExamId] = useState(initialExamId || "");
  const [typingExamId, setTypingExamId] = useState(initialExamId || "");
  const [loading, setLoading] = useState(false);

  // Config state
  const [config, setConfig] = useState({
    name: "",
    planDays: 21,
    autoGrant: false,
    payment: {
      upiId: "",
      upiName: "",
      priceINR: "",
      whatsappNumber: "",
      whatsappText: "",
    },
  });
  const [cfgSaving, setCfgSaving] = useState(false);

  // Requests list
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(() => new Set()); // selected ids for batch delete

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

  async function loadAll(id) {
    if (!id) return;
    setLoading(true);
    try {
      const [cfgRes, listRes] = await Promise.all([
        getJSON(`/api/prep/access/admin/config?examId=${encodeURIComponent(id)}`),
        getJSON(`/api/prep/access/admin/requests?examId=${encodeURIComponent(id)}`),
      ]);

      if (cfgRes?.success && cfgRes?.config) {
        setConfig({
          name: cfgRes.config.name || id.toUpperCase(),
          planDays: Number(cfgRes.config.planDays || 21),
          autoGrant: !!cfgRes.config.autoGrant,
          payment: {
            upiId: cfgRes.config.payment?.upiId || "",
            upiName: cfgRes.config.payment?.upiName || "",
            priceINR: cfgRes.config.payment?.priceINR ?? "",
            whatsappNumber: cfgRes.config.payment?.whatsappNumber || "",
            whatsappText: cfgRes.config.payment?.whatsappText || "",
          },
        });
      }

      if (listRes?.success && Array.isArray(listRes?.items)) {
        setItems(listRes.items);
        setSel(new Set());
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  // initial
  useEffect(() => {
    if (initialExamId) {
      setExamId(initialExamId);
      setTypingExamId(initialExamId);
      loadAll(initialExamId);
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

  async function saveConfig() {
    if (!examId) {
      alert("Please set examId first.");
      return;
    }
    setCfgSaving(true);
    try {
      const body = {
        examId,
        name: config.name,
        planDays: Number(config.planDays || 21),
        autoGrant: !!config.autoGrant,
        payment: { ...config.payment },
      };
      const r = await postJSON("/api/prep/access/admin/config", body);
      if (!r?.success) throw new Error(r?.error || "Failed to save config");
      toast("Config saved");
      await loadAll(examId);
    } catch (e) {
      console.error(e);
      alert("Save failed");
    } finally {
      setCfgSaving(false);
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
      await loadAll(examId);
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
            setExamId(typingExamId.trim());
            loadAll(typingExamId.trim());
          }}
        >
          Load
        </button>
        <button
          className="px-4 py-2 rounded border"
          onClick={() => {
            if (!examId) return;
            loadAll(examId);
          }}
        >
          Refresh
        </button>
      </div>

      {/* Config editor */}
      <div className="rounded-xl border p-4 mb-6 bg-white">
        <div className="text-lg font-semibold mb-3">Exam Config</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Course Name</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={config.name}
              onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Plan Days</label>
            <input
              type="number"
              min={1}
              className="w-full border rounded px-3 py-2"
              value={config.planDays}
              onChange={(e) =>
                setConfig((c) => ({ ...c, planDays: Number(e.target.value || 1) }))
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="autogrant"
              type="checkbox"
              checked={!!config.autoGrant}
              onChange={(e) => setConfig((c) => ({ ...c, autoGrant: e.target.checked }))}
            />
            <label htmlFor="autogrant" className="text-sm">
              Auto-grant on submit
            </label>
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">UPI ID</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="merchant@upi"
              value={config.payment.upiId}
              onChange={(e) =>
                setConfig((c) => ({ ...c, payment: { ...c.payment, upiId: e.target.value } }))
              }
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">UPI Name</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={config.payment.upiName}
              onChange={(e) =>
                setConfig((c) => ({ ...c, payment: { ...c.payment, upiName: e.target.value } }))
              }
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Price (₹)</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-3 py-2"
              value={config.payment.priceINR}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  payment: { ...c.payment, priceINR: e.target.value },
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">WhatsApp Number</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., 919876543210"
              value={config.payment.whatsappNumber}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  payment: { ...c.payment, whatsappNumber: e.target.value },
                }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">WhatsApp Prefill Text</label>
            <textarea
              rows={3}
              className="w-full border rounded px-3 py-2"
              value={config.payment.whatsappText}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  payment: { ...c.payment, whatsappText: e.target.value },
                }))
              }
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
            onClick={saveConfig}
            disabled={cfgSaving || !examId}
          >
            {cfgSaving ? "Saving…" : "Save Config"}
          </button>
          <span className="text-xs text-gray-500">
            Editing config for <b>{examId || "(no exam selected)"}</b>
          </span>
        </div>
      </div>

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
              <th className="p-2 w-64">Actions</th>
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
                const created = r.createdAt
                  ? new Date(r.createdAt).toLocaleString()
                  : "";
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
                    <td className="p-2 align-top whitespace-nowrap">
                      {created}
                    </td>
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
