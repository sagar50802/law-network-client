import { useEffect, useState } from "react";
import { getJSON, upload, postJSON, buildUrl } from "../utils/api";
import isOwner from "../utils/isOwner";

const minuteOpts = Array.from({ length: 24 * 4 }, (_, i) => i * 15); // every 15 min

function fmtMin(m){ const h=Math.floor(m/60).toString().padStart(2,"0"); const mm=(m%60).toString().padStart(2,"0"); return `${h}:${mm}`; }

export default function AdminPrepPanel() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [items, setItems] = useState([]);

  const [title, setTitle] = useState("");
  const [dayIndex, setDayIndex] = useState(1);
  const [slotMin, setSlotMin] = useState(9*60);
  const [desc, setDesc] = useState("");
  const [flags, setFlags] = useState({ extractOCR:true, showOriginal:false, allowDownload:false, highlight:false, background:"" });

  const [images, setImages] = useState([]);
  const [pdf, setPdf] = useState(null);
  const [audio, setAudio] = useState(null);
  const [video, setVideo] = useState(null);

  useEffect(() => {
    getJSON("/api/prep/exams").then(r => {
      setExams(r.exams || []);
      const first = (r.exams || [])[0]?.examId || "UP_APO";
      setExamId(first);
    }).catch(()=>{});
  }, []);

  useEffect(() => { if (examId) load(); }, [examId]);

  async function load(){
    const r = await getJSON(buildUrl(`/api/prep/templates?examId=${encodeURIComponent(examId)}`));
    setItems(r.items || []);
  }

  async function onCreate(e){
    e.preventDefault();
    if (!isOwner()) return alert("Admin only");
    if (!examId) return alert("Choose exam");
    if (!title.trim()) return alert("Title required");

    const fd = new FormData();
    fd.append("examId", examId);
    fd.append("title", title.trim());
    fd.append("description", desc);
    fd.append("dayIndex", dayIndex);
    fd.append("slotMin", slotMin);
    fd.append("extractOCR", flags.extractOCR);
    fd.append("showOriginal", flags.showOriginal);
    fd.append("allowDownload", flags.allowDownload);
    fd.append("highlight", flags.highlight);
    fd.append("background", flags.background);

    images.forEach(f => fd.append("images", f));
    if (pdf) fd.append("pdf", pdf);
    if (audio) fd.append("audio", audio);
    if (video) fd.append("video", video);

    await upload("/api/prep/templates", fd, { headers: { "X-Owner-Key": localStorage.getItem("ownerKey") || "" }});
    setTitle(""); setDesc(""); setImages([]); setPdf(null); setAudio(null); setVideo(null);
    await load();
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-4">Admin Prep Panel</h1>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm">Exam</label>
        <select value={examId} onChange={e=>setExamId(e.target.value)} className="border rounded px-2 py-1">
          {exams.map(x => <option key={x.examId} value={x.examId}>{x.name} ({x.examId})</option>)}
        </select>
        <a href="/prep" className="ml-auto underline text-sm">Open User View</a>
      </div>

      {/* Create Module */}
      <form onSubmit={onCreate} className="grid gap-3 border rounded-xl p-4 bg-white shadow">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs">Title</label>
            <input className="w-full border rounded px-2 py-1" value={title} onChange={e=>setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs">Day</label>
            <input type="number" min={1} className="w-full border rounded px-2 py-1" value={dayIndex} onChange={e=>setDayIndex(+e.target.value)} />
          </div>
          <div>
            <label className="text-xs">Time</label>
            <select className="w-full border rounded px-2 py-1" value={slotMin} onChange={e=>setSlotMin(+e.target.value)}>
              {minuteOpts.map(m => <option key={m} value={m}>{fmtMin(m)}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs">Description</label>
          <textarea className="w-full border rounded px-2 py-1 min-h-[70px]" value={desc} onChange={e=>setDesc(e.target.value)} />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="border rounded p-3">
            <div className="font-semibold text-sm mb-2">Upload</div>
            <div className="flex flex-col gap-2 text-sm">
              <input type="file" accept="image/*" multiple onChange={e=>setImages(Array.from(e.target.files||[]))} />
              <input type="file" accept="application/pdf" onChange={e=>setPdf((e.target.files||[])[0]||null)} />
              <input type="file" accept="audio/*" onChange={e=>setAudio((e.target.files||[])[0]||null)} />
              <input type="file" accept="video/*" onChange={e=>setVideo((e.target.files||[])[0]||null)} />
            </div>
          </div>
          <div className="border rounded p-3">
            <div className="font-semibold text-sm mb-2">Flags</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {["extractOCR","showOriginal","allowDownload","highlight"].map(k => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={!!flags[k]} onChange={e=>setFlags(s=>({ ...s, [k]: e.target.checked }))} />
                  {k}
                </label>
              ))}
              <div className="col-span-2">
                <label className="text-xs">Background</label>
                <input className="w-full border rounded px-2 py-1" placeholder="e.g. #fffbe7" value={flags.background} onChange={e=>setFlags(s=>({ ...s, background: e.target.value }))}/>
              </div>
            </div>
          </div>
        </div>

        <div>
          <button className="px-4 py-2 rounded bg-black text-white">Save Module</button>
          <a className="ml-3 underline text-sm" href={`/prep/${encodeURIComponent(examId)}`} target="_blank">Open {examId} →</a>
        </div>
      </form>

      {/* Modules table */}
      <div className="mt-6 border rounded-xl bg-white overflow-hidden">
        <div className="px-4 py-2 font-semibold border-b">Modules</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2">Day</th>
              <th className="p-2">Time</th>
              <th className="p-2">Title</th>
              <th className="p-2">OCR</th>
              <th className="p-2">Original</th>
              <th className="p-2">Audio?</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(m => (
              <tr key={m._id} className="border-t">
                <td className="p-2">{m.dayIndex}</td>
                <td className="p-2">{fmtMin(m.slotMin||0)}</td>
                <td className="p-2">{m.title}</td>
                <td className="p-2">{m.flags?.extractOCR ? "✓" : "—"}</td>
                <td className="p-2">{m.flags?.showOriginal ? "✓" : "—"}</td>
                <td className="p-2">{(m.files||[]).some(f=>f.kind==="audio") ? "✓" : "—"}</td>
                <td className="p-2">{m.status}</td>
              </tr>
            ))}
            {items.length===0 && (
              <tr><td className="p-3 text-gray-500" colSpan={7}>No modules yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
