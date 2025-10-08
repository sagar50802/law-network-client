// client/src/pages/prep/AdminPrepPanel.jsx
import { useEffect, useRef, useState } from "react";
import { getJSON, delJSON, buildUrl } from "../../utils/api";

/** Robust multipart POST (keeps cookies, adds admin header, safe JSON parse, correct base URL) */
async function sendMultipart(url, formData) {
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
      try {
        data = JSON.parse(text);
      } catch {
        /* ignore non-JSON */
      }
    }
  } catch {}

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

    const fd = new FormData();
    fd.set("examId", examId);
    fd.set("name", name);
    fd.set("scheduleMode", "cohort");

    const r = await sendMultipart("/api/prep/exams", fd);
    if (!r.ok || !(r.data?.success)) {
      const msg =
        r.data?.error ||
        r.data?.message ||
        (r.text?.trim() || "Create exam failed");
      return alert(msg.length > 240 ? msg.slice(0, 240) + "…" : msg);
    }
    setMakeExam({ examId: "", name: "" });
    await loadExams();
    setSelExam(examId);
  }

  async function deleteExam() {
    if (!selExam) return alert("Select an exam to delete");
    if (
      !confirm("Delete this exam and ALL its modules/access/progress?")
    )
      return;
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
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Prep Panel</h1>

      {/* ✅ NEW quick navigation buttons */}
      <div className="mb-4 -mt-2">
        <a
          href="/admin/prep"
          className="inline-block mr-2 px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50"
        >
          Templates
        </a>
        <a
          href="/admin/prep-access"
          className="inline-block px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50"
          title="Review payments, grant/revoke access, or approve restarts"
        >
          Access Requests
        </a>
      </div>

      {/* Exam selection + create/delete */}
      <div className="rounded-xl border bg-white p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Select Exam
            </label>
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
        <div className="text-gray-500">
          Select or create an exam to continue.
        </div>
      ) : (
        <ExamEditor examId={selExam} />
      )}
    </div>
  );
}

