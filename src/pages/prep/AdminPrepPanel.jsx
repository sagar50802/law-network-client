// client/src/pages/prep/AdminPrepPanel.jsx
import { useEffect, useRef, useState } from "react";
import { getJSON, delJSON, buildUrl } from "../../utils/api";

/** Robust multipart POST (keeps cookies, adds admin header, safe JSON parse, correct base URL) */
async function sendMultipart(url, formData) {
  // DO NOT set Content-Type; the browser adds the multipart boundary
  const ownerKey = localStorage.getItem("ownerKey") || "";
  const headers = ownerKey ? { "X-Owner-Key": ownerKey } : {};

  const full = buildUrl(url);

  const res = await fetch(full, {
    method: "POST",
    body: formData,
    headers,
    credentials: "include",
  });

  const ct = res.headers.get("content-type") || "";
  let data = null;
  let text = "";
  try {
    if (ct.includes("application/json")) {
      data = await res.json();
    } else {
      text = await res.text();
      try { data = JSON.parse(text); } catch { /* ignore non-JSON */ }
    }
  } catch {
    /* leave data/text as-is */
  }

  console.log(
    "[AdminPrepPanel] upload status:",
    res.status,
    "type:",
    ct,
    "url:",
    res.url,
    "raw:",
    (text || JSON.stringify(data) || "").slice(0, 160)
  );

  return { ok: res.ok, status: res.status, data, text };
}

