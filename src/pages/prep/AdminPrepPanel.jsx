// client/src/pages/prep/AdminPrepPanel.jsx
import { useEffect, useState } from "react";
import { getJSON, postJSON, upload } from "../../utils/api";

export default function AdminPrepPanel() {
  const [exams, setExams] = useState([]);
  const [selExam, setSelExam] = useState("");
  const [makeExam, setMakeExam] = useState({ examId: "", name: "" });

  async function loadExams() {
    try {
      const r = await getJSON("/api/prep/exams");
      const list = r.exams || [];
      setExams(list);
      // keep previous selection if still present, else pick first
      if (!selExam && list.length) setSelExam(list[0].examId);
      if (selExam && !list.find(e => e.examId === selExam) && list.length) {
        setSelExam(list[0].examId);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load exams");
    }
  }

  async function createExam(e) {
    e.preventDefault();
    if (!makeExam.examId || !makeExam.name) return alert("examId and name required");
    try {
      await postJSON("/api/prep/exams", {
        examId: makeExam.examId.trim(),
        name: makeExam.name.trim(),
        scheduleMode: "cohort",
      });
      setMakeExam({ examId: "", name: "" });
      await loadExams();
      setSelExam(makeExam.examId.trim());
    } catch (err) {
      console.error(err);
      alert("Create exam failed (check owner key/login).");
    }
  }

  useEffect(() => { loadExams(); }, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Prep Panel</h1>

      {/* Exams header */}
      <div className="rounded-xl border bg-white p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Exam</label>
            <select
              className="w-full border rounded px-3 py-2 bg-white"
              value={selExam}
              onChange={(e)=>setSelExam(e.target.value)}
            >
              <option value="" disabled>— choose —</option>
              {exams.map(x => (
                <option key={x.examId} value={x.examId}>
                  {x.name} ({x.examId})
                </option>
              ))}
            </select>
            {!exams.length && (
              <p className="text-xs text-gray-500 mt-1">No exams yet. Create one →</p>
            )}
          </div>

          <form onSubmit={createExam} className="grid md:grid-cols-3 gap-2">
            <div>
              <label className="block text-sm mb-1">New examId</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="UP_APO"
                value={makeExam.examId}
                onChange={(e)=>setMakeExam(v=>({ ...v, examId: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="UP APO"
                value={makeExam.name}
                onChange={(e)=>setMakeExam(v=>({ ...v, name: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <button className="px-4 py-2 rounded bg-black text-white w-full">Add Exam</button>
            </div>
          </form>
        </div>
      </div>

      {!selExam ? (
        <div className="text-gray-500">Select or create an exam to continue.</div>
      ) : (
        <ExamEditor examId={selExam} />
      )}
    </div>
  );
}

/* ---------- Module editor (uses your upload() helper) ---------- */
function ExamEditor({ examId }) {
  const [modules, setModules] = useState([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await getJSON(`/api/prep/templates?examId=${encodeURIComponent(examId)}`);
      setModules(r.items || []);
    } catch (e) {
      console.error(e);
      alert("Failed to load modules");
    }
  }
  useEffect(()=>{ load(); }, [examId]);

  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.set("examId", examId); // ensure examId goes with the upload
    setBusy(true);
    try {
      await upload("/api/prep/templates", fd); // <- uses your api.js upload()
      e.target.reset();
      await load();
      alert("Module saved");
    } catch (err) {
      console.error(err);
      alert("Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold mb-3">Templates — {examId}</h2>

      <form onSubmit={onSubmit} className="rounded-xl border bg-white p-4 mb-6 grid gap-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm mb-1">Day Index</label>
            <input name="dayIndex" type="number" min="1" required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Slot (min)</label>
            <input name="slotMin" type="number" min="0" defaultValue="0" className="w-full border rounded px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Title</label>
            <input name="title" placeholder="Constitution" className="w-full border rounded px-3 py-2" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Images (multiple)</label>
            <input name="images" type="file" accept="image/*" multiple />
          </div>
          <div>
            <label className="block text-sm mb-1">PDF</label>
            <input name="pdf" type="file" accept="application/pdf" />
          </div>
          <div>
            <label className="block text-sm mb-1">Audio</label>
            <input name="audio" type="file" accept="audio/*" />
          </div>
          <div>
            <label className="block text-sm mb-1">Video</label>
            <input name="video" type="file" accept="video/*" />
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-3">
          <label className="flex items-center gap-2"><input type="checkbox" name="extractOCR" value="true" /> Extract OCR</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="showOriginal" value="true" /> Show Original</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="allowDownload" value="true" /> Allow Download</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="highlight" value="true" /> Highlight</label>
          <input className="w-full border rounded px-3 py-2" name="background" placeholder="background (e.g. #fffbe7)" />
        </div>

        <div className="flex gap-2">
          <button disabled={busy} className="px-4 py-2 rounded bg-black text-white">
            {busy ? "Saving…" : "Save Module"}
          </button>
          <button type="button" onClick={load} className="px-3 py-2 rounded border">Refresh</button>
        </div>
      </form>

      <div className="rounded-xl border bg-white">
        <div className="px-4 py-3 border-b font-medium">Existing Modules</div>
        <div className="divide-y">
          {modules.map(m => (
            <div key={m._id} className="px-4 py-3 text-sm flex items-center justify-between">
              <div>
                <div className="font-semibold">{m.title || "Untitled"}</div>
                <div className="text-gray-500">
                  Day {m.dayIndex} • {m.slotMin} min • {m.flags?.extractOCR ? "OCR" : "No OCR"} • {(m.files||[]).length} file(s)
                </div>
              </div>
            </div>
          ))}
          {!modules.length && <div className="px-4 py-6 text-center text-gray-500">No modules yet.</div>}
        </div>
      </div>
    </>
  );
}
