import { useEffect, useMemo, useState } from "react";
import { getJSON, upload as uploadApi, authHeaders } from "../../utils/api";
import IfOwnerOnly from "../common/IfOwnerOnly";

export default function AdminPrepPanel() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [tab, setTab] = useState("templates"); // templates | access | quick

  useEffect(() => {
    (async () => {
      const r = await getJSON("/api/exams");
      const list = r?.items || [];
      setExams(list);
      if (!examId && list[0]) setExamId(list[0].examId);
    })();
  }, []);

  return (
    <IfOwnerOnly className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2 mb-4">
        <select className="border rounded p-2" value={examId} onChange={(e)=>setExamId(e.target.value)}>
          {exams.map(e => <option key={e.examId} value={e.examId}>{e.name}</option>)}
        </select>
        <button className={`px-3 py-1 rounded ${tab==="templates"?"bg-black text-white":"border"}`} onClick={()=>setTab("templates")}>Templates</button>
        <button className={`px-3 py-1 rounded ${tab==="access"?"bg-black text-white":"border"}`} onClick={()=>setTab("access")}>Access</button>
        <button className={`px-3 py-1 rounded ${tab==="quick"?"bg-black text-white":"border"}`} onClick={()=>setTab("quick")}>Quick Schedule</button>
      </div>

      {tab==="templates" && <Templates examId={examId} />}
      {tab==="access" && <Access examId={examId} />}
      {tab==="quick" && <Quick examId={examId} />}
    </IfOwnerOnly>
  );
}

function Templates({ examId }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ dayIndex: 1, slot: "08:00", releaseAt: "", title: "", flags: { extractOCR: false, showOriginal: true, allowDownload: false, highlight: false, background: "none" } });
  const [files, setFiles] = useState({ pdf: null, image: null, audio: null });

  async function load() {
    const r = await getJSON(`/api/exams/${encodeURIComponent(examId)}/templates`);
    setItems(r?.items || []);
  }
  useEffect(() => { if (examId) load(); /* eslint-disable-next-line */ }, [examId]);

  async function create(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("dayIndex", String(form.dayIndex || 1));
    fd.append("slot", form.slot || "08:00");
    fd.append("releaseAt", form.releaseAt || new Date().toISOString());
    fd.append("title", form.title || "Untitled");
    fd.append("flags", JSON.stringify(form.flags || {}));
    if (files.pdf) fd.append("pdf", files.pdf);
    if (files.image) fd.append("image", files.image);
    if (files.audio) fd.append("audio", files.audio);
    await uploadApi(`/api/exams/${encodeURIComponent(examId)}/templates`, fd, { headers: authHeaders() });
    setForm({ dayIndex: 1, slot: "08:00", releaseAt: "", title: "", flags: { extractOCR: false, showOriginal: true, allowDownload: false, highlight: false, background: "none" } });
    setFiles({ pdf: null, image: null, audio: null });
    await load();
  }

  async function del(t) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/exams/${encodeURIComponent(examId)}/templates/${t._id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="grid md:grid-cols-3 gap-2 border rounded-xl bg-white p-3">
        <input className="border rounded p-2" placeholder="Day (1..N)" type="number" min="1" value={form.dayIndex} onChange={(e)=>setForm({...form, dayIndex:+e.target.value})} />
        <input className="border rounded p-2" placeholder="Slot (HH:mm)" value={form.slot} onChange={(e)=>setForm({...form, slot:e.target.value})} />
        <input className="border rounded p-2" placeholder="ReleaseAt (ISO)" value={form.releaseAt} onChange={(e)=>setForm({...form, releaseAt:e.target.value})} />
        <input className="border rounded p-2 md:col-span-3" placeholder="Title" value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} />

        <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.flags.extractOCR} onChange={(e)=>setForm({...form, flags:{...form.flags, extractOCR:e.target.checked}})} /> Extract OCR</label>
        <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.flags.showOriginal} onChange={(e)=>setForm({...form, flags:{...form.flags, showOriginal:e.target.checked}})} /> Show Original</label>
        <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.flags.allowDownload} onChange={(e)=>setForm({...form, flags:{...form.flags, allowDownload:e.target.checked}})} /> Allow Download</label>

        <div className="md:col-span-3 grid sm:grid-cols-3 gap-2">
          <input type="file" accept="application/pdf" onChange={(e)=>setFiles({...files, pdf:e.target.files?.[0]||null})} />
          <input type="file" accept="image/*" onChange={(e)=>setFiles({...files, image:e.target.files?.[0]||null})} />
          <input type="file" accept="audio/*" onChange={(e)=>setFiles({...files, audio:e.target.files?.[0]||null})} />
        </div>
        <button className="bg-black text-white rounded px-3 py-1 w-fit">Create</button>
      </form>

      <div className="grid gap-2">
        {items.map((t) => (
          <div key={t._id} className="border rounded-xl bg-white p-3 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-semibold">{t.title}</div>
              <div className="text-xs text-gray-500">Day {t.dayIndex} • {t.slot} • Release: {new Date(t.releaseAt).toLocaleString()}</div>
            </div>
            <button className="px-2 py-1 border rounded text-red-600" onClick={()=>del(t)}>Delete</button>
          </div>
        ))}
        {items.length === 0 && <div className="text-gray-500">No templates yet</div>}
      </div>
    </div>
  );
}