export default function AdminPrepPanel() {
  const [exams, setExams] = useState([]);
  const [selExam, setSelExam] = useState("");
  const [makeExam, setMakeExam] = useState({ examId: "", name: "" });

  async function loadExams() {
    try {
      const r = await getJSON("/api/prep/exams?_=" + Date.now());
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

    const fd = new FormData();
    fd.set("examId", examId);
    fd.set("name", name);
    fd.set("scheduleMode", "cohort");

    const r = await sendMultipart("/api/prep/exams", fd);
    if (!r.ok || !(r.data?.success)) {
      const msg = r.data?.error || r.data?.message || (r.text?.trim() || "Create exam failed");
      return alert(msg.length > 240 ? msg.slice(0, 240) + "…" : msg);
    }
    setMakeExam({ examId: "", name: "" });
    await loadExams();
    setSelExam(examId);
  }

  // NEW: delete exam (does not disturb other logic)
  async function deleteExam() {
    if (!selExam) return alert("Select an exam to delete");
    if (!confirm("Delete this exam and ALL its modules/access/progress?")) return;
    try {
      await delJSON(`/api/prep/exams/${encodeURIComponent(selExam)}`);
      await loadExams();
      alert("Exam deleted");
    } catch {
      alert("Delete failed");
    }
  }

  useEffect(() => {
    loadExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Prep Panel</h1>

      <div className="rounded-xl border bg-white p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Exam</label>
            <div className="flex gap-2">
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
              <button
                type="button"
                onClick={deleteExam}
                className="px-3 py-2 rounded border text-red-600"
                title="Delete selected exam"
              >
                Delete Exam
              </button>
            </div>
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

  // ── OVERLAY STATE (Day & Time schedule; does not affect templates logic) ──
  const [overlay, setOverlay] = useState({
    price: 0,
    trialDays: 3,
    mode: "planDayTime",  // "planDayTime" | "afterN" | "fixed" | "never"
    showOnDay: 1,         // used when mode = planDayTime
    showAtLocal: "09:00", // HH:mm, used when mode = planDayTime
    daysAfterStart: 3,    // used when mode = afterN
    fixedAt: ""           // ISO string (datetime-local) used when mode = fixed
  });
  const [overlayLoading, setOverlayLoading] = useState(false);

  // Fetch templates
  async function load(force = false) {
    const ts = force ? `&_=${Date.now()}` : "";
    const r = await getJSON(`/api/prep/templates?examId=${encodeURIComponent(examId)}${ts}`);
    const items = (r.items || []).sort((a, b) => a.dayIndex - b.dayIndex || a.slotMin - b.slotMin);
    setModules(items);
  }
  useEffect(() => {
    load(true);
  }, [examId]);

  // Fetch overlay config (price, trialDays, overlay fields)
  useEffect(() => {
    let ignore = false;
    (async () => {
      setOverlayLoading(true);
      try {
        const r = await getJSON(
          `/api/prep/exams/${encodeURIComponent(examId)}/overlay-config?_=${Date.now()}`
        );
        if (ignore) return;
        const ov = r?.overlay || {};
        setOverlay((o) => ({
          ...o,
          // read from overlay object primarily; fallback to top-level if present
          price: typeof ov?.price === "number" ? ov.price : (typeof r?.price === "number" ? r.price : o.price),
          trialDays: typeof ov?.trialDays === "number" ? ov.trialDays : (typeof r?.trialDays === "number" ? r.trialDays : o.trialDays),
          mode: ov?.mode || o.mode,
          showOnDay: typeof ov?.showOnDay === "number" ? ov.showOnDay : o.showOnDay,
          showAtLocal: ov?.showAtLocal || o.showAtLocal,
          daysAfterStart: typeof ov?.daysAfterStart === "number" ? ov.daysAfterStart : o.daysAfterStart,
          fixedAt: ov?.fixedAt || ""
        }));
      } catch (e) {
        console.warn("overlay-config GET failed:", e);
      } finally {
        setOverlayLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [examId]);

  // ✅ JSON POST helper for overlay config (as requested)
  async function saveOverlayJSON({
    price,
    trialDays,
    overlayMode,
    showOnDay,
    showAtLocal,
    daysAfterStart,
    fixedAt,
  }) {
    const ownerKey = localStorage.getItem("ownerKey") || "";
    const body = JSON.stringify({
      price,
      trialDays,
      mode: overlayMode,      // 'planDayTime' | 'afterN' | 'fixed'
      showOnDay,
      showAtLocal,            // 'HH:mm'
      daysAfterStart,
      fixedAt,
    });

    const r = await fetch(
      buildUrl(`/api/prep/exams/${encodeURIComponent(examId)}/overlay-config`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Owner-Key": ownerKey,
        },
        credentials: "include",
        body,
      }
    );

    if (!r.ok) throw new Error(`Save overlay failed: ${r.status}`);
  }

  // Wire Save button → JSON POST of the Day & Time plan
  async function handleSaveOverlay() {
    try {
      setOverlayLoading(true);
      await saveOverlayJSON({
        price: Number(overlay.price) || 0,
        trialDays: Number(overlay.trialDays) || 0,
        overlayMode: "planDayTime",                 // per spec: save Day & Time schedule
        showOnDay: Math.max(1, Number(overlay.showOnDay) || 1),
        showAtLocal: overlay.showAtLocal || "09:00",
        daysAfterStart: 0,                          // not used for planDayTime
        fixedAt: null,                              // not used for planDayTime
      });
      alert("Overlay saved");
    } catch (e) {
      console.error(e);
      alert("Save failed");
    } finally {
      setOverlayLoading(false);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  function bool(v) {
    return v ? "true" : "false";
  }

  async function onSave(e) {
    e.preventDefault();
    const f = formRef.current;
    const fd = new FormData(f);
    fd.set("examId", examId);

    // normalize boolean flags as strings
    fd.set("extractOCR", bool(f.elements.extractOCR.checked));
    fd.set("showOriginal", bool(f.elements.showOriginal.checked));
    fd.set("allowDownload", bool(f.elements.allowDownload.checked));
    fd.set("highlight", bool(f.elements.highlight.checked));

    // convert releaseAt to ISO
    const ra = fd.get("releaseAt");
    if (ra) {
      const d = new Date(String(ra));
      if (!isNaN(d)) fd.set("releaseAt", d.toISOString());
    }

    const countFiles = (name) => fd.getAll(name).filter((v) => v instanceof File && v.size > 0).length;
    console.log("[AdminPrepPanel] files in FormData:", {
      images: countFiles("images"),
      pdf: countFiles("pdf"),
      audio: countFiles("audio"),
      video: countFiles("video"),
    });

    setBusy(true);
    try {
      const resp = await sendMultipart("/api/prep/templates", fd);
      console.log("▲ upload response:", resp.status, resp.data || resp.text?.slice?.(0, 200));

      const success =
        (resp.data && resp.data.success === true) ||
        /"success"\s*:\s*true/.test(resp.text || "");

      if (!resp.ok || !success) {
        const msg =
          resp.data?.error ||
          resp.data?.message ||
          (resp.text?.trim() || "Upload failed");
        alert(msg.length > 240 ? msg.slice(0, 240) + "…" : msg);
        return;
      }

      f.reset();
      await load(true);
      await new Promise((r) => setTimeout(r, 120));
      await load(true);

      alert("Module saved");
    } catch (err) {
      console.error(err);
      alert("Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this module?")) return;
    await delJSON(`/api/prep/templates/${id}`);
    await load(true);
  }

  function groupByDay(items) {
    const m = new Map();
    for (const x of items) {
      const d = Number(x.dayIndex) || 0;
      if (!m.has(d)) m.set(d, []);
      m.get(d).push(x);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const aa = a.releaseAt ? Date.parse(a.releaseAt) : Number(a.slotMin || 0);
        const bb = b.releaseAt ? Date.parse(b.releaseAt) : Number(b.slotMin || 0);
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
          <span className={`text-sm text-gray-500 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
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

  return (
    <>
      {/* ── Access & Overlay (new card; minimal safe) ─────────────────────── */}
      <section className="rounded-xl border bg-white p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Access &amp; Overlay</h2>
          <button
            type="button"
            onClick={handleSaveOverlay}
            className="px-3 py-2 rounded border bg-white"
            disabled={overlayLoading}
          >
            {overlayLoading ? "Saving…" : "Save Overlay"}
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Course Price (₹)</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={overlay.price}
              onChange={(e) => setOverlay((o) => ({ ...o, price: +e.target.value || 0 }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Trial Days</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={overlay.trialDays}
              onChange={(e) => setOverlay((o) => ({ ...o, trialDays: Math.max(0, +e.target.value || 0) }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Overlay Mode</label>
            <select
              className="w-full border rounded px-3 py-2 bg-white"
              value={overlay.mode}
              onChange={(e) => setOverlay((o) => ({ ...o, mode: e.target.value }))}
            >
              <option value="planDayTime">At specific Day & Time</option>
              <option value="afterN">After N days (per user)</option>
              <option value="fixed">At fixed date/time</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>

        {/* Day & Time fields (only when planDayTime) */}
        {overlay.mode === "planDayTime" && (
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-sm font-medium mb-1">Show on Day</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={overlay.showOnDay}
                onChange={(e) =>
                  setOverlay((o) => ({ ...o, showOnDay: Math.max(1, +e.target.value || 1) }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time (local, HH:mm)</label>
              <input
                type="time"
                className="w-full border rounded px-3 py-2"
                value={overlay.showAtLocal}
                onChange={(e) => setOverlay((o) => ({ ...o, showAtLocal: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* After-N-days field */}
        {overlay.mode === "afterN" && (
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-sm font-medium mb-1">Days after start</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={overlay.daysAfterStart}
                onChange={(e) =>
                  setOverlay((o) => ({ ...o, daysAfterStart: Math.max(0, +e.target.value || 0) }))
                }
              />
            </div>
          </div>
        )}

        {/* Fixed date/time */}
        {overlay.mode === "fixed" && (
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-sm font-medium mb-1">Fixed date/time (local)</label>
              <input
                type="datetime-local"
                className="w-full border rounded px-3 py-2"
                value={overlay.fixedAt}
                onChange={(e) => setOverlay((o) => ({ ...o, fixedAt: e.target.value }))}
              />
            </div>
          </div>
        )}
      </section>
      {/* ──────────────────────────────────────────────────────────────────── */}

      <h2 className="text-xl font-semibold mb-3">
        Templates — {examId.replace(/_/g, " ").toLowerCase()}
      </h2>

      <form
        ref={formRef}
        onSubmit={onSave}
        encType="multipart/form-data"
        className="rounded-xl border bg-white p-4 mb-6 grid gap-3"
      >
        {/* Row: day/slot/title */}
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Day Index</label>
            <input name="dayIndex" type="number" min="1" required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slot (min)</label>
            <input name="slotMin" type="number" min="0" defaultValue="0" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input name="title" type="text" placeholder="Topic title" className="w-full border rounded px-3 py-2" />
          </div>
        </div>

        {/* Row: release + small manual text */}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Release at (date &amp; time)</label>
            <input name="releaseAt" type="datetime-local" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Text (manualText)</label>
            <textarea
              name="manualText"
              className="w-full border rounded px-3 py-2 h-28"
              placeholder="Short manual text override (optional)"
            />
          </div>
        </div>

        {/* Row: files */}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Images (multiple)</label>
            <input name="images" type="file" accept="image/*" multiple className="w-full" />
            <div className="text-xs text-gray-500 mt-1">Up to 12 images • 40 MB each</div>
          </div>
          <div className="grid gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">PDF</label>
              <input name="pdf" type="file" accept="application/pdf" className="w-full" />
              {/* NEW: small hint that ties to the OCR checkbox below */}
              <div className="text-xs text-gray-500 mt-1">
                <label htmlFor="extractOCR" className="cursor-pointer">
                  <span className="underline">Auto-OCR from PDF</span> (toggle below)
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Audio</label>
              <input name="audio" type="file" accept="audio/*" className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Video</label>
              <input name="video" type="file" accept="video/*" className="w-full" />
            </div>
          </div>
        </div>

        {/* Big content textarea (legacy/optional) */}
        <div>
          <label className="block text-sm font-medium mb-1">Text (paste instead of OCR)</label>
          <textarea
            name="content"
            className="w-full border rounded px-3 py-2 h-40"
            placeholder="Paste full text here to skip OCR (optional)"
          />
        </div>

        {/* Flags */}
        <div className="grid md:grid-cols-2 gap-3 items-end">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input id="extractOCR" type="checkbox" name="extractOCR" /> Extract OCR
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="showOriginal" /> Show Original
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="allowDownload" /> Allow Download
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="highlight" /> Highlight
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">background (e.g., #fff)</label>
            <input name="background" type="text" className="w-full border rounded px-3 py-2" placeholder="#fff" />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            className={`px-4 py-2 rounded ${busy ? "bg-gray-400" : "bg-black"} text-white`}
            disabled={busy}
          >
            {busy ? "Saving..." : "Save Module"}
          </button>
          <button
            type="button"
            onClick={() => load(true)}
            className="px-3 py-2 rounded border bg-white"
          >
            Refresh
          </button>
        </div>
      </form>

      <div className="rounded-xl border bg-white">
        <div className="px-4 py-3 border-b font-medium">Existing Modules</div>
        {groupByDay(modules).map(([day, items]) => (
          <DayGroup key={day} day={day} items={items} onDelete={onDelete} />
        ))}
        {!modules.length && <div className="px-4 py-6 text-center text-gray-500">No modules yet.</div>}
      </div>
    </>
  );
}
