// client/src/components/Prep/AdminPrepPanel.jsx
import { useEffect, useRef, useState } from "react";
import { getJSON, buildUrl } from "../../utils/api";

/* --------------------------- helpers --------------------------- */

function fmtDateTimeLocalISO(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(+d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/** Multipart POST (for templates upload) — FIX 1: do NOT set Content-Type manually */
async function sendMultipart(url, formData) {
  const ownerKey = localStorage.getItem("ownerKey") || "";
  const headers = { ...(ownerKey ? { "X-Owner-Key": ownerKey } : {}) };
  const full = buildUrl(url);

  const res = await fetch(full, {
    method: "POST",
    body: formData, // Browser sets proper multipart boundary
    headers,
    credentials: "include",
  });

  const ct = res.headers.get("content-type") || "";
  let data = null;
  let text = "";
  try {
    if (ct.includes("application/json")) data = await res.json();
    else {
      text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {}
    }
  } catch {}
  return { ok: res.ok, status: res.status, data, text };
}

/** JSON helpers (used for /api/prep/exams and overlay-config and no-file templates) */
async function postJSON(url, body) {
  const ownerKey = localStorage.getItem("ownerKey") || "";
  const res = await fetch(buildUrl(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ownerKey ? { "X-Owner-Key": ownerKey } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
async function patchJSON(url, body) {
  const ownerKey = localStorage.getItem("ownerKey") || "";
  const res = await fetch(buildUrl(url), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(ownerKey ? { "X-Owner-Key": ownerKey } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** DELETE helper (with Owner Key) — fixes admin delete auth */
async function delJSONAuth(url) {
  const ownerKey = localStorage.getItem("ownerKey") || "";
  const res = await fetch(buildUrl(url), {
    method: "DELETE",
    headers: {
      ...(ownerKey ? { "X-Owner-Key": ownerKey } : {}),
    },
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.message || `Delete failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

/* Build a robust FormData from the form element without creating fake files.
   We append a tiny text part `_noop=1` if NO files are selected at all, which
   avoids edge cases on some hosts where empty file sections can trigger
   “Unexpected end of form”. */
function buildMultipartFromForm(form, examId) {
  const fd = new FormData();

  // Copy all non-file fields verbatim
  Array.from(form.elements).forEach((el) => {
    if (!el.name || el.disabled) return;
    const t = (el.type || "").toLowerCase();

    if (t === "file") return; // handled below
    if ((t === "checkbox" || t === "radio") && !el.checked) return;

    fd.append(el.name, el.value ?? "");
  });

  // Ensure required meta fields are included explicitly
  fd.set("examId", examId);

  // Convert checkboxes to "true"/"false" like before
  fd.set("extractOCR", form.elements.extractOCR?.checked ? "true" : "false");
  fd.set("showOriginal", form.elements.showOriginal?.checked ? "true" : "false");
  fd.set("allowDownload", form.elements.allowDownload?.checked ? "true" : "false");
  fd.set("highlight", form.elements.highlight?.checked ? "true" : "false");

  // Normalize releaseAt to ISO if present
  const ra = form.elements.releaseAt?.value;
  if (ra) {
    const d = new Date(String(ra));
    if (!isNaN(d)) fd.set("releaseAt", d.toISOString());
  }

  // Append files if selected
  let filesCount = 0;
  const fileEls = Array.from(form.querySelectorAll('input[type="file"]'));
  for (const el of fileEls) {
    const name = el.name || "file";
    const files = el.files || [];
    for (const f of files) {
      if (f && typeof f.size === "number") {
        fd.append(name, f);
        filesCount++;
      }
    }
  }

  // If no file was selected at all, append a harmless noop text field
  // (this does NOT create a file part, and keeps your server logic intact).
  if (filesCount === 0) {
    fd.append("_noop", "1");
  }

  return { fd, filesCount };
}

/* ------------------------- main component ------------------------- */

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
      else if (!selExam || !list.find((e) => e.examId === selExam))
        setSelExam(list[0].examId);
    } catch {
      alert("Failed to load exams");
    }
  }

  async function createExam(e) {
    e.preventDefault();
    const examId = makeExam.examId.trim();
    const name = makeExam.name.trim();
    if (!examId || !name) return alert("examId and name required");

    const r = await postJSON("/api/prep/exams", {
      examId,
      name,
      scheduleMode: "cohort",
    });

    if (!r.ok || !r.data?.success) {
      const msg =
        r.data?.error || r.data?.message || `Create exam failed (${r.status})`;
      return alert(msg);
    }
    setMakeExam({ examId: "", name: "" });
    await loadExams();
    setSelExam(examId);
  }

  async function deleteExam() {
    if (!selExam) return alert("Select an exam to delete");
    if (!confirm("Delete this exam and ALL its modules/access/progress?")) return;
    try {
      await delJSONAuth(`/api/prep/exams/${encodeURIComponent(selExam)}`);
      await loadExams();
      alert("Exam deleted");
    } catch (e) {
      console.error(e);
      alert(e.message || "Delete failed");
    }
  }

  useEffect(() => {
    loadExams();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">Admin Prep Panel</h1>
        <div className="text-xs text-gray-500">Admin Mode Enabled</div>
      </div>

      {/* Exam header row */}
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
                <option value="" disabled>
                  — choose —
                </option>
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
                onChange={(e) =>
                  setMakeExam((v) => ({ ...v, examId: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="UP APO"
                value={makeExam.name}
                onChange={(e) =>
                  setMakeExam((v) => ({ ...v, name: e.target.value }))
                }
              />
            </div>
            <div className="flex items-end">
              <button className="px-4 py-2 rounded bg-black text-white w-full">
                Add Exam
              </button>
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

/* ------------------------- Exam editor ------------------------- */

function ExamEditor({ examId }) {
  const [modules, setModules] = useState([]);
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);

  // ── OVERLAY SCHEDULE + PRICE/TRIAL ──
  const [overlay, setOverlay] = useState({
    price: 0,
    trialDays: 0,
    mode: "planDayTime", // "planDayTime" | "afterN" | "fixed" | "never"
    showOnDay: 1,
    showAtLocal: "09:00",
    daysAfterStart: 0,
    fixedAt: "", // datetime-local
  });
  const [overlayLoading, setOverlayLoading] = useState(false);

  // ── PAYMENT & PROOF ──
  const [pay, setPay] = useState({
    upiId: "",
    upiName: "",
    whatsappNumber: "",
    whatsappText: "",
  });

  // Fetch templates
  async function load(force = false) {
    const ts = force ? `&_=${Date.now()}` : "";
    const r = await getJSON(
      `/api/prep/templates?examId=${encodeURIComponent(examId)}${ts}`
    );
    const items = (r.items || []).sort(
      (a, b) => a.dayIndex - b.dayIndex || a.slotMin - b.slotMin
    );
    setModules(items);
  }
  useEffect(() => {
    load(true);
  }, [examId]);

  // Fetch overlay + payment from META endpoint
  useEffect(() => {
    let ignore = false;
    (async () => {
      setOverlayLoading(true);
      try {
        const r = await getJSON(
          `/api/prep/exams/${encodeURIComponent(examId)}/meta?_=${Date.now()}`
        );
        if (ignore) return;

        // price/trial
        setOverlay((o) => ({
          ...o,
          price: Number(r?.price ?? o.price ?? 0),
          trialDays: Number(r?.trialDays ?? o.trialDays ?? 0),
        }));

        // schedule
        const ov = r?.overlay || {};

        // 🔧 Normalize server modes → UI values
        // server: "planDayTime" | "offset-days" | "fixed-date" | "never"
        // UI    : "planDayTime" | "afterN"      | "fixed"      | "never"
        let mode = ov?.mode || "planDayTime";
        if (mode === "offset-days") mode = "afterN";
        else if (mode === "fixed-date") mode = "fixed";

        // legacy mapping (if present)
        if (!mode && ov?.overlayMode) {
          mode =
            ov.overlayMode === "afterN"
              ? "afterN"
              : ov.overlayMode === "fixed"
              ? "fixed"
              : "planDayTime";
        }

        setOverlay((o) => ({
          ...o,
          mode,
          showOnDay: Number(ov?.showOnDay ?? o.showOnDay ?? 1),
          showAtLocal: String(ov?.showAtLocal ?? o.showAtLocal ?? "09:00"),
          daysAfterStart: Number(
            ov?.offsetDays ?? ov?.daysAfterStart ?? o.daysAfterStart ?? 0
          ),
          fixedAt: ov?.fixedAt ? fmtDateTimeLocalISO(ov.fixedAt) : "",
        }));

        // payment
        const paySrc = ov?.payment || r?.payment || {};
        let wa = String(paySrc.whatsappNumber || "").trim();
        if (!wa && paySrc.whatsappLink) {
          const m = String(paySrc.whatsappLink).match(/wa\.me\/(\+?\d+)/i);
          if (m) wa = m[1];
        }
        setPay({
          upiId: String(paySrc.upiId || "").trim(),
          upiName: String(paySrc.upiName || "").trim(),
          whatsappNumber: wa,
          whatsappText: String(paySrc.whatsappText || "").trim(),
        });
      } catch (e) {
        console.warn("meta GET failed:", e);
      } finally {
        setOverlayLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [examId]);

  // PATCH overlay/payment config
  async function saveOverlayJSON({
    price,
    trialDays,
    overlayMode,
    showOnDay,
    showAtLocal,
    daysAfterStart,
    fixedAt,
    upiId,
    upiName,
    whatsappNumber,
    whatsappText,
  }) {
    const modeForServer =
      overlayMode === "afterN"
        ? "offset-days"
        : overlayMode === "fixed"
        ? "fixed-date"
        : overlayMode; // planDayTime | never

    const body = {
      price: Number(price || 0),
      trialDays: Number(trialDays || 0),
      mode: modeForServer,
      offsetDays:
        modeForServer === "offset-days" ? Number(daysAfterStart || 0) : undefined,
      fixedAt:
        modeForServer === "fixed-date" && fixedAt
          ? new Date(fixedAt).toISOString()
          : undefined,
      showOnDay: modeForServer === "planDayTime" ? Number(showOnDay || 1) : undefined,
      showAtLocal:
        modeForServer === "planDayTime" ? (showAtLocal || "09:00") : undefined,
      // payment (multiple shapes supported server-side)
      upiId: (upiId || "").trim(),
      upiName: (upiName || "").trim(),
      whatsappNumber: (whatsappNumber || "").trim(),
      whatsappText: (whatsappText || "").trim(),
      payment: {
        upiId: (upiId || "").trim(),
        upiName: (upiName || "").trim(),
        whatsappNumber: (whatsappNumber || "").trim(),
        whatsappText: (whatsappText || "").trim(),
      },
      overlay: {
        payment: {
          upiId: (upiId || "").trim(),
          upiName: (upiName || "").trim(),
          whatsappNumber: (whatsappNumber || "").trim(),
          whatsappText: (whatsappText || "").trim(),
        },
      },
    };

    const r = await patchJSON(
      `/api/prep/exams/${encodeURIComponent(examId)}/overlay-config`,
      body
    );
    if (!r.ok) throw new Error(r.data?.error || `Save overlay failed: ${r.status}`);
  }

  async function handleSaveOverlay() {
    try {
      setOverlayLoading(true);
      await saveOverlayJSON({
        price: Number(overlay.price) || 0,
        trialDays: Number(overlay.trialDays) || 0,
        overlayMode: overlay.mode,
        showOnDay: Math.max(1, Number(overlay.showOnDay) || 1),
        showAtLocal: overlay.showAtLocal || "09:00",
        daysAfterStart: Number(overlay.daysAfterStart) || 0,
        fixedAt: overlay.fixedAt || null,
        upiId: pay.upiId,
        upiName: pay.upiName,
        whatsappNumber: pay.whatsappNumber,
        whatsappText: pay.whatsappText,
      });
      alert("Overlay saved");
    } catch (e) {
      console.error(e);
      alert("Save failed");
    } finally {
      setOverlayLoading(false);
    }
  }

  function bool(v) {
    return v ? "true" : "false";
  }

  /* --------- Save template (Fix 2: JSON when no files) --------- */
  async function onSave(e) {
    e.preventDefault();
    const f = formRef.current;

    // Build robust multipart body
    const { fd, filesCount } = buildMultipartFromForm(f, examId);

    setBusy(true);
    try {
      let resp;

      if (filesCount === 0) {
        // No files: send JSON instead of multipart
        const obj = Object.fromEntries(fd.entries());
        // Convert string booleans back to true/false to match server expectations (optional)
        if (typeof obj.extractOCR === "string") obj.extractOCR = obj.extractOCR === "true";
        if (typeof obj.showOriginal === "string") obj.showOriginal = obj.showOriginal === "true";
        if (typeof obj.allowDownload === "string") obj.allowDownload = obj.allowDownload === "true";
        if (typeof obj.highlight === "string") obj.highlight = obj.highlight === "true";
        resp = await postJSON("/api/prep/templates", obj);
      } else {
        // Has files: use multipart
        resp = await sendMultipart("/api/prep/templates", fd);
      }

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
    try {
      await delJSONAuth(`/api/prep/templates/${id}`);
      await load(true);
    } catch (e) {
      console.error(e);
      alert(e.message || "Delete failed");
    }
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
          <span
            className={`text-sm text-gray-500 transition-transform ${
              open ? "rotate-90" : ""
            }`}
          >
            ›
          </span>
        </button>
        {open && (
          <ul className="divide-y">
            {items.map((m) => (
              <li
                key={m._id}
                className="px-4 py-3 flex items-center justify-between text-sm"
              >
                <div>
                  <div className="font-semibold">{m.title || "Untitled"}</div>
                  <div className="text-gray-500">
                    {timeBadge(m)} •{" "}
                    {m.flags?.extractOCR
                      ? m.flags?.ocrAtRelease
                        ? "OCR @ release"
                        : "OCR"
                      : "No OCR"}{" "}
                    • {(m.files || []).length} file(s){" "}
                    {m.status ? `• ${String(m.status).toUpperCase()}` : ""}
                    {m.releaseAt
                      ? ` • releases ${new Date(m.releaseAt).toLocaleString()}`
                      : ""}
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
            {!items.length && (
              <li className="px-4 py-3 text-gray-500">No items.</li>
            )}
          </ul>
        )}
      </div>
    );
  }

  /* --------------------------- render --------------------------- */

  return (
    <>
      {/* Access & Overlay (single place incl. payment) */}
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
            <label className="block text-sm font-medium mb-1">
              Course Price (₹)
            </label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={overlay.price}
              onChange={(e) =>
                setOverlay((o) => ({ ...o, price: +e.target.value || 0 }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Trial Days</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={overlay.trialDays}
              onChange={(e) =>
                setOverlay((o) => ({
                  ...o,
                  trialDays: Math.max(0, +e.target.value || 0),
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Overlay Mode
            </label>
            <select
              className="w-full border rounded px-3 py-2 bg-white"
              value={overlay.mode}
              onChange={(e) =>
                setOverlay((o) => ({ ...o, mode: e.target.value }))
              }
            >
              <option value="planDayTime">At specific Day & Time</option>
              <option value="afterN">After N days (per user)</option>
              <option value="fixed">At fixed date/time</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>

        {overlay.mode === "planDayTime" && (
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Show on Day
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={overlay.showOnDay}
                onChange={(e) =>
                  setOverlay((o) => ({
                    ...o,
                    showOnDay: Math.max(1, +e.target.value || 1),
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Time (local, HH:mm)
              </label>
              <input
                type="time"
                className="w-full border rounded px-3 py-2"
                value={overlay.showAtLocal}
                onChange={(e) =>
                  setOverlay((o) => ({ ...o, showAtLocal: e.target.value }))
                }
              />
            </div>
          </div>
        )}

        {overlay.mode === "afterN" && (
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Days after start
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={overlay.daysAfterStart}
                onChange={(e) =>
                  setOverlay((o) => ({
                    ...o,
                    daysAfterStart: Math.max(0, +e.target.value || 0),
                  }))
                }
              />
            </div>
          </div>
        )}

        {overlay.mode === "fixed" && (
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Fixed date/time (local)
              </label>
              <input
                type="datetime-local"
                className="w-full border rounded px-3 py-2"
                value={overlay.fixedAt}
                onChange={(e) =>
                  setOverlay((o) => ({ ...o, fixedAt: e.target.value }))
                }
              />
            </div>
          </div>
        )}

        {/* Payment & Proof */}
        <div className="border-t mt-4 pt-4">
          <div className="font-medium mb-2">Payment &amp; Proof</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">UPI ID</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={pay.upiId}
                onChange={(e) => setPay((p) => ({ ...p, upiId: e.target.value }))}
                placeholder="7767045080@ptyes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                UPI Name (optional)
              </label>
              <input
                className="w-full border rounded px-3 py-2"
                value={pay.upiName}
                onChange={(e) =>
                  setPay((p) => ({ ...p, upiName: e.target.value }))
                }
                placeholder="sagar tripathi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                WhatsApp Number
              </label>
              <input
                className="w-full border rounded px-3 py-2"
                value={pay.whatsappNumber}
                onChange={(e) =>
                  setPay((p) => ({ ...p, whatsappNumber: e.target.value }))
                }
                placeholder="7767045080 or 9198xxxxxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Default WhatsApp Text (optional)
              </label>
              <input
                className="w-full border rounded px-3 py-2"
                value={pay.whatsappText}
                onChange={(e) =>
                  setPay((p) => ({ ...p, whatsappText: e.target.value }))
                }
                placeholder="hello  I paid for upapo"
              />
            </div>
          </div>
        </div>

        <div className="pt-3">
          <button
            type="button"
            onClick={handleSaveOverlay}
            className="px-3 py-2 rounded bg-emerald-600 text-white"
            disabled={overlayLoading}
          >
            {overlayLoading ? "Saving…" : "Save Overlay"}
          </button>
        </div>
      </section>

      {/* Templates form */}
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
            <input
              name="dayIndex"
              type="number"
              min="1"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slot (min)</label>
            <input
              name="slotMin"
              type="number"
              min="0"
              defaultValue="0"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              name="title"
              type="text"
              placeholder="Topic title"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Row: release + manual text */}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Release at (date &amp; time)
            </label>
            <input
              name="releaseAt"
              type="datetime-local"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Text (manualText)
            </label>
            <textarea
              name="manualText"
              className="w-full border rounded px-3 py-2 h-28"
              placeholder="Short manual text override (optional)"
            />
          </div>
        </div>

        {/* Files */}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Images (multiple)
            </label>
            <input name="images" type="file" accept="image/*" multiple className="w-full" />
            <div className="text-xs text-gray-500 mt-1">
              Up to 12 images • 40 MB each
            </div>
          </div>
          <div className="grid gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">PDF</label>
              <input name="pdf" type="file" accept="application/pdf" className="w-full" />
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

        {/* Big content textarea */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Text (paste instead of OCR)
          </label>
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
            <label className="block text-sm font-medium mb-1">
              background (e.g., #fff)
            </label>
            <input
              name="background"
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="#fff"
            />
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

      {/* Existing Modules — collapsible day groups with delete */}
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