function Access({ examId }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ email:"", planDays:30, startAt:"" });

  async function load() {
    const r = await getJSON(`/api/exams/${encodeURIComponent(examId)}/access`);
    setItems(r?.items || []);
  }
  useEffect(() => { if (examId) load(); /* eslint-disable-next-line */ }, [examId]);

  async function grant(e) {
    e.preventDefault();
    await fetch(`/api/exams/${encodeURIComponent(examId)}/access/grant`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type":"application/json" },
      body: JSON.stringify(form),
    });
    setForm({ email:"", planDays:30, startAt:"" });
    await load();
  }

  async function revoke(email) {
    await fetch(`/api/exams/${encodeURIComponent(examId)}/access/revoke`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type":"application/json" },
      body: JSON.stringify({ email }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={grant} className="grid md:grid-cols-4 gap-2 border rounded-xl bg-white p-3">
        <input className="border rounded p-2 md:col-span-2" placeholder="Email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} />
        <input className="border rounded p-2" placeholder="Plan days" type="number" value={form.planDays} onChange={(e)=>setForm({...form, planDays:+e.target.value})} />
        <input className="border rounded p-2" placeholder="StartAt (ISO optional)" value={form.startAt} onChange={(e)=>setForm({...form, startAt:e.target.value})} />
        <button className="bg-black text-white rounded px-3 py-1 w-fit">Grant</button>
      </form>

      <div className="grid gap-2">
        {items.map(it => (
          <div key={it._id} className="border rounded-xl bg-white p-3 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-semibold">{it.userEmail}</div>
              <div className="text-xs text-gray-500">Start: {new Date(it.startAt).toLocaleString()} • Expiry: {new Date(it.expiryAt).toLocaleString()} • {it.status}</div>
            </div>
            <button className="px-2 py-1 border rounded text-red-600" onClick={()=>revoke(it.userEmail)}>Revoke</button>
          </div>
        ))}
        {items.length === 0 && <div className="text-gray-500">No users yet</div>}
      </div>
    </div>
  );
}

function Quick({ examId }) {
  const [startDate, setStartDate] = useState("");
  const [days, setDays] = useState(30);
  const [time, setTime] = useState("09:00");
  const [freq, setFreq] = useState("DAILY");
  const [extractOCR, setExtractOCR] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [allowDownload, setAllowDownload] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const [background, setBackground] = useState("none");
  const [result, setResult] = useState(null);

  async function submit(e) {
    e.preventDefault();
    const r = await fetch(`/api/exams/${encodeURIComponent(examId)}/templates/quick-schedule`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type":"application/json" },
      body: JSON.stringify({
        startDate, days, time, freq,
        defaults: { extractOCR, showOriginal, allowDownload, highlight, background }
      }),
    });
    const j = await r.json();
    setResult(j?.items?.length || 0);
  }

  return (
    <form onSubmit={submit} className="grid md:grid-cols-3 gap-2 border rounded-xl bg-white p-3">
      <input className="border rounded p-2" placeholder="Start date (ISO)" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
      <input className="border rounded p-2" placeholder="Days" type="number" value={days} onChange={(e)=>setDays(+e.target.value)} />
      <input className="border rounded p-2" placeholder="Time HH:mm" value={time} onChange={(e)=>setTime(e.target.value)} />
      <select className="border rounded p-2" value={freq} onChange={(e)=>setFreq(e.target.value)}>
        <option value="DAILY">Daily</option>
        <option value="WEEKDAYS">Weekdays</option>
      </select>
      <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={extractOCR} onChange={(e)=>setExtractOCR(e.target.checked)} /> Extract OCR</label>
      <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={showOriginal} onChange={(e)=>setShowOriginal(e.target.checked)} /> Show Original</label>
      <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={allowDownload} onChange={(e)=>setAllowDownload(e.target.checked)} /> Allow Download</label>
      <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={highlight} onChange={(e)=>setHighlight(e.target.checked)} /> Highlight</label>
      <input className="border rounded p-2" placeholder="Background (e.g. yellow)" value={background} onChange={(e)=>setBackground(e.target.value)} />
      <button className="bg-black text-white rounded px-3 py-1 w-fit">Create</button>
      {result != null && <div className="text-sm text-green-600">Created {result} placeholders</div>}
    </form>
  );
}
