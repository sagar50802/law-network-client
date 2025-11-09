import { useEffect, useState } from "react";
import {
  getJSON,
  upload,
  delJSON,
  authHeaders,
  API_ORIGIN, // ✅ use backend origin directly
} from "../../utils/api";
import IfOwnerOnly from "../common/IfOwnerOnly";

export default function QREditor() {
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({});
  const [uploadTime, setUploadTime] = useState(Date.now());

  const ownerKey = localStorage.getItem("ownerKey");

  async function load() {
    try {
      const r = await getJSON("/api/qr");
      if (r?.success) {
        setCfg(r.qr);
        setForm({
          currency: r.qr.currency || "₹",
          weeklyLabel: r.qr.plans.weekly.label,
          weeklyPrice: r.qr.plans.weekly.price,
          monthlyLabel: r.qr.plans.monthly.label,
          monthlyPrice: r.qr.plans.monthly.price,
          yearlyLabel: r.qr.plans.yearly.label,
          yearlyPrice: r.qr.plans.yearly.price,
          upi: r.qr.upi || "",            // ✅ NEW
          image: null,
        });
      }
    } catch (e) {
      console.error("Failed to load QR config:", e);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e) {
    e.preventDefault();
    if (!ownerKey) {
      alert("⚠️ No ownerKey found in localStorage.\nRun in console:\nlocalStorage.setItem('ownerKey', 'LAWNOWNER2025')");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      if (form.image) fd.append("image", form.image);
      fd.append("currency", form.currency);
      fd.append("weeklyLabel", form.weeklyLabel);
      fd.append("weeklyPrice", form.weeklyPrice);
      fd.append("monthlyLabel", form.monthlyLabel);
      fd.append("monthlyPrice", form.monthlyPrice);
      fd.append("yearlyLabel", form.yearlyLabel);
      fd.append("yearlyPrice", form.yearlyPrice);
      fd.append("upi", form.upi || "");   // ✅ NEW

      await upload("/api/qr", fd, { headers: authHeaders() });
      setForm({ ...form, image: null });
      await load();
      setUploadTime(Date.now());
      alert("✅ Saved successfully");
    } catch (e) {
      alert("Save failed: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteImage() {
    if (!cfg?.url) return;
    if (!confirm("Delete the current QR image?")) return;
    setBusy(true);
    try {
      await delJSON("/api/qr/image", { headers: authHeaders() });
      await load();
      setUploadTime(Date.now());
    } finally {
      setBusy(false);
    }
  }

  if (!cfg) return null;

  // 👇 DEBUG line to see what URL is generated
  console.log("QR debug:", cfg.url, `${API_ORIGIN}${cfg.url}?t=${uploadTime}`);

  return (
    <IfOwnerOnly>
      <div className="max-w-6xl mx-auto px-4 py-8 bg-white rounded-2xl border mt-8">
        <h3 className="font-semibold text-lg mb-4">QR & Plans</h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Preview */}
          <div>
            <div className="w-64 h-64 border rounded-xl overflow-hidden bg-gray-50">
              {cfg.url ? (
                <img
                  src={`${API_ORIGIN}${cfg.url}?t=${uploadTime}`} // ✅ force backend origin
                  alt="QR"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-gray-400 text-sm">
                  No QR uploaded
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={load} className="border rounded px-3 py-1 text-sm">
                Refresh
              </button>
              <button
                onClick={deleteImage}
                disabled={!cfg.url || busy}
                className="border rounded px-3 py-1 text-sm text-red-600"
              >
                Delete Image
              </button>
            </div>

            {/* Current Plans Preview */}
            <div className="mt-4 text-sm text-gray-700">
              <p className="font-semibold mb-1">Current Plans:</p>
              <ul className="list-disc pl-4">
                <li>
                  {cfg.plans.weekly?.label} – {cfg.currency}{cfg.plans.weekly?.price}
                </li>
                <li>
                  {cfg.plans.monthly?.label} – {cfg.currency}{cfg.plans.monthly?.price}
                </li>
                <li>
                  {cfg.plans.yearly?.label} – {cfg.currency}{cfg.plans.yearly?.price}
                </li>
              </ul>
              {cfg.upi ? (
                <p className="mt-2 text-gray-600">
                  <span className="font-medium">Current UPI:</span> {cfg.upi}
                </p>
              ) : null}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={save} className="grid gap-2 items-start">
            <label>Currency</label>
            <input
              className="border rounded p-2 w-24"
              value={form.currency}
              onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}
            />

            <label>Weekly Plan</label>
            <input
              className="border rounded p-2"
              value={form.weeklyLabel}
              placeholder="Weekly Label"
              onChange={(e) => setForm((s) => ({ ...s, weeklyLabel: e.target.value }))}
            />
            <input
              className="border rounded p-2"
              type="number"
              value={form.weeklyPrice}
              placeholder="Weekly Price"
              onChange={(e) => setForm((s) => ({ ...s, weeklyPrice: e.target.value }))}
            />

            <label>Monthly Plan</label>
            <input
              className="border rounded p-2"
              value={form.monthlyLabel}
              placeholder="Monthly Label"
              onChange={(e) => setForm((s) => ({ ...s, monthlyLabel: e.target.value }))}
            />
            <input
              className="border rounded p-2"
              type="number"
              value={form.monthlyPrice}
              placeholder="Monthly Price"
              onChange={(e) => setForm((s) => ({ ...s, monthlyPrice: e.target.value }))}
            />

            <label>Yearly Plan</label>
            <input
              className="border rounded p-2"
              value={form.yearlyLabel}
              placeholder="Yearly Label"
              onChange={(e) => setForm((s) => ({ ...s, yearlyLabel: e.target.value }))}
            />
            <input
              className="border rounded p-2"
              type="number"
              value={form.yearlyPrice}
              placeholder="Yearly Price"
              onChange={(e) => setForm((s) => ({ ...s, yearlyPrice: e.target.value }))}
            />

            {/* ✅ NEW: UPI field */}
            <label>UPI ID / VPA</label>
            <input
              className="border rounded p-2"
              value={form.upi || ""}
              placeholder="e.g. yourname@bank"
              onChange={(e) => setForm((s) => ({ ...s, upi: e.target.value }))}
            />

            <label>QR Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setForm((s) => ({ ...s, image: e.target.files?.[0] || null }))}
            />

            <button
              disabled={busy}
              className="bg-blue-600 text-white px-4 py-2 rounded w-fit mt-2"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </form>
        </div>
      </div>
    </IfOwnerOnly>
  );
}
