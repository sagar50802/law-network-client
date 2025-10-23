import { useEffect, useMemo, useState } from "react";
import { getJSON, upload as postForm } from "../../utils/api";

/* Small helpers */
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/** Component */
export default function PrepAccessOverlay({ examId, email }) {
  /* ----------------------- localStorage keys ----------------------- */
  const ks = useMemo(() => {
    const e = String(examId || "").trim();
    const u = String(email || "").trim() || "anon";
    return {
      wait: `overlayWaiting:${e}:${u}`,
      waitAt: `overlayWaiting:${e}:${u}:at`,
      upiStart: `overlayUPIStart:${e}:${u}`,
      waStart: `overlayWAStart:${e}:${u}`,
      approved: `overlayApprovedUntil:${e}:${u}`,
      lastActive: `overlayLastActiveAt:${e}:${u}`,
    };
  }, [examId, email]);

  /* ----------------------- component state ------------------------ */
  const [state, setState] = useState({
    loading: true,
    show: !!(examId && localStorage.getItem(ks.wait)),
    mode: localStorage.getItem(ks.wait) ? "waiting" : "",
    exam: {},
    access: {},
    overlay: {},
  });

  const [submitting, setSubmitting] = useState(false);
  const [nameField, setName] = useState("");
  const [phoneField, setPhone] = useState("");
  const [emailField, setEmailField] = useState(localStorage.getItem("userEmail") || email || "");

  // timers for "return to this tab"
  const [upiStartTs, setUpiStartTs] = useState(() => Number(localStorage.getItem(ks.upiStart) || 0));
  const [upiLeft, setUpiLeft] = useState(0);
  const [waStartTs, setWaStartTs] = useState(() => Number(localStorage.getItem(ks.waStart) || 0));
  const [waLeft, setWaLeft] = useState(0);
  const UPI_SECONDS = 104;
  const WA_SECONDS = 168;

  // approval countdown
  const APPROVE_SECONDS = 15;
  const [approveLeft, setApproveLeft] = useState(() => {
    const until = Number(localStorage.getItem(ks.approved) || 0);
    return until > Date.now() ? Math.ceil((until - Date.now()) / 1000) : 0;
  });

  /* ----------------------- effects: auxiliary timers --------------- */
  useEffect(() => {
    if (!upiStartTs) return;
    const tick = () =>
      setUpiLeft(Math.max(0, UPI_SECONDS - Math.floor((Date.now() - upiStartTs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [upiStartTs]);

  useEffect(() => {
    if (!waStartTs) return;
    const tick = () =>
      setWaLeft(Math.max(0, WA_SECONDS - Math.floor((Date.now() - waStartTs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [waStartTs]);

  // countdown for approved state
  useEffect(() => {
    if (state.mode !== "approved") return;
    const tick = () => {
      const until = Number(localStorage.getItem(ks.approved) || 0);
      const left = until > Date.now() ? Math.ceil((until - Date.now()) / 1000) : 0;
      setApproveLeft(clamp(left, 0, APPROVE_SECONDS));
      if (left <= 0) unlockNow(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.mode]);

  /* ----------------------- core fetch ------------------------------ */
  async function fetchStatus() {
    if (!examId) return;

    const startedAt = Number(localStorage.getItem(ks.waitAt) || 0);
    if (startedAt && Date.now() - startedAt > 15 * 60 * 1000) {
      localStorage.removeItem(ks.wait);
      localStorage.removeItem(ks.waitAt);
    }

    const keepWaiting = !!localStorage.getItem(ks.wait);

    try {
      const qs = new URLSearchParams({ examId, email: email || "" });
      const r = await getJSON(`/api/prep/access/status/guard?${qs.toString()}`);
      const { exam, access, overlay } = r || {};
      console.log("[Overlay fetch]", r);

      if (access?.status === "active") {
        localStorage.setItem(ks.lastActive, String(Date.now()));
        const until = Number(localStorage.getItem(ks.approved) || 0);
        if (until > Date.now()) {
          setState((s) => ({
            ...s,
            loading: false,
            show: true,
            mode: "approved",
            waiting: false,
            exam: exam || {},
            access: access || {},
            overlay: overlay || {},
          }));
        } else {
          localStorage.removeItem(ks.wait);
          localStorage.removeItem(ks.waitAt);
          setState((s) => ({
            ...s,
            loading: false,
            show: false,
            waiting: false,
            mode: "",
            exam: exam || {},
            access: access || {},
            overlay: overlay || {},
          }));
        }
        if (!emailField && email) setEmailField(email);
        return;
      }

      // 🔹 Always show overlay when not active
      let show = true;
      let mode = overlay?.mode || "purchase";
      if (keepWaiting) {
        show = true;
        mode = "waiting";
      }

      setState((s) => ({
        ...s,
        loading: false,
        show,
        mode,
        waiting: mode === "waiting",
        exam: exam || {},
        access: access || {},
        overlay: overlay || {},
      }));

      if (!emailField && email) setEmailField(email);
    } catch (e) {
      console.warn("Overlay guard fetch failed:", e);
      setState((s) => ({
        ...s,
        loading: false,
        show: true,
        mode: "purchase",
        waiting: false,
      }));
    }
  }

  useEffect(() => {
    fetchStatus();
  }, [examId, email]);

  useEffect(() => {
    const id = setInterval(() => {
      if (state.show) fetchStatus();
    }, 8000);
    return () => clearInterval(id);
  }, [state.show]);

  /* ----------------------- polling requests ------------------------ */
  useEffect(() => {
    if (!state?.waiting || !emailField) return;
    let stop = false;
    let noneCount = 0;

    const loop = async () => {
      if (stop) return;
      try {
        const qs = new URLSearchParams({ examId, email: emailField });
        const j = await getJSON(`/api/prep/access/request/status?${qs.toString()}`);
        console.log("[Overlay poll request]", j);

        if (j?.status === "approved") {
          const until = Date.now() + 15 * 1000;
          localStorage.setItem(ks.approved, String(until));
          localStorage.removeItem(ks.wait);
          localStorage.removeItem(ks.waitAt);
          stop = true;
          setState((s) => ({ ...s, show: true, waiting: false, mode: "approved" }));
          return;
        }

        if (j?.status === "rejected") {
          stop = true;
          localStorage.removeItem(ks.wait);
          localStorage.removeItem(ks.waitAt);
          setState((s) => ({ ...s, show: true, waiting: false, mode: "" }));
          alert("Your request was rejected. Please contact support.");
          return;
        }

        if (!j?.status) {
          noneCount++;
          if (noneCount >= 3) {
            stop = true;
            localStorage.removeItem(ks.wait);
            localStorage.removeItem(ks.waitAt);
            setState((s) => ({ ...s, waiting: false, mode: "", show: true }));
            alert("We didn’t find your request. Please submit again.");
            return;
          }
        }
      } catch {}
      setTimeout(loop, 5000);
    };

    loop();
    return () => {
      stop = true;
    };
  }, [state?.waiting, emailField, examId]);

  /* ----------------------- payment link builders --------------------- */
  function buildPayMeta() {
    const pay =
      state?.overlay?.payment || state?.exam?.overlay?.payment || state?.exam?.payment || {};

    const courseName = state?.exam?.name || String(examId || "").toUpperCase();
    const priceINR = Number(pay.priceINR ?? state?.exam?.price ?? 0);
    const upiId = String(pay.upiId || "").trim();
    const upiName = String(pay.upiName || "").trim();
    let wa = String(pay.whatsappNumber || "").trim().replace(/[^\d+]/g, "");
    if (wa.startsWith("+")) wa = wa.slice(1);
    if (/^\d{10}$/.test(wa)) wa = "91" + wa;
    const waText = (pay.whatsappText || `Hello, I paid for "${courseName}" (₹${priceINR}).`).trim();

    const upiLink = upiId
      ? `upi://pay?pa=${encodeURIComponent(upiId)}${
          upiName ? `&pn=${encodeURIComponent(upiName)}` : ""
        }${priceINR ? `&am=${encodeURIComponent(priceINR)}` : ""}&cu=INR&tn=${encodeURIComponent(
          `Payment for ${courseName}`
        )}`
      : "";

    const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(waText)}` : "";

    return { courseName, priceINR, upiId, upiName, upiLink, wa, waLink };
  }

  const pay = useMemo(buildPayMeta, [state?.overlay, state?.exam, examId]);
  const isAndroid = /Android/i.test(navigator.userAgent);

  /* ----------------------- actions ------------------------------- */
  const handleUPI = () => {
    if (!pay.upiLink) return;
    const now = Date.now();
    localStorage.setItem(ks.upiStart, String(now));
    setUpiStartTs(now);
    try {
      window.location.href = pay.upiLink;
    } catch {}
  };

  const handleWA = () => {
    if (!pay.waLink) return;
    const now = Date.now();
    localStorage.setItem(ks.waStart, String(now));
    setWaStartTs(now);
    window.open(pay.waLink, "_blank", "noopener,noreferrer");
  };

  async function submitRequest() {
    if (state.mode === "waiting") return;

    const intentMode = state.mode || "purchase";
    const emailVal = (emailField || "").trim();
    if (!emailVal) {
      alert("Please enter your email.");
      return;
    }

    const fd = new FormData();
    fd.append("examId", examId);
    fd.append("email", emailVal);
    fd.append("userEmail", emailVal);
    fd.append("intent", intentMode === "purchase" ? "purchase" : "restart");
    if (nameField) fd.append("name", nameField);
    if (phoneField) fd.append("phone", phoneField);

    const noteBits = [];
    if (nameField) noteBits.push(`name=${nameField}`);
    if (phoneField) noteBits.push(`phone=${phoneField}`);
    if (upiStartTs) noteBits.push("upi_clicked=1");
    if (waStartTs) noteBits.push("wa_clicked=1");
    if (noteBits.length) fd.append("note", noteBits.join("; "));

    localStorage.setItem("userEmail", emailVal);
    setSubmitting(true);

    try {
      const j = await postForm("/api/prep/access/request", fd);
      console.log("[Overlay submit]", j);

      if (j && j.code === "ALREADY_ACTIVE") {
        localStorage.removeItem(ks.wait);
        localStorage.removeItem(ks.waitAt);
        localStorage.setItem(ks.lastActive, String(Date.now()));
        alert("Access already granted");
        setState((s) => ({ ...s, show: false, waiting: false, mode: "" }));
        window.location.reload();
        return;
      }

      if (!j?.success) {
        alert(j?.error || j?.message || "Request failed");
        return;
      }

      if (j?.approved) {
        const until = Date.now() + 15 * 1000;
        localStorage.setItem(ks.approved, String(until));
        localStorage.removeItem(ks.wait);
        localStorage.removeItem(ks.waitAt);
        setState((s) => ({ ...s, show: true, waiting: false, mode: "approved" }));
        return;
      }

      localStorage.setItem(ks.wait, "1");
      localStorage.setItem(ks.waitAt, String(Date.now()));
      setState((s) => ({ ...s, mode: "waiting", show: true, waiting: true }));
    } catch {
      alert("Could not submit right now. Please try again.");
      localStorage.removeItem(ks.wait);
      localStorage.removeItem(ks.waitAt);
      setState((s) => ({ ...s, waiting: false, mode: "", show: true }));
    } finally {
      setSubmitting(false);
    }
  }

  function copy(text) {
    try {
      navigator.clipboard?.writeText(text);
    } catch {}
  }

  function unlockNow(auto = false) {
    localStorage.setItem(ks.lastActive, String(Date.now()));
    if (auto) localStorage.setItem(ks.approved, "0");
    else localStorage.removeItem(ks.approved);
    localStorage.removeItem(ks.wait);
    localStorage.removeItem(ks.waitAt);
    try {
      window.location.reload();
    } catch {}
  }

  /* ----------------------- render -------------------------------- */
  const mustVeil = state.show || (state.loading && !!localStorage.getItem(ks.wait));

  // ALWAYS MOUNT; toggle with CSS to align with PrepWizard-style overlay behavior
  const title =
    state.mode === "waiting"
      ? "Waiting for approval"
      : state.mode === "approved"
      ? `Approved — unlocking in ${approveLeft || 15}s`
      : `Start / Restart — ${pay.courseName}`;

  const submitDisabled =
    submitting || state.mode === "waiting" || !(emailField && emailField.trim());

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm"
      style={{ display: mustVeil ? "block" : "none" }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
          <div className="text-lg font-semibold mb-1">{title}</div>

          {/* Step header (PrepWizard-style) */}
          {state.mode !== "waiting" && state.mode !== "approved" && (
            <div className="flex items-center justify-between text-xs mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-600 text-white font-semibold">
                  1
                </div>
                <span>Pay via UPI</span>
              </div>
              <div className="flex-1 h-px bg-gray-200 mx-2" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-200 text-gray-700 font-semibold">
                  2
                </div>
                <span>Send Proof</span>
              </div>
              <div className="flex-1 h-px bg-gray-200 mx-2" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-200 text-gray-700 font-semibold">
                  3
                </div>
                <span>Submit</span>
              </div>
            </div>
          )}

          {/* approved */}
          {state.mode === "approved" && (
            <>
              <div className="text-sm text-emerald-700 mb-3">
                Your access has been approved. Unlocking in ~{approveLeft || 15}s…
              </div>
              <button
                className="w-full py-3 rounded bg-emerald-600 text-white text-lg font-semibold mb-2"
                onClick={() => unlockNow(false)}
              >
                Unlock now
              </button>
              <div className="text-[11px] text-gray-500">
                After approval, your schedule restarts from Day 1 automatically.
              </div>
            </>
          )}

          {/* waiting */}
          {state.mode === "waiting" && (
            <>
              <div className="text-sm text-emerald-700 mb-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                <span>Waiting for admin approval…</span>
              </div>
              <div className="text-[11px] text-gray-500">
                After approval, your schedule restarts from Day 1 automatically.
              </div>
            </>
          )}

          {/* purchase/restart */}
          {state.mode !== "waiting" && state.mode !== "approved" && (
            <>
              <div className="grid gap-2 mb-3">
                <button
                  className={`w-full py-3 rounded text-white text-lg font-semibold ${
                    pay.upiLink ? "bg-emerald-600" : "bg-gray-300 cursor-not-allowed"
                  }`}
                  onClick={handleUPI}
                  disabled={!pay.upiLink}
                >
                  Pay via UPI
                </button>
                <button
                  className={`w-full py-3 rounded text-lg font-semibold border ${
                    pay.waLink ? "bg-white" : "bg-gray-100 cursor-not-allowed"
                  }`}
                  onClick={handleWA}
                  disabled={!pay.waLink}
                >
                  Send Proof on WhatsApp
                </button>
              </div>

              {/* Desktop UPI tip (align with wizard) */}
              {!isAndroid && pay.upiId && (
                <div className="text-[12px] text-gray-600 mb-3">
                  Tip: On desktop, copy UPI ID{" "}
                  <code className="bg-gray-100 px-1 rounded">{pay.upiId}</code>{" "}
                  and pay from your phone.{" "}
                  <button className="underline" onClick={() => copy(pay.upiId)}>
                    Copy
                  </button>
                </div>
              )}

              {(upiLeft > 0 || waLeft > 0) && (
                <div className="text-[12px] text-gray-700 mb-3">
                  {upiLeft > 0 && (
                    <div className="mb-1">
                      After paying, <b>return to this tab</b> to finish. Auto-focus in ~{upiLeft}s.
                    </div>
                  )}
                  {waLeft > 0 && (
                    <div>
                      After sending the screenshot on WhatsApp, <b>come back here</b>. We’ll bring
                      you back in ~{waLeft}s.
                    </div>
                  )}
                </div>
              )}

              <input
                className="w-full border rounded px-3 py-2 mb-2"
                placeholder="Name"
                value={nameField}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="w-full border rounded px-3 py-2 mb-2"
                placeholder="Phone Number"
                value={phoneField}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                className="w-full border rounded px-3 py-2 mb-3"
                type="email"
                required
                placeholder="Email"
                value={emailField}
                onChange={(e) => setEmailField(e.target.value)}
              />

              <button
                className="w-full py-3 rounded bg-emerald-600 text-white text-lg font-semibold disabled:opacity-60"
                onClick={submitRequest}
                disabled={submitDisabled}
              >
                Submit
              </button>

              <div className="text-[11px] text-gray-500 mt-3">
                After approval, your schedule starts again from Day 1 with the original release
                timings.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
