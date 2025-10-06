// client/src/pages/prep/AdminPrepPanel.jsx
import { useEffect, useRef, useState } from "react";
import { getJSON, postJSON, upload, delJSON } from "../../utils/api";

export default function AdminPrepPanel() {
  const [exams, setExams] = useState([]);
  const [selExam, setSelExam] = useState("");
  const [makeExam, setMakeExam] = useState({ examId: "", name: "" });

  async function loadExams() {
    try {
      const r = await getJSON("/api/prep/exams");
      const list = r.exams || [];
      setExams(list);
      if (!list.length) setSelExam("");
      else if (!selExam || !list.find((e) => e.examId === selExam)) setSelExam(list[0].examId);
    } catch (_e) {
      alert("Failed to load exams");
    }
  }

  async function createExam(e) {
    e.preventDefault();
    const examId = makeExam.examId.trim();
    const name = makeExam.name.trim();
    if (!examId || !name) return alert("examId and name required");
    await postJSON("/api/prep/exams", { examId, name, scheduleMode: "cohort" });
    setMakeExam({ examId: "", name: "" });
    await loadExams();
    setSelExam(examId);
  }

  useEffect(() => {
    loadExams();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Prep Panel</h1>

      <div className="rounded-xl border bg-white p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Exam</label>
            <select
              className="w-full border rounded px-3 py-2 bg-white"
              value={selExam}
              onChange={(e) => setSelExam(e.target.value)}
            >
              <option value="" disabled>
                — choose —
              </option>
              {exams.map((x) => (
                <option key={x.examId} value={x.examId}>
                  {x.name} ({x.examId})
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={createExam} className="grid md:grid-cols-3 gap-2">
            <div>
              <label className="block text-sm mb-1">New examId</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="UP_APO"
                value={makeExam.examId}
                onChange={(e) => setMakeExam((v) => ({ ...v, examId: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="UP APO"
                value={makeExam.name}
                onChange={(e) => setMakeExam((v) => ({ ...v, name: e.target.value }))}
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

function ExamEditor({ examId }) {
  const [modules, setModules] = useState([]);
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);

  async function load() {
    const r = await getJSON(`/api/prep/templates?examId=${encodeURIComponent(examId)}`);
    const items = (r.items || []).sort((a, b) => a.dayIndex - b.dayIndex || a.slotMin - b.slotMin);
    setModules(items);
  }
  useEffect(() => {
    load();
  }, [examId]);

  function bool(v) {
    return v ? "true" : "false";
  }

  async function onSave(e) {
    e.preventDefault();
    const f = formRef.current;
    const fd = new FormData(f);

    fd.set("examId", examId);
    // normalize checkboxes
    fd.set("extractOCR", bool(f.elements.extractOCR.checked));
    fd.set("showOriginal", bool(f.elements.showOriginal.checked));
    fd.set("allowDownload", bool(f.elements.allowDownload.checked));
    fd.set("highlight", bool(f.elements.highlight.checked));
    // NOTE: ocrAtRelease is sent automatically by browser only if checked

    // ✅ convert local datetime -> UTC ISO before sending
    const rel = f?.elements?.releaseAt?.value; // "YYYY-MM-DDTHH:mm"
    if (rel) {
      const d = new Date(rel);
      if (!isNaN(d.getTime())) {
        fd.set("releaseAt", d.toISOString());
      }
    }

    setBusy(true);
    try {
      await upload("/api/prep/templates", fd);
      f.reset();
      await load();
      alert("Module saved");
    } catch (_e) {
      alert("Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this module?")) return;
    await delJSON(`/api/prep/templates/${id}`);
    await load();
  }

  return (
    <>
      <h2 className="text-xl font-semibold mb-3">
        Templates — {examId.replace(/_/g, " ").toLowerCase()}
      </h2>

      <form
        ref={formRef}
        onSubmit={onSave}
        encType="multipart/form-data"
        className="rounded-xl border bg-white p-4 mb-6 grid gap-3"
      >
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

        {/* Release at (date & time) */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Release at (date &amp; time)</label>
          <input name="releaseAt" type="datetime-local" className="w-full border rounded px-3 py-2" />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Images (multiple)</label>
            <input name="images" type="file" accept="image/*" multiple />
          </div>

          <div>
            <label className="block text-sm mb-1">PDF</label>
            <input name="pdf" type="file" accept="application/pdf" />
            {/* ocrAtRelease next to PDF */}
            <label className="mt-1 inline-flex items-center gap-2 text-xs ml-2">
              <input type="checkbox" name="ocrAtRelease" /> Auto-OCR at release
            </label>
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

        {/* Existing manual text field (kept) */}
        <div>
          <label className="block text-sm mb-1">Text (manualText)</label>
          <textarea
            name="manualText"
            rows={6}
            placeholder="Optional: paste text here…"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* NEW: Text (paste instead of OCR) — exact name `content` */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Text (paste instead of OCR)</label>
          <textarea
            name="content"
            placeholder="Paste text here..."
            className="w-full border rounded px-3 py-2 h-28"
          />
        </div>

        <div className="grid md:grid-cols-5 gap-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="extractOCR" /> Extract OCR
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="showOriginal" /> Show Original
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="allowDownload" /> Allow Download
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="highlight" /> Highlight
          </label>
          <input
            className="w-full border rounded px-3 py-2"
            name="background"
            placeholder="background (e.g. #fffbe7)"
          />
        </div>

        <div className="flex gap-2">
          <button disabled={busy} className="px-4 py-2 rounded bg-black text-white">
            {busy ? "Saving…" : "Save Module"}
          </button>
          <button type="button" onClick={load} className="px-3 py-2 rounded border">
            Refresh
          </button>
        </div>
      </form>

      <div className="rounded-xl border bg-white">
        <div className="px-4 py-3 border-b font-medium">Existing Modules</div>
        <div className="divide-y">
          {modules.map((m) => (
            <div key={m._id} className="px-4 py-3 text-sm flex items-center justify-between">
              <div>
                <div className="font-semibold">{m.title || "Untitled"}</div>
                <div className="text-gray-500">
                  Day {m.dayIndex} • {m.slotMin} min •{" "}
                  {m.flags?.extractOCR
                    ? m.flags?.ocrAtRelease
                      ? "OCR @ release"
                      : "OCR"
                    : "No OCR"}{" "}
                  • {(m.files || []).length} file(s)
                  {m.releaseAt && (
                    <>
                      {" "}
                      • releases {new Date(m.releaseAt).toLocaleString()}
                    </>
                  )}
                  {m.status && (
                    <>
                      {" "}
                      • <span className="uppercase">{m.status}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 rounded border text-red-600"
                  onClick={() => onDelete(m._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!modules.length && (
            <div className="px-4 py-6 text-center text-gray-500">No modules yet.</div>
          )}
        </div>
      </div>
    </>
  );
}
