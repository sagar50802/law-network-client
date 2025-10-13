// src/components/Prep/PrepAccessAdmin.jsx
import { useEffect, useState } from "react";

const OWNER = import.meta.env.VITE_OWNER_KEY || "";

async function adminGET(path){
  const r = await fetch(path, {
    headers: { "X-Owner-Key": OWNER },
    credentials: "include",
  });
  const j = await r.json();
  if (!r.ok || j?.success === false) throw new Error(j?.error || j?.message || `HTTP ${r.status}`);
  return j;
}
async function adminPOST(path, body){
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type":"application/json", "X-Owner-Key": OWNER },
    body: JSON.stringify(body||{}),
    credentials: "include",
  });
  const j = await r.json();
  if (!r.ok || j?.success === false) throw new Error(j?.error || j?.message || `HTTP ${r.status}`);
  return j;
}

export default function PrepAccessAdmin(){
  const [items, setItems] = useState([]);
  const [examId, setExamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(){
    setLoading(true); setError("");
    try{
      const qs = new URLSearchParams({ status:"pending" });
      if (examId) qs.set("examId", examId);
      const r = await adminGET(`/api/prep/access/requests?${qs.toString()}`);
      setItems(r?.items || []);
    }catch(e){ setError(e.message||"Failed"); }
    finally{ setLoading(false); }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [examId]);

  async function approve(id, grant=true){
    await adminPOST("/api/prep/access/admin/approve", { requestId:id, approve:grant });
    await load();
  }
  async function revokeRow(examId, email){
    await adminPOST("/api/prep/access/admin/revoke", { examId, email });
    await load();
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex gap-2 mb-3 items-center">
        <input className="border px-2 py-1 rounded w-64" placeholder="Filter by examId"
               value={examId} onChange={e=>setExamId(e.target.value)} />
        <button className="px-3 py-1 border rounded" onClick={load}>Refresh</button>
        {loading && <span className="text-xs text-gray-500">Loading…</span>}
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>

      {!items.length ? (
        <div className="text-sm text-gray-600">No pending requests.</div>
      ) : (
        <div className="grid gap-3">
          {items.map(x=>(
            <div key={x._id} className="border rounded p-3">
              <div className="text-sm font-medium">{x.intent?.toUpperCase()} • {x.examId}</div>
              <div className="text-xs text-gray-600 mb-2">{x.userEmail} • Price: ₹{x.priceAt ?? 0}</div>
              {x.screenshotUrl ? (
                <a href={x.screenshotUrl} target="_blank" rel="noreferrer" className="text-xs underline text-blue-600">
                  View Screenshot
                </a>
              ) : <div className="text-[11px] text-gray-500">No screenshot</div>}
              {x.note && <div className="text-[11px] text-gray-600 mt-1">Note: {x.note}</div>}
              <div className="mt-2 flex gap-2">
                <button className="px-3 py-1 rounded bg-emerald-600 text-white"
                        onClick={()=>approve(x._id, true)}>Approve & Grant</button>
                <button className="px-3 py-1 rounded bg-rose-600 text-white"
                        onClick={()=>approve(x._id, false)}>Reject</button>
                <button className="px-3 py-1 rounded border"
                        onClick={()=>revokeRow(x.examId, x.userEmail)}>Revoke Access</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
