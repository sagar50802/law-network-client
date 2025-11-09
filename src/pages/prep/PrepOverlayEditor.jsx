// client/src/pages/prep/PrepOverlayEditor.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON } from "../../utils/api";

export default function PrepOverlayEditor() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [loading, setLoading] = useState(false);

  // meta from server (matches your existing server contract)
  const [meta, setMeta] = useState({
    price: 0,
    trialDays: 3,
    overlay: {
      mode: "never",            // "planDayTime" | "afterN" | "fixed-date" | "never"
      showOnDay: 1,             // planDayTime
      showAtLocal: "09:00",     // planDayTime (HH:mm in admin TZ)
      tz: "Asia/Kolkata",       // optional; server defaults to Asia/Kolkata
      offsetDays: 3,            // afterN
      fixedAt: "",              // fixed-date (ISO or yyyy-mm-ddThh:mm)
    },
    payment: {
      upiId: "",                // e.g. 7767045080@ptyes
      waPhone: "",              // e.g. +9199xxxxxxx or 9199xxxxxxx
      waText: "",               // default message
    },
    name: "",
  });

  // ---------- helpers ----------
  function setOverlay(patch) {
    setMeta((m) => ({ ...m, overlay: { ...m.overlay, ...patch } }));
  }
  function setPayment(patch) {
    setMeta((m) => ({ ...m, payment: { ...m.payment, ...patch } }));
  }

  // Deep-link previews
  const upiLink = useMemo(() => {
    const id = (meta.payment?.upiId || "").trim();
    const amount = Number(meta.price || 0);
    if (!id) return "";
    const params = new URLSearchParams({
      pa: id,
      am: amount > 0 ? String(amount) : "",
      cu: "INR",
    });
    return `upi://pay?${params.toString()}`;
  }, [meta.payment?.upiId, meta.price]);

  const waLink = useMemo(() => {
    const phone = (meta.payment?.waPhone || "").replace(/[^\d+]/g, "");
    if (!phone) return "";
    const text = meta.payment?.waText || "";
    const q = new URLSearchParams({ text });
    return `https://wa.me/${phone.replace(/^\+/, "")}?${q.toString()}`;
  }, [meta.payment?.waPhone, meta.payment?.waText]);

  // ---------- load exam list ----------
  async function loadExams() {
    const r = await getJSON("/api/prep/exams");
    const list = r.exams || [];
    setExams(list);
    if (!examId && list[0]?.examId) setExamId(list[0].examId);
  }

  // ---------- load selected exam meta ----------
  async function loadMeta() {
    if (!examId) return;
    setLoading(true);
    try {
      const r = await getJSON(`/api/prep/exams/${encodeURIComponent(examId)}/meta`);
      const { price = 0, trialDays = 3, overlay = {}, payment = {}, name = "" } = r || {};
      setMeta({
        price: Number(price || 0),
        trialDays: Number(trialDays || 3),
        overlay: {
          mode: overlay.mode || "never",
          showOnDay: Number(overlay.showOnDay ?? 1),
          showAtLocal: overlay.showAtLocal || "09:00",
          tz: overlay.tz || "Asia/Kolkata",
          offsetDays: Number(overlay.offsetDays ?? 3),
          fixedAt: overlay.fixedAt || "",
        },
        payment: {
          upiId: payment.upiId || "",
          waPhone: payment.waPhone || "",
          waText: payment.waText || "",
        },
        name: name || examId,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadExams(); }, []);
  useEffect(() => {
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  // ---------- save ----------
  async function save(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        price: Number(meta.price || 0),
        trialDays: Number(meta.trialDays || 3),
        mode: meta.overlay.mode,

        // include only the relevant fields for the chosen mode
        ...(meta.overlay.mode === "planDayTime"
          ? {
              showOnDay: Number(meta.overlay.showOnDay || 1),
              showAtLocal: String(meta.overlay.showAtLocal || "09:00"),
              tz: String(meta.overlay.tz || "Asia/Kolkata"),
            }
          : {}),

        ...(meta.overlay.mode === "afterN"
          ? { offsetDays: Number(meta.overlay.offsetDays || 0) }
          : {}),

        ...(meta.overlay.mode === "fixed-date"
          ? {
              fixedAt: meta.overlay.fixedAt
                ? new Date(meta.overlay.fixedAt).toISOString()
                : null,
            }
          : {}),

        payment: {
          upiId: (meta.payment.upiId || "").trim(),
          waPhone: (meta.payment.waPhone || "").trim(),
          waText: (meta.payment.waText || "").trim(),
        },
      };

      const res = await fetch(
        `/api/prep/exams/${encodeURIComponent(examId)}/overlay-config`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error((await res.text()) || "Save failed");

      alert("Saved.");
      await loadMeta();
    } catch (err) {
      console.error(err);
      alert(`Save failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  const mode = meta.overlay.mode;

  const Label = ({ children }) => (
    <label className="block text-xs uppercase tracking-wide text-gray-600 mb-1">
      {children}
    </label>
  );

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-xl font-bold">Prep Overlay Editor</h1>

        <select
          className="border rounded px-2 py-1 ml-auto bg-white"
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
        >
          {exams.map((e) => (
            <option key={e.examId} value={e.examId}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={save} className="grid gap-4 rounded-xl border bg-white p-4">
        {/* Course meta */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Course name</Label>
            <input
              className="border rounded px-2 py-1 w-full bg-gray-50"
              value={meta.name}
              disabled
              readOnly
            />
          </div>
          <div>
            <Label>Price (₹)</Label>
            <input
              type="number"
              className="border rounded px-2 py-1 w-full"
              value={meta.price}
              onChange={(e) =>
                setMeta((m) => ({ ...m, price: +e.target.value || 0 }))
              }
            />
          </div>
          <div>
            <Label>Trial Days</Label>
            <input
              type="number"
              min="0"
              className="border rounded px-2 py-1 w-full"
              value={meta.trialDays}
              onChange={(e) =>
                setMeta((m) => ({ ...m, trialDays: +e.target.value || 0 }))
              }
            />
          </div>
        </div>

        {/* Overlay scheduling */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold">Overlay Mode</h2>
            <select
              className="border rounded px-2 py-1 bg-white"
              value={mode}
              onChange={(e) => setOverlay({ mode: e.target.value })}
            >
              <option value="planDayTime">At specific Day & Time</option>
              <option value="afterN">After N days (per user)</option>
              <option value="fixed-date">At fixed date/time</option>
              <option value="never">Never</option>
            </select>
          </div>

          {/* Show ONLY the fields for the selected mode */}

          {mode === "planDayTime" && (
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Show on Day</Label>
                <input
                  type="number"
                  min="1"
                  className="border rounded px-2 py-1 w-full"
                  value={meta.overlay.showOnDay}
                  onChange={(e) =>
                    setOverlay({ showOnDay: +e.target.value || 1 })
                  }
                />
              </div>
              <div>
                <Label>Time (HH:mm, admin TZ)</Label>
                <input
                  type="time"
                  className="border rounded px-2 py-1 w-full"
                  value={meta.overlay.showAtLocal}
                  onChange={(e) => setOverlay({ showAtLocal: e.target.value })}
                />
              </div>
              <div>
                <Label>Time zone (IANA)</Label>
                <input
                  className="border rounded px-2 py-1 w-full"
                  placeholder="Asia/Kolkata"
                  value={meta.overlay.tz}
                  onChange={(e) => setOverlay({ tz: e.target.value })}
                />
              </div>
            </div>
          )}

          {mode === "afterN" && (
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Days after start</Label>
                <input
                  type="number"
                  min="0"
                  className="border rounded px-2 py-1 w-full"
                  value={meta.overlay.offsetDays}
                  onChange={(e) =>
                    setOverlay({ offsetDays: +e.target.value || 0 })
                  }
                />
              </div>
            </div>
          )}

          {mode === "fixed-date" && (
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Fixed date/time (local)</Label>
                <input
                  type="datetime-local"
                  className="border rounded px-2 py-1 w-full"
                  value={meta.overlay.fixedAt ? meta.overlay.fixedAt.slice(0, 16) : ""}
                  onChange={(e) =>
                    setOverlay({
                      fixedAt: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : "",
                    })
                  }
                />
              </div>
            </div>
          )}
          {/* mode === "never" → no extra fields */}
        </div>

        {/* Payment config */}
        <div className="border rounded-lg p-3">
          <h2 className="text-sm font-semibold mb-2">Payment & Proof</h2>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>UPI ID</Label>
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="7767045080@ptyes"
                value={meta.payment.upiId}
                onChange={(e) => setPayment({ upiId: e.target.value })}
              />
              {upiLink ? (
                <div className="text-[11px] text-gray-500 mt-1 break-all">
                  upi://pay preview: {upiLink}
                </div>
              ) : null}
            </div>

            <div>
              <Label>WhatsApp number</Label>
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="+9199xxxxxxx"
                value={meta.payment.waPhone}
                onChange={(e) => setPayment({ waPhone: e.target.value })}
              />
              {waLink ? (
                <div className="text-[11px] text-gray-500 mt-1 break-all">
                  wa.me preview: {waLink}
                </div>
              ) : null}
            </div>

            <div>
              <Label>Default WhatsApp text (optional)</Label>
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder={`Hello, I paid for "${meta.name}" (₹${meta.price}).`}
                value={meta.payment.waText}
                onChange={(e) => setPayment({ waText: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="mt-2">
          <button
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
            disabled={loading || !examId}
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
