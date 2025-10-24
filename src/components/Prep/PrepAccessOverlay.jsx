// client/src/components/Prep/PrepAccessOverlay.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { getJSON, upload as postForm } from "../../utils/api";

/**
 * PrepAccessOverlay
 * - Always shows first for unauthorised users
 * - Reads payment/price/overlay from /api/prep/exams/:examId/meta  (AdminPrepPanel is the single source of truth)
 * - UPI + WhatsApp flow → Submit → Waiting → Approval (manual/auto) → 15s unlock window → hide
 *
 * Props:
 *   examId (string, required)
 *   email  (string, optional; used to prefill)
 *   onApproved?: () => void   // optional callback to tell parent (PrepWizard) to refresh
 */

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function PrepAccessOverlay({ examId, email, onApproved }) {
  /** ----- localStorage keys (per exam+email) ----- */
  const ks = useMemo(() => {
    const e = String(examId || "").trim();
    const u = String(email || "").trim() || "anon";
    return {
      wait: `overlayWaiting:${e}:${u}`, // set after user submits; we poll until approved/rejected
      waitAt: `overlayWaiting:${e}:${u}:at`,
      upiStart: `overlayUPIStart:${e}:${u}`,
      waStart: `overlayWAStart:${e}:${u}`,
      approved: `overlayApprovedUntil:${e}:${u}`, // ms timestamp for 15s success window
      lastActive: `overlayLastActiveAt:${e}:${u}`,
    };
  }, [examId, email]);

  /** ----- component state ----- */
  const [state, setState] = useState({
    loading: true,
    show: true, // IMPORTANT: default to true to prevent content flash
    mode: "", // "purchase" | "restart" | "waiting" | "approved"
    access: {},
    error: "",
  });

  // Meta (single source from AdminPrepPanel)
  const [meta, setMeta] = useState({
    name: "",
    price: 0,
    overlay: {}, // we mainly care about overlay.payment
    payment: {}, // in case server keeps at root.payment as well
  });

  // form fields
  const [nameField, setName] = useState("");
  const [phoneField, setPhone] = useState("");
  const [emailField, setEmailField] = useState(
    localStorage.getItem("userEmail") || email || ""
  );
  const [submitting, setSubmitting] = useState(false);

  // timers (return-to-tab hints)
  const [upiStartTs, setUpiStartTs] = useState(
    () => Number(localStorage.getItem(ks.upiStart) || 0)
  );
  const [waStartTs, setWaStartTs] = useState(
    () => Number(localStorage.getItem(ks.waStart) || 0)
  );
  const [upiLeft, setUpiLeft] = useState(0);
  const [waLeft, setWaLeft] = useState(0);
  const UPI_SECONDS = 104;
  const WA_SECONDS = 168;

  // approval countdown
  const APPROVE_SECONDS = 15;
  const [approveLeft, setApproveLeft] = useState(() => {
    const until = Number(localStorage.getItem(ks.approved) || 0);
    return until > Date.now()
      ? Math.ceil((until - Date.now()) / 1000)
      : 0;
  });

  // hard latch to avoid any overlay flash before first guard completes
  const firstGuardDoneRef = useRef(false);

  /** ---------- READ META FROM AdminPrepPanel SOURCE ---------- */
  async function fetchExamMeta() {
    if (!examId) return;
    try {
      const r = await getJSON(`/api/prep/exams/${encodeURIComponent(examId)}/meta?_=${Date.now()}`);
      const courseName = r?.name || String(examId || "").toUpperCase();
      const price = Number(
        r?.price ??
        r?.payment?.priceINR ??
        r?.overlay?.payment?.priceINR ??
        0
      );

      setMeta({
        name: courseName,
        price,
        overlay: r?.overlay || {},
        payment: r?.payment || {},
      });

      // If admin changed UPI/WA recently, ensure button states re-evaluate
    } catch (err) {
      // keep meta minimal; overlay will still be shown but UPI may be disabled if no config
      setMeta((m) => ({ ...m, name: m.name || String(examId || "").toUpperCase() }));
      console.warn("[PrepAccessOverlay] meta fetch failed:", err);
    }
  }

  /** ---------- GUARD STATUS (no flash) ---------- */
  async function fetchGuard() {
    if (!examId) return;

    // expire very old waiting state (>15min)
    const startedAt = Number(localStorage.getItem(ks.waitAt) || 0);
    if (startedAt && Date.now() - startedAt > 15 * 60 * 1000) {
      localStorage.removeItem(ks.wait);
      localStorage.removeItem(ks.waitAt);
    }
    const keepWaiting = !!localStorage.getItem(ks.wait);

    try {
      const qs = new URLSearchParams({ examId, email: emailField || email || "" });
      const r = await getJSON(`/api/prep/access/status/guard?${qs.toString()}`);
      const { access, overlay } = r || {};

      // ACTIVE → overlay OFF (unless in the 15s approved window)
      if (access?.status === "active") {
        localStorage.setItem(ks.lastActive, String(Date.now()));
        const until = Number(localStorage.getItem(ks.approved) || 0);
        if (until > Date.now()) {
          setState((s) => ({
            ...s,
            loading: false,
            show: true,
            mode: "approved",
            access: access || {},
            error: "",
          }));
        } else {
          localStorage.removeItem(ks.wait);
          localStorage.removeItem(ks.waitAt);
          setState((s) => ({
            ...s,
            loading: false,
            show: false,
            mode: "",
            access: access || {},
            error: "",
          }));
        }
        firstGuardDoneRef.current = true;
        if (!emailField && email) setEmailField(email);
        return;
      }

      // NOT ACTIVE → overlay ON (server may hint restart/purchase)
      let show = true;
      let mode = overlay?.mode || "purchase";
      if (keepWaiting) {
        mode = "waiting";
      }

      setState((s) => ({
        ...s,
        loading: false,
        show,
        mode,
        access: access || {},
        error: "",
      }));
      firstGuardDoneRef.current = true;

      if (!emailField && email) setEmailField(email);
    } catch (err) {
      // Fail-safe: show purchase overlay rather than exposing content
      setState((s) => ({
        ...s,
        loading: false,
        show: true,
        mode: "purchase",
        access: {},
        error: "Could not verify access. Please try again.",
      }));
      firstGuardDoneRef.current = true;
    }
  }

  /** ---------- EFFECTS ---------- */
  useEffect(() => {
    // show overlay immediately on first mount (prevents flash), then fetch meta + guard
    setState((s) => ({ ...s, show: true, loading: true }));
    fetchExamMeta();
    fetchGuard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, email]);

  // Timers
  useEffect(() => {
    if (!upiStartTs) return;
    const tick = () =>
      setUpiLeft(
        Math.max(0, UPI_SECONDS - Math.floor((Date.now() - upiStartTs) / 1000))
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [upiStartTs]);

  useEffect(() => {
    if (!waStartTs) return;
    const tick = () =>
      setWaLeft(
        Math.max(0, WA_SECONDS - Math.floor((Date.now() - waStartTs) / 1000))
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [waStartTs]);

  useEffect(() => {
    if (state.mode !== "approved") return;
    const tick = () => {
      const until = Number(localStorage.getItem(ks.approved) || 0);
      const left =
        until > Date.now() ? Math.ceil((until - Date.now()) / 1000) : 0;
      setApproveLeft(clamp(left, 0, APPROVE_SECONDS));
      if (left <= 0) {
        unlockNow(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mode]);

  /** ---------- WAITING POLL LOOP ---------- */
  useEffect(() => {
    if (!state?.mode || state.mode !== "waiting" || !emailField) return;
    let stop = false;
    let noneCount = 0;

    const loop = async () => {
      if (stop) return;
      try {
        const qs = new URLSearchParams({ examId, email: emailField });
        const j = await getJSON(`/api/prep/access/request/status?${qs.toString()}`);

        if (j?.status === "approved") {
          const until = Date.now() + APPROVE_SECONDS * 1000;
          localStorage.setItem(ks.approved, String(until));
          localStorage.removeItem(ks.wait);
          localStorage.removeItem(ks.waitAt);
          stop = true;
          setState((s) => ({ ...s, show: true, mode: "approved" }));
          return;
        }

        if (j?.status === "rejected") {
          stop = true;
          localStorage.removeItem(ks.wait);
          localStorage.removeItem(ks.waitAt);
          setState((s) => ({ ...s, show: true, mode: "" }));
          alert("Your request was rejected. Please contact support.");
          return;
        }

        if (!j?.status) {
          noneCount += 1;
          if (noneCount >= 3) {
            stop = true;
            localStorage.removeItem(ks.wait);
            localStorage.removeItem(ks.waitAt);
            setState((s) => ({ ...s, show: true, mode: "" }));
            alert("We didn’t find your request. Please submit again.");
            return;
          }
        }
      } catch {
        // swallow and retry
      }
      setTimeout(loop, 5000);
    };

    loop();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.mode, emailField, examId]);

  /** ---------- PAYMENT META (from exam meta only) ---------- */
  const pay = useMemo(() => {
    // AdminPrepPanel writes payment both at meta.payment and meta.overlay.payment (we'll merge safely)
    const src = {
      ...(meta?.payment || {}),
      ...(meta?.overlay?.payment || {}),
    };

    const courseName = meta?.name || String(examId || "").toUpperCase();
    // price priority: overlay.payment.priceINR > payment.priceINR > meta.price
    const priceINR = Number(
      (meta?.overlay?.payment?.priceINR ??
        meta?.payment?.priceINR ??
        meta?.price) || 0
    );

    const rawUpi = String(src.upiId || "").trim();
    const upiId = rawUpi;
    const upiName = String(src.upiName || "").trim();

    // normalize WA
    let wa = String(src.whatsappNumber || "").trim();
    wa = wa.replace(/[^\d+]/g, "");
    if (wa.startsWith("+")) wa = wa.slice(1);
    if (/^\d{10}$/.test(wa)) wa = "91" + wa;

    const waText = (src.whatsappText || `Hello, I paid for "${courseName}" (₹${priceINR}).`).trim();

    const upiLink = upiId
      ? `upi://pay?pa=${encodeURIComponent(upiId)}${
          upiName ? `&pn=${encodeURIComponent(upiName)}` : ""
        }${priceINR ? `&am=${encodeURIComponent(priceINR)}` : ""}&cu=INR&tn=${encodeURIComponent(
          `Payment for ${courseName}`
        )}`
      : "";

    const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(waText)}` : "";

    return { courseName, priceINR, upiId, upiName, upiLink, wa, waLink };
  }, [meta, examId]);

  const isAndroid = /Android/i.test(navigator.userAgent);

  /** ---------- ACTIONS ---------- */
  const handleUPI = () => {
    if (!pay.upiLink) return;
    const now = Date.now();
    localStorage.setItem(ks.upiStart, String(now));
    setUpiStartTs(now);
    try {
      // Redirect to UPI URI (works on Android; on desktop, user can copy UPI ID)
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

    const emailVal = (emailField || "").trim();
    if (!emailVal) {
      alert("Please enter your email.");
      return;
    }

    const fd = new FormData();
    fd.append("examId", examId);
    fd.append("email", emailVal);
    fd.append("userEmail", emailVal);
    fd.append("intent", state.mode === "restart" ? "restart" : "purchase");
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

      // If already active
      if (j && j.code === "ALREADY_ACTIVE") {
        localStorage.removeItem(ks.wait);
        localStorage.removeItem(ks.waitAt);
        localStorage.setItem(ks.lastActive, String(Date.now()));
        await sleep(250);
        unlockNow(false);
        return;
      }

      if (!j?.success) {
        alert(j?.error || j?.message || "Request failed");
        return;
      }

      // auto-approve path
      if (j?.approved) {
        const until = Date.now() + APPROVE_SECONDS * 1000;
        localStorage.setItem(ks.approved, String(until));
        localStorage.removeItem(ks.wait);
        localStorage.removeItem(ks.waitAt);
        setState((s) => ({ ...s, show: true, mode: "approved" }));
        return;
      }

      // wait path
      localStorage.setItem(ks.wait, "1");
      localStorage.setItem(ks.waitAt, String(Date.now()));
      setState((s) => ({ ...s, show: true, mode: "waiting" }));
    } catch {
      alert("Could not submit right now. Please try again.");
      localStorage.removeItem(ks.wait);
      localStorage.removeItem(ks.waitAt);
      setState((s) => ({ ...s, show: true, mode: "" }));
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

    if (typeof onApproved === "function") {
      onApproved();
    } else {
      try {
        window.location.reload();
      } catch {}
    }
  }

  /** ---------- RENDER ---------- */
  // Keep overlay visible until first guard finishes (prevents content flash)
  const mustShow = state.show || !firstGuardDoneRef.current;
  if (!mustShow) return null;

  const title =
    state.mode === "waiting"
      ? "Waiting for approval"
      : state.mode === "approved"
      ? `Approved — unlocking in ${approveLeft || APPROVE_SECONDS}s`
      : `Start / Restart — ${pay.courseName}`;

  const submitDisabled =
    submitting || state.mode === "waiting" || !(emailField && emailField.trim());

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
          <div className="text-lg font-semibold mb-1">{title}</div>

          {/* approved */}
          {state.mode === "approved" && (
            <>
              <div className="text-sm text-emerald-700 mb-3">
                Access granted! We’ll unlock and reset your schedule to <b>Day 1</b> automatically in ~
                {approveLeft || APPROVE_SECONDS}s.
              </div>
              <button
                className="w-full py-3 rounded bg-emerald-600 text-white text-lg font-semibold mb-2"
                onClick={() => unlockNow(false)}
              >
                Unlock now
              </button>
              <div className="text-[11px] text-gray-500">
                After approval, your schedule starts again from Day 1 with the original release timings.
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
                This window will auto-unlock when your request is approved.
              </div>
            </>
          )}

          {/* purchase / restart */}
          {state.mode !== "waiting" && state.mode !== "approved" && (
            <>
              {/* steps header */}
              <div className="flex items-center justify-between text-xs mb-3">
                <Step n={1} label="Pay via UPI" />
                <div className="flex-1 h-px bg-gray-200 mx-2" />
                <Step n={2} label="Send Proof" />
                <div className="flex-1 h-px bg-gray-200 mx-2" />
                <Step n={3} label="Submit" />
              </div>

              {/* actions */}
              <div className="grid gap-2 mb-3">
                <button
                  className={`w-full py-3 rounded text-white text-lg font-semibold ${
                    pay.upiLink ? "bg-emerald-600" : "bg-gray-300 cursor-not-allowed"
                  }`}
                  onClick={handleUPI}
                  disabled={!pay.upiLink}
                >
                  Pay via UPI{meta?.price ? ` • ₹${Number(meta.price)}` : ""}
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
                      After sending the screenshot on WhatsApp, <b>come back here</b>. We’ll bring you back in ~{waLeft}
                      s.
                    </div>
                  )}
                </div>
              )}

              {/* form */}
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
                After approval, your schedule starts again from Day 1 with the original release timings.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-4 h-4 grid place-items-center rounded-full bg-emerald-600 text-white text-[10px]">
        {n}
      </span>
      <span>{label}</span>
    </div>
  );
}
