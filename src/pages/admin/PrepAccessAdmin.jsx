// client/src/components/Prep/PrepAccessAdmin.jsx
import { useEffect, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

export default function PrepAccessAdmin({ examId }) {
  const [cfg, setCfg] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());

  async function load() {
    setLoading(true);
    try {
      const c = await getJSON(`/api/prep/access/admin/config?examId=${encodeURIComponent(examId)}`);
      setCfg(c?.config || null);
      const r = await getJSON(`/api/prep/access/admin/requests?examId=${encodeURIComponent(examId)}`);
      setList(Array.isArray(r?.items) ? r.items : []);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (examId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  async function saveConfig() {
    const r = await postJSON("/api/prep/access/admin/config", { examId, ...cfg });
    if (!r?.success) alert("Save failed");
    load();
  }

  async function act(email, mode) {
    const r = await postJSON("/api/prep/access/admin/approve", { examId, email, mode });
    if (!r?.success) alert("Action failed");
    load();
  }

  async function removeSingle(id) {
    const r = await postJSON("/api/prep/access/admin/delete", { ids: [id] });
    if (!r?.success) alert("Delete failed");
    load();
  }

  async function removeBatch() {
    if (!selected.size) return;
    const ids = Array.from(selected);
    const r = await postJSON("/api/prep/access/admin/delete", { ids });
    if (!r?.success) alert("Batch delete failed");
    load();
  }

  function toggle(id) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  }

  const allChecked = list.length > 0 && selected.size === list.length;
  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(list.map((r) => r.id)));
  }

  if (!examId) return <div className="text-sm text-gray-500">Pick an examId.</div>;
  if (!cfg) return <div className="text-sm text-gray-500">Loading config…</div>;

  return (
    <div className="grid gap-6">
      {/* Config */}
      <div className="p-4 border rounded-lg">
        <div className="text-lg font-semibold mb-2">Config — {examId}</div>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">
            <span>Course name</span>
            <input className="border rounded px-2 py-1"
              value={cfg.name || ""}
              onChange={e => setCfg({ ...cfg, name: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Plan days</span>
            <input className="border rounded px-2 py-1" type="number"
              value={cfg.planDays || 21}
              onChange={e => setCfg({ ...cfg, planDays: Number(e.target.value||0) })} />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Auto grant</span>
            <select className="border rounded px-2 py-1"
              value={cfg.autoGrant ? "1" : "0"}
              onChange={e => setCfg({ ...cfg, autoGrant: e.target.value === "1" })}>
              <option value="0">Off (manual)</option>
              <option value="1">On (auto-approve new requests)</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span>Price (₹)</span>
            <input className="border rounded px-2 py-1" type="number"
              value={cfg.payment?.priceINR || 0}
              onChange={e => setCfg({ ...cfg, payment: { ...cfg.payment, priceINR: Number(e.target.value||0) } })} />
          </label>
          <label className="grid gap-1 text-sm">
            <span>UPI ID</span>
            <input className="border rounded px-2 py-1"
              value={cfg.payment?.upiId || ""}
              onChange={e => setCfg({ ...cfg, payment: { ...cfg.payment, upiId: e.target.value } })} />
          </label>
          <label className="grid gap-1 text-sm">
            <span>UPI Name</span>
            <input className="border rounded px-2 py-1"
              value={cfg.payment?.upiName || ""}
              onChange={e => setCfg({ ...cfg, payment: { ...cfg.payment, upiName: e.target.value } })} />
          </label>
          <label className="grid gap-1 text-sm">
            <span>WhatsApp Number (+91… or 91…)</span>
            <input className="border rounded px-2 py-1"
              value={cfg.payment?.whatsappNumber || ""}
              onChange={e => setCfg({ ...cfg, payment: { ...cfg.payment, whatsappNumber: e.target.value } })} />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span>WhatsApp Prefill Text</span>
            <textarea className="border rounded px-2 py-1"
              value={cfg.payment?.whatsappText || ""}
              onChange={e => setCfg({ ...cfg, payment: { ...cfg.payment, whatsappText: e.target.value } })} />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={saveConfig}>
            Save Config
          </button>
          <button className="px-4 py-2 rounded bg-gray-600 text-white" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {/* Requests */}
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold">Requests {loading ? "(loading…)" : ""}</div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded bg-rose-600 text-white disabled:opacity-50"
              onClick={removeBatch}
              disabled={!selected.size}
              title="Delete selected requests"
            >
              Delete Selected ({selected.size})
            </button>
          </div>
        </div>

        {!list.length ? (
          <div className="text-sm text-gray-500">No requests yet.</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[880px] text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                  </th>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Intent</th>
                  <th className="py-2 pr-3">Note</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const checked = selected.has(r.id);
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <input type="checkbox" checked={checked} onChange={() => toggle(r.id)} />
                      </td>
                      <td className="py-2 pr-3">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-3">{r.email}</td>
                      <td className="py-2 pr-3">{r.name}</td>
                      <td className="py-2 pr-3">{r.phone}</td>
                      <td className="py-2 pr-3">{r.intent}</td>
                      <td className="py-2 pr-3">{r.note}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            r.status === "approved"
                              ? "text-emerald-700"
                              : r.status === "rejected"
                              ? "text-rose-700"
                              : "text-gray-700"
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-2">
                          <button
                            className="px-2 py-1 rounded bg-emerald-600 text-white"
                            onClick={() => act(r.email, "grant")}
                          >
                            Approve
                          </button>
                          <button
                            className="px-2 py-1 rounded bg-rose-600 text-white"
                            onClick={() => act(r.email, "reject")}
                          >
                            Reject
                          </button>
                          <button
                            className="px-2 py-1 rounded bg-gray-600 text-white"
                            onClick={() => act(r.email, "revoke")}
                          >
                            Revoke
                          </button>
                          <button
                            className="px-2 py-1 rounded bg-red-700 text-white"
                            onClick={() => removeSingle(r.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
