// client/src/pages/prep/AdminPrepPanel.jsx
import { useEffect, useRef, useState } from "react";
import { getJSON, postJSON, upload, delJSON } from "../../utils/api"; // keep imports the same to avoid ripple changes

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

  // Robust uploader that tolerates 200 with empty/invalid JSON body
  async function safeUpload(url, fd) {
    const res = await fetch(url, { method: "POST", body: fd });
    // HTTP errors are real errors
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${t ? ` — ${t}` : ""}`);
    }
    // Try to parse JSON; if it fails but status was 200, treat as success
    try {
      const data = await res.json();
      if (data && data.success === false) {
        throw new Error(data.error || "Server returned success:false");
      }
      return data || { success: true };
    } catch {
      // Empty / non-JSON body (Render/edge quirks) — still fine since 200 OK
      return { success: true };
    }
  }

  async function onSave(e) {
    e.preventDefault();
    const f = formRef.current;

    // Build FormData explicitly so Multer receives exact fields it expects.
    const fd = new FormData();

    // Required fields
    const dayIndex = String(f.elements.dayIndex.value || "").trim();
    const slotMin = String(f.elements.slotMin.value || "0").trim();
    const title = String(f.elements.title.value || "").trim();

    if (!dayIndex) return alert("dayIndex is required");

    fd.set("examId", examId);
    fd.set("dayIndex", dayIndex);
    fd.set("slotMin", slotMin || "0");
    if (title) fd.set("title", title);

    // Date/time → ISO
    const ra = String(f.elements.releaseAt.value || "").trim();
    if (ra) {
      const d = new Date(ra); // local "YYYY-MM-DDTHH:mm"
      if (!isNaN(d)) fd.set("releaseAt", d.toISOString());
    }

    // Texts
    const manualText = String(f.elements.manualText?.value || "").trim();
    const content = String(f.elements.content?.value || "").trim();
    if (manualText) fd.set("manualText", manualText);
    if (content) fd.set("content", content);

    // Flags
    fd.set("extractOCR", bool(f.elements.extractOCR?.checked));
    fd.set("showOriginal", bool(f.elements.showOriginal?.checked));
    fd.set("allowDownload", bool(f.elements.allowDownload?.checked));
    fd.set("highlight", bool(f.elements.highlight?.checked));
    const bg = String(f.elements.background?.value || "").trim();
    if (bg) fd.set("background", bg);

    // ocrAtRelease checkbox (append only if checked to match server’s truthy logic)
    if (f.elements.ocrAtRelease?.checked) fd.set("ocrAtRelease", "true");

    // Files — append each one under the correct name
    const imgInput = f.elements.images;
    if (imgInput?.files?.length) {
      for (const file of imgInput.files) {
        if (file) fd.append("images", file, file.name);
      }
    }
    const pdfInput = f.elements.pdf;
    if (pdfInput?.files?.[0]) fd.append("pdf", pdfInput.files[0], pdfInput.files[0].name);

    const audioInput = f.elements.audio;
    if (audioInput?.files?.[0]) fd.append("audio", audioInput.files[0], audioInput.files[0].name);

    const videoInput = f.elements.video;
    if (videoInput?.files?.[0]) fd.append("video", videoInput.files[0], videoInput.files[0].name);

    // Debug (safe): log counts to help when something is off
    try {
      let imgCount = 0;
      for (const [k, v] of fd.entries()) {
        if (k === "images" && v instanceof File) imgCount++;
      }
      // eslint-disable-next-line no-console
      console.debug("[AdminPrepPanel] files about to upload:", {
        images: imgCount,
        pdf: !!pdfInput?.files?.[0],
        audio: !!audioInput?.files?.[0],
        video: !!videoInput?.files?.[0],
      });
    } catch {}

    setBusy(true);
    try {
      await safeUpload("/api/prep/templates", fd);
      f.reset();
      await load();
      alert("Module saved");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert(`Upload failed (${String(err?.message || err)})`);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this module?")) return;
    await delJSON(`/api/prep/templates/${id}`);
    await load();
  }

  // ---------- helpers for grouped list ----------
  function groupByDay(items) {
    const m = new Map();
    for (const x of items) {
      if (!m.has(x.dayIndex)) m.set(x.dayIndex, []);
      m.get(x.dayIndex).push(x);
    }
    // sort each day by releaseAt (if present) else slotMin
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const aa = a.releaseAt ? Date.parse(a.releaseAt) : a.slotMin || 0;
        const bb = b.releaseAt ? Date.parse(b.releaseAt) : b.slotMin || 0;
        return aa - bb;
      });
    }
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }

  function timeBadge(m) {
    if (m.releaseAt) {
      const d = new Date(m.releaseAt);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return `${m.slotMin || 0} min`;
  }

  function DayGroup({ day, items, onDelete }) {
    const [open, setOpen] = useState(day === 1); // open Day 1 by default
    return (
      <div className="border-b">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-50"
        >
          <div className="font-medium">Day {day}</div>
          <span className={`text-sm text-gray-500 transition-transform ${open ? "rotate-90" : ""}`}>
            ›
          </span>
        </button>
        {open && (
          <ul className="divide-y">
            {items.map((m) => (
              <li key={m._id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-semibold">{m.title || "Untitled"}</div>
                  <div className="text-gray-500">
                    {timeBadge(m)} • {m.flags?.extractOCR ? (m.flags?.ocrAtRelease ? "OCR @ release" : "OCR") : "No OCR"} •{" "}
                    {(m.files || []).length} file(s) {m.status ? `• ${String(m.status).toUpperCase()}` : ""}
                    {m.releaseAt ? ` • releases ${new Date(m.releaseAt).toLocaleString()}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(m._id)}
                  className="text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            ))}
            {!items.length && <li className="px-4 py-3 text-gray-500">No items.</li>}
          </ul>
        )}
      </div>
    );
  }
  // ---------- end helpers ----------

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
            <input name="dayIndex" type="number" min="1" required defaultValue="1" className="w-full border rounded px-3 py-2" />
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

        <div>
          <label className="block text-sm mb-1">Text (manualText)</label>
          <textarea
            name="manualText"
            rows={6}
            placeholder="Optional: paste text here…"
            className="w-full border rounded px-3 py-2"
          />
        </div>

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

      {/* ------- Grouped & collapsible list ------- */}
      <div className="rounded-xl border bg-white">
        <div className="px-4 py-3 border-b font-medium">Existing Modules</div>
        {groupByDay(modules).map(([day, items]) => (
          <DayGroup key={day} day={day} items={items} onDelete={onDelete} />
        ))}
        {!modules.length && (
          <div className="px-4 py-6 text-center text-gray-500">No modules yet.</div>
        )}
      </div>
      {/* ----------------------------------------- */}
    </>
  );
}
