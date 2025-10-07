// client/src/pages/prep/AdminPrepPanel.jsx
import { useEffect, useRef, useState } from "react";
import { getJSON, postJSON, delJSON } from "../../utils/api";

/**
 * Local, robust multipart sender.
 * - DOES NOT set Content-Type (lets browser set boundary)
 * - Tries JSON > text > empty
 */
async function sendMultipart(url, formData) {
  const res = await fetch(url, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  // Try to parse as JSON; fall back to text; tolerate empty body.
  let body;
  const raw = await res.text();
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = { success: res.ok, raw };
  }

  if (!res.ok || body?.success === false) {
    const msg =
      body?.error ||
      body?.message ||
      `Upload failed (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return body || { success: true };
}

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
    } catch {
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
              <option value="" disabled>— choose —</option>
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

    // Build FormData from the form
    const fd = new FormData(f);
    fd.set("examId", examId);

    // normalize checkboxes (ensure string truthy flags are sent even when unchecked)
    fd.set("extractOCR", bool(f.elements.extractOCR.checked));
    fd.set("showOriginal", bool(f.elements.showOriginal.checked));
    fd.set("allowDownload", bool(f.elements.allowDownload.checked));
    fd.set("highlight", bool(f.elements.highlight.checked));
    // note: ocrAtRelease is included automatically when checked

    // normalize releaseAt (local → ISO)
    const ra = fd.get("releaseAt");
    if (ra) {
      const d = new Date(String(ra));
      if (!isNaN(d)) fd.set("releaseAt", d.toISOString());
    }

    // IMPORTANT: make sure files are really appended as multipart
    // (some helper libs override headers and break this)
    // Re-append explicitly so we’re 100% sure.
    const imgInput = f.elements.images;
    const pdfInput = f.elements.pdf;
    const audioInput = f.elements.audio;
    const videoInput = f.elements.video;

    if (imgInput?.files) {
      // remove any auto-captured browser entries first,
      // then append in a clean order.
      fd.delete("images");
      for (const file of imgInput.files) {
        fd.append("images", file, file.name);
      }
    }
    if (pdfInput?.files?.[0]) {
      fd.set("pdf", pdfInput.files[0], pdfInput.files[0].name);
    }
    if (audioInput?.files?.[0]) {
      fd.set("audio", audioInput.files[0], audioInput.files[0].name);
    }
    if (videoInput?.files?.[0]) {
      fd.set("video", videoInput.files[0], videoInput.files[0].name);
    }

    // Debug: show what we’re sending
    try {
      const fileCounts = {
        images: imgInput?.files?.length || 0,
        pdf: pdfInput?.files?.length || 0,
        audio: audioInput?.files?.length || 0,
        video: videoInput?.files?.length || 0,
      };
      // eslint-disable-next-line no-console
      console.log("[AdminPrepPanel] files in FormData:", fileCounts);
    } catch {}

    setBusy(true);
    try {
      await sendMultipart("/api/prep/templates", fd);
      f.reset();
      await load();            // refresh the list
      alert("Module saved");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[AdminPrepPanel] save failed:", err);
      alert(String(err?.message || err) || "Save failed");
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
    const [open, setOpen] = useState(day === 1);
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

      <div className="rounded-xl border bg-white">
        <div className="px-4 py-3 border-b font-medium">Existing Modules</div>
        {groupByDay(modules).map(([day, items]) => (
          <DayGroup key={day} day={day} items={items} onDelete={onDelete} />
        ))}
        {!modules.length && (
          <div className="px-4 py-6 text-center text-gray-500">No modules yet.</div>
        )}
      </div>
    </>
  );
}
