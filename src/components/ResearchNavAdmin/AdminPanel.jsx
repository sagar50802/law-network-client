// File: src/components/ResearchNavAdmin/AdminPanel.jsx
// Standalone admin UI for Research Navigation (safe/isolated)
// • Inbox (paginated)
// • Detail drawer
// • Mirrored MilestoneBar
// • Stage gate updater per milestone
// • Payment verify action
//
// Requirements: React, Tailwind. (Framer Motion optional.)
// API prefix: /api/research (from Step-2)

import React, { useEffect, useMemo, useState } from "react";

/* ----------------------------- Tiny API helper ----------------------------- */
const API = {
  async inbox({ page = 1, limit = 20, q = "" } = {}, ownerKey = "") {
    const u = new URL("/api/research/inbox", window.location.origin);
    u.searchParams.set("page", page);
    u.searchParams.set("limit", limit);
    if (q) u.searchParams.set("q", q);
    const res = await fetch(u.toString(), { headers: { "x-owner-key": ownerKey } });
    if (!res.ok) throw new Error("Failed to load inbox");
    return res.json();
  },
  async getProposal(id, ownerKey = "") {
    const res = await fetch(`/api/research/proposals/${id}`, { headers: { "x-owner-key": ownerKey } });
    if (!res.ok) throw new Error("Failed to load proposal");
    return res.json();
  },
  async getSection(id, milestone, ownerKey = "") {
    const res = await fetch(`/api/research/proposals/${id}/section/${milestone}`, { headers: { "x-owner-key": ownerKey } });
    if (!res.ok) throw new Error("Failed to load section");
    return res.json();
  },
  async updateStage(id, milestone, status, ownerKey = "") {
    const res = await fetch(`/api/research/proposals/${id}/stage/${milestone}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-owner-key": ownerKey },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update stage");
    return res.json();
  },
  async verifyPayment(id, verified, ownerKey = "") {
    const res = await fetch(`/api/research/proposals/${id}/pay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-owner-key": ownerKey },
      body: JSON.stringify({ verified }),
    });
    if (!res.ok) throw new Error("Failed to verify payment");
    return res.json();
  },
};

/* ------------------------------- Config ----------------------------------- */
const ORDER = [
  { id: "topic", label: "Topic", icon: "📘" },
  { id: "literature", label: "Literature", icon: "📄" },
  { id: "method", label: "Method", icon: "🧪" },
  { id: "timeline", label: "Timeline", icon: "⏳" },
  { id: "payment", label: "Payment", icon: "💰" },
  { id: "done", label: "Done", icon: "🎓" },
];

