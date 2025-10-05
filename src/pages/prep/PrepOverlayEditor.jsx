import { useEffect, useState } from "react";
import { getJSON, upload } from "../../utils/api";

export default function PrepOverlayEditor() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [form, setForm] = useState({
    upiId:"", upiName:"", priceINR:0, whatsappId:""
  });
  const [banner, setBanner] = useState(null);
  const [waQR, setWaQR] = useState(null);

  async function loadExams() {
    const r = await getJSON("/api/prep/exams");
    setExams(r.exams||[]);
    if (!examId && r.exams?.[0]) setExamId(r.exams[0].examId);
  }
  async function loadCfg() {
    if (!examId) return;
    const r = await getJSON(`/api/prep/overlay/${examId}`);
    const c = r.config || {};
    setForm({
      upiId: c.upiId || "",
      upiName: c.upiName || "",
      priceINR: c.priceINR || 0,
      whatsappId: (c.whatsappLink || "").replace(/^https?:\/\/wa\.me\//,"") || "",
    });
  }

  useEffect(()=>{ loadExams(); }, []);
  useEffect(()=>{ loadCfg(); }, [examId]);

  async function save(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("upiId", form.upiId);
    fd.append("upiName", form.upiName);
    fd.append("priceINR", String(form.priceINR||0));
    fd.append("whatsappId", form.whatsappId);
    if (banner) fd.append("banner", banner);
    if (waQR)   fd.append("whatsappQR", waQR);
    await upload(`/api/prep/overlay/${examId}`, fd);
    alert("Saved.");
    setBanner(null); setWaQR(null);
    await loadCfg();
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-xl font-bold">Prep Overlay Editor</h1>
        <select className="border rounded px-2 py-1 ml-auto" value={examId} onChange={e=>setExamId(e.target.value)}>
          {exams.map(e => <option key={e.examId} value={e.examId}>{e.name}</option>)}
        </select>
      </div>

      <form onSubmit={save} className="grid sm:grid-cols-2 gap-4 rounded-xl border bg-white p-4">
        <div>
          <label className="block text-xs">UPI ID</label>
          <input className="border rounded px-2 py-1 w-full" value={form.upiId}
            onChange={e=>setForm({...form, upiId:e.target.value})} />
        </div>
        <div>
          <label className="block text-xs">UPI Name (optional)</label>
          <input className="border rounded px-2 py-1 w-full" value={form.upiName}
            onChange={e=>setForm({...form, upiName:e.target.value})} />
        </div>
        <div>
          <label className="block text-xs">Price (₹)</label>
          <input type="number" className="border rounded px-2 py-1 w-40" value={form.priceINR}
            onChange={e=>setForm({...form, priceINR:+e.target.value||0})} />
        </div>
        <div>
          <label className="block text-xs">WhatsApp number/id (e.g., 9198xxxxxxx)</label>
          <input className="border rounded px-2 py-1 w-full" value={form.whatsappId}
            onChange={e=>setForm({...form, whatsappId:e.target.value})} />
        </div>
        <div>
          <label className="block text-xs">Banner (shown to users)</label>
          <input type="file" accept="image/*" onChange={e=>setBanner(e.target.files?.[0]||null)} />
        </div>
        <div>
          <label className="block text-xs">WhatsApp QR (stored only, not shown)</label>
          <input type="file" accept="image/*" onChange={e=>setWaQR(e.target.files?.[0]||null)} />
        </div>
        <div className="sm:col-span-2">
          <button className="px-3 py-1.5 rounded bg-black text-white">Save</button>
        </div>
      </form>
    </div>
  );
}
