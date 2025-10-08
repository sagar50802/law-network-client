import { useEffect, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

export default function PrepAccessAdmin(){
  const [items, setItems] = useState([]);
  const [examId, setExamId] = useState("");

  async function load(){
    const qs = new URLSearchParams({ status: "pending" });
    if (examId) qs.set("examId", examId);
    const r = await getJSON(`/api/prep/access/requests?${qs.toString()}`);
    setItems(r?.items || []);
  }
  useEffect(()=>{ load(); }, [examId]);

  async function approve(id, grant=true){
    await postJSON("/api/prep/access/admin/approve", { requestId: id, approve: grant });
    await load();
  }
  async function revoke(examId, email){
    await postJSON("/api/prep/access/admin/revoke", { examId, email });
    await load();
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex gap-2 mb-3">
        <input className="border px-2 py-1 rounded w-64" placeholder="Filter by examId" value={examId} onChange={e=>setExamId(e.target.value)} />
        <button className="px-3 py-1 border rounded" onClick={load}>Refresh</button>
      </div>

      {!items.length ? <div className="text-sm text-gray-600">No pending requests.</div> : (
        <div className="grid gap-3">
          {items.map(x=>(
            <div key={x._id} className="border rounded p-3">
              <div className="text-sm font-medium">{x.intent.toUpperCase()} • {x.examId}</div>
              <div className="text-xs text-gray-600 mb-2">{x.userEmail} • Price: ₹{x.priceAt ?? 0}</div>
              {x.screenshotUrl && (
                <a href={x.screenshotUrl} target="_blank" rel="noreferrer" className="text-xs underline text-blue-600">View Screenshot</a>
              )}
              <div className="mt-2 flex gap-2">
                <button className="px-3 py-1 rounded bg-emerald-600 text-white" onClick={()=>approve(x._id, true)}>Approve & Grant</button>
                <button className="px-3 py-1 rounded bg-rose-600 text-white" onClick={()=>approve(x._id, false)}>Reject</button>
                <button className="px-3 py-1 rounded border" onClick={()=>revoke(x.examId, x.userEmail)}>Revoke Access</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