/* --------------------------- Shared MilestoneBar --------------------------- */
function MilestoneBar({ steps = [], compact = false }) {
  const map = new Map(steps.map((s) => [s.id, s]));
  return (
    <div className={`flex items-center gap-3 ${compact ? "scale-95" : ""}`}>
      {ORDER.map((s, i) => {
        const st = map.get(s.id) || { status: "locked" };
        const cls = st.status === "completed"
          ? "bg-emerald-500 text-white shadow"
          : st.status === "in_progress"
          ? "ring-2 ring-amber-400 bg-white"
          : st.status === "needs_edit"
          ? "bg-orange-100 text-orange-700"
          : "bg-gray-200 text-gray-500 opacity-70";
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-full grid place-items-center text-sm ${cls}`} title={`${s.label} — ${st.status}`}>
              {s.icon}
            </div>
            {i < ORDER.length - 1 && (
              <div className={`h-1 w-10 rounded-full ${st.status === "completed" ? "bg-emerald-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------- Inbox: List View ----------------------------- */
function InboxTable({ items = [], onOpen }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="py-3 pr-3">User</th>
            <th className="py-3 pr-3">Title</th>
            <th className="py-3 pr-3">Progress</th>
            <th className="py-3 pr-3">Milestones</th>
            <th className="py-3 pr-3">Payment</th>
            <th className="py-3 pr-3">Updated</th>
            <th className="py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it._id} className="border-b hover:bg-gray-50">
              <td className="py-3 pr-3 font-medium">{it.userEmail || "—"}</td>
              <td className="py-3 pr-3">{it.title || <em className="text-gray-400">Untitled</em>}</td>
              <td className="py-3 pr-3">
                <div className="w-40 bg-gray-200 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${it.percent || 0}%` }} />
                </div>
                <div className="text-xs text-gray-500 mt-1">{it.percent || 0}%</div>
              </td>
              <td className="py-3 pr-3">
                <MilestoneBar steps={it.steps} compact />
              </td>
              <td className="py-3 pr-3">
                <span className={`px-2 py-1 rounded text-xs ${it.payment?.status === "verified" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : it.payment?.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-gray-50 text-gray-600 border"}`}>{it.payment?.status || "none"}</span>
              </td>
              <td className="py-3 pr-3 text-gray-500">{new Date(it.lastUpdatedAt).toLocaleString()}</td>
              <td className="py-3">
                <button onClick={() => onOpen(it._id)} className="px-3 py-1.5 rounded-lg border hover:bg-white">Open</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------- Detail: Right Drawer -------------------------- */
function DetailDrawer({ open, onClose, proposal, onUpdateStage, onVerifyPayment }) {
  if (!open || !proposal) return null;
  const { _id, userEmail, title, steps = [], fields = {}, payment = {}, status, updatedAt, createdAt } = proposal;
  const map = new Map(steps.map((s) => [s.id, s]));

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <aside className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-gray-500">{userEmail}</div>
            <h3 className="text-lg font-bold">{title || "Untitled Proposal"}</h3>
            <div className="mt-1"><MilestoneBar steps={steps} /></div>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border">Close</button>
        </div>

        {/* Stage controls */}
        <section className="space-y-4">
          {ORDER.map((s) => {
            const st = map.get(s.id) || { status: "locked" };
            return (
              <div key={s.id} className="p-4 rounded-xl border bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{s.icon} {s.label}</div>
                  <div className="flex items-center gap-2">
                    <select
                      className="px-2 py-1 rounded-lg border bg-white text-sm"
                      value={st.status}
                      onChange={(e) => onUpdateStage(_id, s.id, e.target.value)}
                    >
                      <option value="locked">locked</option>
                      <option value="in_progress">in_progress</option>
                      <option value="completed">completed</option>
                      <option value="needs_edit">needs_edit</option>
                    </select>
                    {st.completedAt && <span className="text-xs text-gray-500">{new Date(st.completedAt).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="mt-3 text-sm">
                  {/* Lazy section preview */}
                  {s.id === "topic" && (
                    <div><span className="text-gray-500">Title:</span> <span className="font-medium">{fields?.title || proposal.title || "—"}</span></div>
                  )}
                  {s.id === "literature" && (
                    <div>
                      <div className="text-gray-500">Literature</div>
                      <div className="font-mono whitespace-pre-wrap bg-white p-2 rounded border">{fields?.lit || "—"}</div>
                    </div>
                  )}
                  {s.id === "method" && (
                    <div><span className="text-gray-500">Method:</span> <span className="font-medium">{fields?.method || "—"}</span></div>
                  )}
                  {s.id === "timeline" && (
                    <div><span className="text-gray-500">Timeline:</span> <span className="font-medium">{(fields?.start||"—")} → {(fields?.end||"—")}</span></div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Payment box */}
        <section className="mt-6 p-4 rounded-xl border bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Payment</div>
              <div className="font-medium">{payment?.status || "none"} {payment?.amount ? `• ₹${payment.amount}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onVerifyPayment(_id, true)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white">Mark Verified</button>
              <button onClick={() => onVerifyPayment(_id, false)} className="px-3 py-1.5 rounded-lg border">Unverify</button>
            </div>
          </div>
        </section>

        {/* Meta */}
        <div className="mt-4 text-xs text-gray-500">Created: {createdAt ? new Date(createdAt).toLocaleString() : "—"} • Updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "—"}</div>
      </aside>
    </div>
  );
}

/* --------------------------------- Main ----------------------------------- */
export default function ResearchAdminPanel() {
  const [ownerKey, setOwnerKey] = useState("");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openId, setOpenId] = useState(null);
  const [proposal, setProposal] = useState(null);

  const limit = 20;
  const pages = Math.max(1, Math.ceil(total / limit));

  async function loadInbox(p = page) {
    setLoading(true); setError("");
    try {
      const r = await API.inbox({ page: p, limit, q }, ownerKey);
      setItems(r.items || []);
      setTotal(r.total || 0);
    } catch (e) {
      setError(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(id) {
    setOpenId(id);
    try {
      const r = await API.getProposal(id, ownerKey);
      setProposal(r.doc || null);
    } catch {
      setProposal(null);
    }
  }

  async function onUpdateStage(id, milestone, status) {
    try {
      await API.updateStage(id, milestone, status, ownerKey);
      // refresh both detail + inbox row states
      await openDetail(id);
      await loadInbox();
    } catch (e) { alert(e.message || "Failed to update"); }
  }

  async function onVerifyPayment(id, verified) {
    try {
      await API.verifyPayment(id, verified, ownerKey);
      await openDetail(id);
      await loadInbox();
    } catch (e) { alert(e.message || "Failed to verify payment"); }
  }

  useEffect(() => { loadInbox(1); }, []); // initial

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto p-4 flex items-center justify-between gap-4">
          <div className="text-lg font-bold">Research Admin Panel</div>
          <div className="flex items-center gap-2">
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search title…" className="px-3 py-2 rounded-lg border" />
            <button onClick={()=>loadInbox(1)} className="px-3 py-2 rounded-lg bg-indigo-600 text-white">Search</button>
            <input value={ownerKey} onChange={(e)=>setOwnerKey(e.target.value)} placeholder="Owner Key" className="px-3 py-2 rounded-lg border w-40" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur border shadow-sm">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading…</div>
          ) : error ? (
            <div className="py-8 text-center text-red-600">{error}</div>
          ) : (
            <>
              <InboxTable items={items} onOpen={openDetail} />
              <div className="flex items-center justify-between mt-4 text-sm">
                <div className="text-gray-500">Total: {total}</div>
                <div className="flex items-center gap-2">
                  <button disabled={page<=1} onClick={()=>{setPage(p=>Math.max(1,p-1)); loadInbox(Math.max(1,page-1));}} className="px-3 py-1.5 rounded-lg border disabled:opacity-50">Prev</button>
                  <div>Page {page} / {pages}</div>
                  <button disabled={page>=pages} onClick={()=>{setPage(p=>Math.min(pages,p+1)); loadInbox(Math.min(pages,page+1));}} className="px-3 py-1.5 rounded-lg border disabled:opacity-50">Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <DetailDrawer
        open={!!openId}
        onClose={()=>{ setOpenId(null); setProposal(null); }}
        proposal={proposal}
        onUpdateStage={onUpdateStage}
        onVerifyPayment={onVerifyPayment}
      />
    </div>
  );
}

// Mount this at a new route, e.g.:
// import ResearchAdminPanel from "./components/ResearchNavAdmin/AdminPanel";
// <Route path="/admin/research" element={<ResearchAdminPanel />} />
//
// This file is SELF-CONTAINED and only touches /api/research endpoints created in Step-2.
// It will not interfere with any existing modules or routes.
