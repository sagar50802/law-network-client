// client/src/components/Prep/PrepAccessAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON, buildUrl } from "../../utils/api";

/**
 * PrepAccessAdmin (Enhanced + AutoApproval Toggle + Auth-safe actions)
 * --------------------------------------------------------------------
 * • Adds proper X-Owner-Key for admin requests
 * • Fixes silent fails for delete/approve/revoke
 * • Ensures AutoGrant toggle sync and refresh
 * • No layout/logic changes, just bug-level reliability fixes
 * • Normalizes examId: trims, lowercases, removes parentheses text
 */

async function postAdminJSON(url, body = {}) {
  const ownerKey = localStorage.getItem("ownerKey") || "";
  const res = await fetch(buildUrl(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ownerKey ? { "X-Owner-Key": ownerKey } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false)
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

export default function PrepAccessAdmin({ examId: initialExamId }) {
  const [examId, setExamId] = useState(initialExamId || "");
  const [typingExamId, setTypingExamId] = useState(initialExamId || "");
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null);
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(() => new Set());
  const [config, setConfig] = useState(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [intentFilter, setIntentFilter] = useState("all");

  function toast(msg) {
    try {
      window.toast?.success?.(msg);
    } catch {
      alert(msg);
    }
  }

  /* --------------------------------------------------
   * ✅ Load all admin data for selected exam
   * -------------------------------------------------- */
  async function loadAll(id) {
    if (!id) return;
    setLoading(true);
    try {
      const [metaRes, listRes, configRes] = await Promise.all([
        // ✅ Uses the public meta endpoint (consistent with backend)
        getJSON(
          `/api/prep/public/exams/${encodeURIComponent(id)}/meta?_=${Date.now()}`
        ),
        getJSON(
          `/api/admin/prep/access/requests?examId=${encodeURIComponent(id)}&_=${Date.now()}`
        ),
        getJSON(`/api/admin/prep/access/config?_=${Date.now()}`),
      ]);

      const overlayPay = metaRes?.exam?.overlay?.payment || {};
      const rootPay = metaRes?.exam?.payment || {};
      const payment = { ...rootPay, ...overlayPay };

      const cleanMeta = {
        ...(metaRes?.exam || metaRes || {}),
        payment,
        overlay: metaRes?.exam?.overlay || metaRes?.overlay || {},
        price:
          metaRes?.exam?.overlay?.payment?.priceINR ??
          metaRes?.exam?.payment?.priceINR ??
          metaRes?.exam?.price ??
          metaRes?.price ??
          0,
      };
      setMeta(cleanMeta);
      setConfig(configRes?.config || { autoGrant: false });

      const list = Array.isArray(listRes?.items) ? listRes.items.slice() : [];
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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

  /* --------------------------------------------------
   * Admin Actions
   * -------------------------------------------------- */
  async function doApprove(email, mode) {
    if (!examId || !email) return;
    try {
      const endpoint =
        mode === "grant"
          ? "/api/admin/prep/access/approve"
          : mode === "reject"
          ? "/api/admin/prep/access/reject"
          : mode === "revoke"
          ? "/api/admin/prep/access/revoke"
          : null;
      if (!endpoint) return;

      await postAdminJSON(endpoint, { examId, email });
      toast(
        mode === "grant"
          ? `✅ Granted access: ${email}`
          : mode === "reject"
          ? `❌ Rejected: ${email}`
          : `⛔ Revoked: ${email}`
      );
      await loadAll(examId);
    } catch (e) {
      console.error(e);
      alert("Action failed: " + (e.message || e));
    }
  }

  async function deleteOne(id) {
    if (!id) return;
    if (!confirm("Delete this request permanently?")) return;
    try {
      await postAdminJSON("/api/admin/prep/access/delete", { id });
      toast("Request deleted");
      await loadAll(examId);
    } catch (e) {
      console.error(e);
      alert("Delete failed: " + (e.message || e));
    }
  }

  async function batchDelete() {
    if (!sel.size) return;
    if (!confirm(`Delete ${sel.size} selected request(s)? This cannot be undone.`))
      return;
    try {
      const ids = Array.from(sel);
      const r = await postAdminJSON("/api/admin/prep/access/batch-delete", { ids });
      toast(`Deleted ${r.removed || ids.length} request(s)`);
      await loadAll(examId);
    } catch (e) {
      console.error(e);
      alert("Batch delete failed: " + (e.message || e));
    }
  }

  async function saveConfig() {
    try {
      const r = await postAdminJSON("/api/admin/prep/access/config", config);
      toast("Configuration saved");
      setConfig(r.config || config);
      await loadAll(examId);
    } catch (e) {
      console.error(e);
      alert("Failed to save config: " + (e.message || e));
    }
  }

  /* --------------------------------------------------
   * Selection Helpers
   * -------------------------------------------------- */
  function toggleSel(id) {
    setSel((prev) => {
      const ns = new Set(prev);
      ns.has(id) ? ns.delete(id) : ns.add(id);
      return ns;
    });
  }

  function selectAllCurrent() {
    setSel(new Set(filtered.map((r) => r.id)));
  }

  function clearSel() {
    setSel(new Set());
  }

  /* --------------------------------------------------
   * Filters
   * -------------------------------------------------- */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (items || []).filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (
        intentFilter !== "all" &&
        String(r.intent || "purchase") !== intentFilter
      )
        return false;
      if (!term) return true;
      const hay = `${r.email} ${r.name || ""} ${r.phone || ""} ${
        r.intent || ""
      } ${r.note || ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [items, q, statusFilter, intentFilter]);

  /* --------------------------------------------------
   * Render
   * -------------------------------------------------- */
  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-end gap-3 mb-4">
        <div className="flex-1 w-full">
          <label className="block text-sm text-gray-600 mb-1">Exam ID</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., UP_APO"
            value={typingExamId}
            onChange={(e) => setTypingExamId(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded bg-black text-white"
            onClick={() => {
              // ✅ normalize examId: trim, lowercase, remove parentheses content
              const id = typingExamId
                .trim()
                .toLowerCase()
                .replace(/\s*\(.*\)\s*/g, "");
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
      </div>

      {/* Payment Summary */}
      {examId && (
        <div className="rounded-xl border p-4 mb-6 bg-white">
          <div className="text-lg font-semibold mb-3">
            Payment & Overlay Summary
          </div>
          <div className="text-sm grid sm:grid-cols-2 gap-2">
            <Row label="Course" value={meta?.name || examId.toUpperCase()} />
            <Row label="Price (₹)" value={meta?.price || "—"} />
            <Row label="Trial Days" value={meta?.trialDays ?? 0} />
            <Row
              label="Overlay Mode"
              value={meta?.overlay?.mode || "planDayTime"}
            />
            <Row label="UPI ID" value={meta?.payment?.upiId || "—"} />
            <Row label="UPI Name" value={meta?.payment?.upiName || "—"} />
            <Row
              label="WhatsApp"
              value={meta?.payment?.whatsappNumber || "—"}
            />
          </div>
          <div className="text-gray-500 text-xs mt-2">
            Use <b>AdminPrepPanel</b> to modify overlay or payment details.
          </div>
        </div>
      )}

      {/* Config Section */}
      {config && (
        <div className="rounded-xl border p-4 mb-6 bg-white">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={!!config.autoGrant}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, autoGrant: e.target.checked }))
                }
              />
              Enable Auto Approval Mode
            </label>
            <button
              className="px-3 py-2 rounded bg-emerald-600 text-white"
              onClick={saveConfig}
            >
              Save Config
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            When Auto Approval is enabled, new requests unlock automatically
            within 15 seconds.
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="rounded-xl border p-4 mb-2 bg-white">
        <div className="text-lg font-semibold mb-3">Access Requests</div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="border rounded px-3 py-2 flex-1 min-w-[220px]"
            placeholder="Search (email, name, phone, note)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
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
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
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
            Clear
          </button>
          <button
            className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-60"
            onClick={batchDelete}
            disabled={!sel.size}
          >
            Delete ({sel.size})
          </button>
        </div>
      </div>

      {/* Table / Cards */}
      <div className="rounded-xl border bg-white overflow-hidden">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading…</div>
        ) : !filtered.length ? (
          <div className="p-4 text-center text-gray-500">No requests.</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
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
                    <th className="p-2 whitespace-nowrap">Created</th>
                    <th className="p-2 w-[320px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <RowDesktop
                      key={r.id}
                      r={r}
                      sel={sel}
                      toggleSel={toggleSel}
                      doApprove={doApprove}
                      deleteOne={deleteOne}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y">
              {filtered.map((r) => (
                <CardMobile
                  key={r.id}
                  r={r}
                  selected={sel.has(r.id)}
                  toggleSel={toggleSel}
                  doApprove={doApprove}
                  deleteOne={deleteOne}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------
 * Subcomponents
 * -------------------------------------------------- */
function Row({ label, value }) {
  return (
    <div className="flex items-baseline gap-2">
      <div className="text-gray-500 w-40 shrink-0">{label}</div>
      <div className="font-mono break-all">{String(value ?? "—")}</div>
    </div>
  );
}

function RowDesktop({ r, sel, toggleSel, doApprove, deleteOne }) {
  const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : "—";
  const selected = sel.has(r.id);
  return (
    <tr className="border-t">
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
        <StatusBadge status={r.status} />
      </td>
      <td className="p-2 align-top max-w-[320px] break-words">
        {r.note || "—"}
      </td>
      <td className="p-2 align-top whitespace-nowrap">{created}</td>
      <td className="p-2 align-top">
        <Actions r={r} doApprove={doApprove} deleteOne={deleteOne} />
      </td>
    </tr>
  );
}

function CardMobile({ r, selected, toggleSel, doApprove, deleteOne }) {
  const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : "—";
  return (
    <div className="p-3">
      <div className="flex justify-between mb-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => toggleSel(r.id)}
          />
          {r.email}
        </label>
        <StatusBadge status={r.status} />
      </div>
      <div className="text-sm text-gray-700 space-y-1">
        <div>
          <b>Name:</b> {r.name || "—"}
        </div>
        <div>
          <b>Phone:</b> {r.phone || "—"}
        </div>
        <div>
          <b>Intent:</b> {r.intent || "purchase"}
        </div>
        {r.note && (
          <div>
            <b>Note:</b> {r.note}
          </div>
        )}
        <div className="text-xs text-gray-500">{created}</div>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        <Actions r={r} doApprove={doApprove} deleteOne={deleteOne} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cls =
    status === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : status === "pending"
      ? "bg-amber-100 text-amber-700"
      : "bg-rose-100 text-rose-700";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[11px] ${cls}`}>
      {status || "unknown"}
    </span>
  );
}

function Actions({ r, doApprove, deleteOne }) {
  return (
    <>
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
        className="px-2 py-1 rounded border text-red-600"
        onClick={() => deleteOne(r.id)}
      >
        Delete
      </button>
    </>
  );
}
