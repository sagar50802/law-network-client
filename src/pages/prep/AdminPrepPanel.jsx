import { useEffect, useState } from "react";
import { getJSON, upload, postJSON } from "../../utils/api";

export default function AdminPrepPanel() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [items, setItems] = useState([]);

  // create exam quick
  async function addExam() {
    const id = prompt("Exam ID (e.g., UP_APO)");
    const name = prompt("Name (e.g., UP APO)");
    if (!id || !name) return;
    await postJSON("/api/prep/exams", { examId:id, name });
    await loadExams();
  }

  async function loadExams() {
    const r = await getJSON("/api/prep/exams");
    setExams(r.exams || []);
    if (!examId && r.exams?.[0]) setExamId(r.exams[0].examId);
  }
  async function loadTemplates() {
    if (!examId) return setItems([]);
    const r = await getJSON(`/api/prep/${examId}/templates`);
    setItems(r.items || []);
  }

  useEffect(() => { loadExams(); }, []);
  useEffect(() => { loadTemplates(); }, [examId]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">Admin Prep Panel</h1>
        <button className="text-xs border px-2 py-1 rounded" onClick={addExam}>+ Add Exam</button>
        <div className="ml-auto" />
        <select className="border rounded px-2 py-1" value={examId} onChange={e=>setExamId(e.target.value)}>
          {exams.map(e => <option key={e.examId} value={e.examId}>{e.name}</option>)}
        </select>
        <button className="text-xs border px-2 py-1 rounded" onClick={loadTemplates}>Refresh</button>
      </div>

      <CreateModuleForm examId={examId} onSaved={loadTemplates} />

      <div className="rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Day</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2">Slot</th>
              <th className="px-3 py-2">OCR</th>
              <th className="px-3 py-2">Original</th>
              <th className="px-3 py-2">Files</th>
            </tr>
          </thead>
          <tbody>
            {items.map(m=>(
              <tr key={m._id} className="border-t">
                <td className="px-3 py-2">{m.dayIndex}</td>
                <td className="px-3 py-2">{m.title}</td>
                <td className="px-3 py-2 text-center">{m.slotTime}</td>
                <td className="px-3 py-2 text-center">{m.flags?.extractOCR ? "✓" : "—"}</td>
                <td className="px-3 py-2 text-center">{m.flags?.showOriginal ? "✓" : "—"}</td>
                <td className="px-3 py-2 text-center">{m.files?.length || 0}</td>
              </tr>
            ))}
            {items.length===0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">No modules yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AccessBox exams={exams} />
    </div>
  );
}

function CreateModuleForm({ examId, onSaved }) {
  const [day, setDay] = useState(1);
  const [slot, setSlot] = useState("09:00");
  const [title, setTitle] = useState("");
  const [extract, setExtract] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [allowDownload, setAllowDownload] = useState(false);

  const [images, setImages] = useState([]);
  const [pdf, setPdf] = useState(null);
  const [audio, setAudio] = useState(null);

  async function save(e) {
    e.preventDefault();
    if (!examId) return alert("Select an exam first");
    const fd = new FormData();
    fd.append("dayIndex", String(day));
    fd.append("slotTime", slot);
    fd.append("title", title || "Untitled");
    fd.append("extractOCR", String(extract));
    fd.append("showOriginal", String(showOriginal));
    fd.append("allowDownload", String(allowDownload));
    images.forEach(f => fd.append("images", f));
    if (pdf)   fd.append("pdf", pdf);
    if (audio) fd.append("audio", audio);
    await upload(`/api/prep/${examId}/templates`, fd);
    setTitle(""); setImages([]); setPdf(null); setAudio(null);
    onSaved?.();
  }

  return (
    <form onSubmit={save} className="rounded-xl border bg-white p-3 grid sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs">Day</label>
        <input type="number" min="1" className="border rounded px-2 py-1 w-24" value={day} onChange={e=>setDay(+e.target.value)} />
      </div>
      <div>
        <label className="block text-xs">Slot Time (HH:mm)</label>
        <input className="border rounded px-2 py-1 w-28" value={slot} onChange={e=>setSlot(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs">Title</label>
        <input className="border rounded px-2 py-1 w-full" value={title} onChange={e=>setTitle(e.target.value)} />
      </div>

      <div>
        <label className="block text-xs">Images (multiple)</label>
        <input type="file" accept="image/*" multiple onChange={e=>setImages(Array.from(e.target.files||[]))} />
      </div>
      <div>
        <label className="block text-xs">PDF (optional)</label>
        <input type="file" accept="application/pdf" onChange={e=>setPdf(e.target.files?.[0]||null)} />
      </div>
      <div>
        <label className="block text-xs">Audio (optional)</label>
        <input type="file" accept="audio/*" onChange={e=>setAudio(e.target.files?.[0]||null)} />
      </div>

      <div className="flex items-center gap-4 sm:col-span-2">
        <label className="text-xs"><input type="checkbox" checked={extract} onChange={e=>setExtract(e.target.checked)} /> Extract OCR</label>
        <label className="text-xs"><input type="checkbox" checked={showOriginal} onChange={e=>setShowOriginal(e.target.checked)} /> Show Original</label>
        <label className="text-xs"><input type="checkbox" checked={allowDownload} onChange={e=>setAllowDownload(e.target.checked)} /> Allow Download</label>
      </div>

      <div className="sm:col-span-2">
        <button className="px-3 py-1.5 rounded bg-black text-white">Save Module</button>
      </div>
    </form>
  );
}

function AccessBox({ exams }) {
  const [email, setEmail] = useState("");
  const [exam, setExam] = useState("");
  const [days, setDays] = useState(30);

  useEffect(()=>{ if (exams?.[0]) setExam(exams[0].examId); },[exams]);

  async function grant() {
    await postJSON("/api/prep/access/grant", { email, examId: exam, planDays: Number(days) });
    alert("Access granted.");
  }
  async function revoke() {
    await postJSON("/api/prep/access/revoke", { email, examId: exam });
    alert("Access revoked.");
  }

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="font-semibold mb-2">Access</div>
      <div className="flex flex-wrap items-center gap-2">
        <input className="border rounded px-2 py-1" placeholder="user email" value={email} onChange={e=>setEmail(e.target.value)} />
        <select className="border rounded px-2 py-1" value={exam} onChange={e=>setExam(e.target.value)}>
          {exams.map(e => <option key={e.examId} value={e.examId}>{e.name}</option>)}
        </select>
        <input type="number" className="border rounded px-2 py-1 w-24" value={days} onChange={e=>setDays(+e.target.value)} />
        <button className="px-2 py-1 rounded border bg-green-50" onClick={grant}>Grant</button>
        <button className="px-2 py-1 rounded border text-red-600" onClick={revoke}>Revoke</button>
      </div>
    </div>
  );
}