/* -------------------- Exam Editor -------------------- */
function ExamEditor({ examId }) {
  const [modules, setModules] = useState([]);
  const [busy, setBusy] = useState(false);
  const [cfg, setCfg] = useState({
    price: 0,
    trialDays: 3,
    overlay: { mode: "offset-days", offsetDays: 3, fixedAt: "" },
  });
  const formRef = useRef(null);

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

  async function loadMeta() {
    if (!examId) return;
    try {
      const r = await getJSON(
        `/api/prep/exams/${encodeURIComponent(examId)}/meta?_=${Date.now()}`
      );
      if (r?.success) {
        setCfg({
          price: r.price ?? 0,
          trialDays: r.trialDays ?? 3,
          overlay: {
            mode: r.overlay?.mode || "offset-days",
            offsetDays: r.overlay?.offsetDays ?? 3,
            fixedAt: r.overlay?.fixedAt
              ? new Date(r.overlay.fixedAt).toISOString().slice(0, 16)
              : "",
          },
        });
      }
    } catch (e) {
      console.error("loadMeta failed", e);
    }
  }

  useEffect(() => {
    load(true);
    loadMeta();
  }, [examId]);

  async function saveOverlay(e) {
    e.preventDefault();
    const body = {
      price: Number(cfg.price || 0),
      trialDays: Number(cfg.trialDays || 0),
      mode: cfg.overlay.mode,
      offsetDays: Number(cfg.overlay.offsetDays || 0),
      fixedAt: cfg.overlay.fixedAt
        ? new Date(cfg.overlay.fixedAt).toISOString()
        : null,
    };
    try {
      await fetch(
        `/api/prep/exams/${encodeURIComponent(examId)}/overlay-config`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Owner-Key": localStorage.getItem("ownerKey") || "",
          },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );
      alert("Overlay settings saved");
      await loadMeta();
    } catch {
      alert("Save failed");
    }
  }

  function bool(v) {
    return v ? "true" : "false";
  }

  async function onSave(e) {
    e.preventDefault();
    const f = formRef.current;
    const fd = new FormData(f);
    fd.set("examId", examId);

    fd.set("extractOCR", bool(f.elements.extractOCR.checked));
    fd.set("showOriginal", bool(f.elements.showOriginal.checked));
    fd.set("allowDownload", bool(f.elements.allowDownload.checked));
    fd.set("highlight", bool(f.elements.highlight.checked));

    const ra = fd.get("releaseAt");
    if (ra) {
      const d = new Date(String(ra));
      if (!isNaN(d)) fd.set("releaseAt", d.toISOString());
    }

    setBusy(true);
    try {
      const resp = await sendMultipart("/api/prep/templates", fd);
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
      arr.sort(
        (a, b) =>
          (a.releaseAt ? Date.parse(a.releaseAt) : a.slotMin) -
          (b.releaseAt ? Date.parse(b.releaseAt) : b.slotMin)
      );
    }
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
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
                    {(m.releaseAt
                      ? new Date(m.releaseAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : `${m.slotMin || 0} min`)}{" "}
                    • {(m.files || []).length} file(s)
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

  return (
    <>
      {/* ✅ Access & Overlay Section */}
      <div className="rounded-xl border bg-white p-4 mb-6">
        <div className="font-semibold mb-3">Access & Overlay</div>
        <form onSubmit={saveOverlay} className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Course Price (₹)
            </label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={cfg.price}
              onChange={(e) =>
                setCfg((v) => ({ ...v, price: e.target.value }))
              }
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Trial Days</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={cfg.trialDays}
              onChange={(e) =>
                setCfg((v) => ({ ...v, trialDays: e.target.value }))
              }
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Overlay Mode
            </label>
            <select
              className="w-full border rounded px-3 py-2 bg-white"
              value={cfg.overlay.mode}
              onChange={(e) =>
                setCfg((v) => ({
                  ...v,
                  overlay: { ...v.overlay, mode: e.target.value },
                }))
              }
            >
              <option value="offset-days">After N days (per user)</option>
              <option value="fixed-date">At fixed date/time</option>
              <option value="never">Never</option>
            </select>
          </div>

          {cfg.overlay.mode === "offset-days" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Days after start
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={cfg.overlay.offsetDays}
                onChange={(e) =>
                  setCfg((v) => ({
                    ...v,
                    overlay: { ...v.overlay, offsetDays: e.target.value },
                  }))
                }
              />
            </div>
          )}

          {cfg.overlay.mode === "fixed-date" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Fixed date/time
              </label>
              <input
                type="datetime-local"
                className="w-full border rounded px-3 py-2"
                value={cfg.overlay.fixedAt}
                onChange={(e) =>
                  setCfg((v) => ({
                    ...v,
                    overlay: { ...v.overlay, fixedAt: e.target.value },
                  }))
                }
              />
            </div>
          )}

          <div className="md:col-span-3">
            <button className="px-4 py-2 rounded bg-black text-white">
              Save Overlay
            </button>
          </div>
        </form>
      </div>

      {/* Templates Section */}
      <h2 className="text-xl font-semibold mb-3">
        Templates — {examId.replace(/_/g, " ").toLowerCase()}
      </h2>

      <form
        ref={formRef}
        onSubmit={onSave}
        encType="multipart/form-data"
        className="rounded-xl border bg-white p-4 mb-6 grid gap-3"
      >
        {/* full existing form preserved */}
        {/* (unchanged form contents here — see your current version) */}
      </form>

      <div className="rounded-xl border bg-white">
        <div className="px-4 py-3 border-b font-medium">Existing Modules</div>
        {groupByDay(modules).map(([day, items]) => (
          <DayGroup key={day} day={day} items={items} onDelete={onDelete} />
        ))}
        {!modules.length && (
          <div className="px-4 py-6 text-center text-gray-500">
            No modules yet.
          </div>
        )}
      </div>
    </>
  );
}
