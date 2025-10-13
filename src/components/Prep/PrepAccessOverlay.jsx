// src/components/Prep/PrepAccessOverlay.jsx
import { useEffect, useMemo, useState } from "react";

async function getJSON(url, opts={}) {
  const r = await fetch(url, { credentials:"include", ...opts });
  const ct = (r.headers.get("content-type")||"").toLowerCase();
  const j = ct.includes("application/json") ? await r.json() : null;
  if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
}
async function postJSON(url, body) {
  const r = await fetch(url, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body||{}),
    credentials:"include"
  });
  const j = await r.json();
  if (!r.ok || j?.success === false) throw new Error(j?.error || j?.message || `HTTP ${r.status}`);
  return j;
}

export default function PrepAccessOverlay({ examId, email }) {
  const ks = useMemo(() => {
    const e = String(examId || "").trim();
    const u = String(email || "").trim() || "anon";
    return {
      wait: `overlayWaiting:${e}:${u}`,
      dismiss: (hhmm="09:00", day=1) => `overlayDismiss:${e}:${day}:${hhmm}`,
    };
  }, [examId, email]);

  const [state, setState] = useState({
    loading: true, show: false, mode: "", waiting: false,
    exam: {}, access: {}, overlay: {},
  });
  const [submitting, setSubmitting] = useState(false);
  const [nameField, setName] = useState("");
  const [phoneField, setPhone] = useState("");
  const [emailField, setEmail] = useState(localStorage.getItem("userEmail") || email || "");

  const mustWait = !!localStorage.getItem(ks.wait);

  async function fetchStatus() {
    if (!examId) return;
    const qs = new URLSearchParams({ examId, email: email || "" });
    const r = await getJSON(`/api/prep/access/status?${qs.toString()}`);
    const { exam, access, overlay } = r || {};

    // brand new user → start trial once
    if (access?.status === "none" && email) {
      await postJSON("/api/prep/access/start-trial", { examId, email });
      return fetchStatus();
    }

    let show = false, mode = "";
    if (overlay?.show && overlay?.mode) { show=true; mode=overlay.mode; }
    if (mustWait) { show=true; mode="waiting"; }

    setState({
      loading: false, show, mode, waiting: mode==="waiting",
      exam: exam||{}, access: access||{}, overlay: overlay||{},
    });
  }

  useEffect(()=>{ fetchStatus().catch(()=>setState(s=>({ ...s, loading:false }))); /* eslint-disable-next-line */ }, [examId, email]);

  // build payment
  const pay = state?.overlay?.payment || {};
  const amount = Number(pay.priceINR || 0);
  const courseName = state.exam?.name || examId;
  const isAndroid = /Android/i.test(navigator.userAgent);

  const upiId = pay.upiId || "";
  const upiName = pay.upiName || "";
  let wa = String(pay.whatsappNumber || "").replace(/[^\d+]/g, "");
  if (wa.startsWith("+")) wa = wa.slice(1);
  if (/^\d{10}$/.test(wa)) wa = "91" + wa;

  const upiLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}${upiName ? `&pn=${encodeURIComponent(upiName)}`:""}${amount?`&am=${encodeURIComponent(amount)}`:""}&cu=INR&tn=${encodeURIComponent(`Payment for ${courseName}`)}`
    : "";
  const waText = (pay.whatsappText || `Hello, I paid for "${courseName}" (₹${amount}).`).trim();
  const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(waText)}` : "";

  async function submit() {
    if (!state.show || state.mode === "waiting") return;
    if (!emailField || !emailField.includes("@")) { alert("Enter a valid email."); return; }

    const fd = new FormData();
    fd.append("examId", examId);
    fd.append("email", emailField.trim());
    fd.append("intent", state.mode === "restart" ? "restart" : "purchase");
    fd.append("name", nameField||"");
    fd.append("phone", phoneField||"");

    setSubmitting(true);
    try {
      const res = await fetch("/api/prep/access/request", { method:"POST", body: fd, credentials:"include" });
      const j = await res.json();
      if (!res.ok || j?.success === false) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
      // flip to waiting immediately:
      localStorage.setItem(ks.wait,"1");
      setState(s => ({ ...s, show:true, waiting:true, mode:"waiting" }));
      localStorage.setItem("userEmail", emailField.trim());
    } catch (e) {
      alert(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  function copyUPI(){ try{ navigator.clipboard?.writeText(upiId); }catch{} }

  // hide everything if no overlay
  const mustShow = state.loading ? mustWait : state.show || mustWait;
  if (!mustShow) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm">
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
          <div className="text-lg font-semibold mb-1">
            {state.mode === "waiting" ? "Waiting for approval" : "Start / Restart — "}{courseName || ""}
          </div>
          {state.mode === "waiting" && (
            <div className="text-sm text-emerald-700 mb-2">⟳ Waiting for admin approval…</div>
          )}

          {/* action buttons */}
          <div className="grid gap-2 mb-3">
            <button
              className={`w-full py-3 rounded text-white text-lg font-semibold ${upiLink ? "bg-emerald-600" : "bg-gray-300 cursor-not-allowed"}`}
              onClick={()=>{ if (upiLink) window.location.href=upiLink; }}
              disabled={!upiLink}
            >
              Pay via UPI
            </button>
            <a
              className={`w-full py-3 rounded text-lg font-semibold border text-center ${waLink ? "bg-white" : "bg-gray-100 pointer-events-none"}`}
              href={waLink || "#"} target="_blank" rel="noreferrer"
            >
              Send Proof on WhatsApp
            </a>
          </div>

          {!isAndroid && upiLink && (
            <div className="text-[12px] text-gray-600 mb-3">
              Tip: On desktop, copy UPI ID <code className="bg-gray-100 px-1 rounded">{upiId||"—"}</code>{" "}
              and pay from your phone. <button className="underline" onClick={copyUPI}>Copy</button>
            </div>
          )}

          <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Name"
                 value={nameField} onChange={e=>setName(e.target.value)} />
          <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Phone Number"
                 value={phoneField} onChange={e=>setPhone(e.target.value)} />
          <input className="w-full border rounded px-3 py-2 mb-3" type="email" placeholder="Email"
                 value={emailField} onChange={e=>setEmail(e.target.value)} />

          <button
            className="w-full py-3 rounded bg-emerald-600 text-white text-lg font-semibold disabled:opacity-60"
            onClick={submit}
            disabled={submitting || state.mode==="waiting" || !emailField}
          >
            {state.mode==="waiting" ? "Waiting…" : "Submit"}
          </button>

          <div className="text-[11px] text-gray-500 mt-3">
            After approval, your schedule starts again from Day 1 with the original release timings.
          </div>
        </div>
      </div>
    </div>
  );
}
