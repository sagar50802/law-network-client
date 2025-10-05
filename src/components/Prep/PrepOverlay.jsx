import { useEffect, useState } from "react";
import { getJSON, postJSON, absUrl, upload } from "../../utils/api";

export default function PrepOverlay({ open, onClose, examId, emailSource }) {
  const [cfg, setCfg] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!open) return;
    getJSON(`/api/prep/overlay/${examId}`).then(r => setCfg(r.config || null)).catch(()=>{});
    // try preload email from caller/localStorage
    const e = emailSource?.() || localStorage.getItem("prepEmail") || localStorage.getItem("userEmail") || "";
    if (e) setEmail(e);
  }, [open, examId]);

  if (!open) return null;

  const upiHref = cfg?.upiDeepLink || "#";
  const waHref  = cfg?.whatsappLink ? `${cfg.whatsappLink}${cfg.whatsappLink.includes("?") ? "&" : "?"}text=${encodeURIComponent(
      `Prep Payment Proof\nExam: ${examId}\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nAmount: ₹${cfg?.priceINR||0}`
  )}` : "#";

  async function handleStart() {
    // store in db as intent for admin tracking (no disruption to current flow)
    try {
      await postJSON("/api/prep/intent", {
        examId, name, phone, email, priceINR: cfg?.priceINR || 0
      });
      if (email) localStorage.setItem("prepEmail", email);
      // Trigger UPI app immediately (Step 1)
      window.location.href = upiHref;
      // user returns → they can click WhatsApp proof (Step 2)
    } catch {}
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-[100]">
      <div className="w-[min(95vw,720px)] rounded-2xl bg-white overflow-hidden shadow-xl">
        {/* Banner */}
        <div className="h-40 bg-gray-100 relative">
          {cfg?.bannerUrl ? (
            <img src={absUrl(cfg.bannerUrl)} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-gray-400">Exam Banner</div>
          )}
          <button className="absolute top-2 right-2 bg-white/90 rounded px-2 py-1 text-sm border" onClick={onClose}>✕</button>
        </div>

        <div className="p-4 grid md:grid-cols-2 gap-4">
          <div className="text-sm">
            <div className="font-semibold text-lg mb-1">{examId.replace(/_/g," ")}</div>
            <div className="text-gray-600 mb-3">Plan Price: <b>₹{cfg?.priceINR || 0}</b></div>

            <div className="grid gap-2">
              <input className="border rounded px-2 py-1" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />
              <input className="border rounded px-2 py-1" placeholder="Phone number" value={phone} onChange={e=>setPhone(e.target.value)} />
              <input className="border rounded px-2 py-1" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
            </div>

            <button
              className="mt-3 w-full rounded bg-green-600 text-white py-2 font-semibold"
              onClick={handleStart}
            >
              Start
            </button>
            <div className="text-xs text-gray-500 mt-1">Tap “Start” to open UPI app. After paying, send proof via WhatsApp (Step 2).</div>
          </div>

          <div className="text-sm">
            <div className="font-semibold mb-2">Step 1 – Pay via UPI</div>
            <a
              href={upiHref}
              className="block text-center rounded bg-green-600 text-white py-2 font-semibold"
            >
              Pay ₹{cfg?.priceINR || 0} with UPI
            </a>

            <div className="font-semibold mt-4 mb-2">Step 2 – Send Proof on WhatsApp</div>
            <a
              target="_blank" rel="noreferrer"
              href={waHref}
              className="block text-center rounded border py-2"
            >
              Open WhatsApp Chat
            </a>
            <div className="text-xs text-gray-500 mt-2">
              We don’t show WhatsApp QR here—just tap to open chat and send screenshot.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
