import { useEffect, useMemo, useRef, useState } from "react";
import { getJSON } from "../../utils/api";

/**
 * FINAL PRODUCTION — PrepAccessOverlay.jsx
 * --------------------------------------------------
 * Frontend user overlay for course access control.
 *
 * ✅ Reads config:  /api/prep/public/exams/:examId/meta
 * ✅ Checks guard:  /api/prep/access/status/guard
 * ✅ Submits:       /api/prep/access/request
 * ✅ Polls status:  /api/prep/access/request/status
 *
 * Flow summary:
 * 1️⃣ Checks access guard → active/inactive.
 * 2️⃣ If inactive → overlay = purchase screen.
 * 3️⃣ User pays via UPI, sends proof via WhatsApp, submits request.
 * 4️⃣ Auto-approval (if enabled) → immediate 15s unlock.
 * 5️⃣ Manual approval → “waiting for admin” → polls → unlocks when approved.
 */

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// ✅ Detect backend URL for production
const API_BASE =
  window.location.hostname.includes("onrender.com")
    ? "https://law-network.onrender.com"
    : "";

export default function PrepAccessOverlay({ examId, email, onApproved }) {
  const [emailField, setEmailField] = useState(
    localStorage.getItem("userEmail") || email || ""
  );
  const userKey = useMemo(
    () => String((emailField || email || "anon")).trim().toLowerCase(),
    [emailField, email]
  );

  const ks = useMemo(() => {
    const e = String(examId || "").trim();
    const u = userKey || "anon";
    return {
      wait: `overlayWaiting:${e}:${u}`,
      waitAt: `overlayWaiting:${e}:${u}:at`,
      upiStart: `overlayUPIStart:${e}:${u}`,
      waStart: `overlayWAStart:${e}:${u}`,
      approved: `overlayApprovedUntil:${e}:${u}`,
      lastActive: `overlayLastActiveAt:${e}:${u}`,
    };
  }, [examId, userKey]);

  const [state, setState] = useState({
    loading: true,
    show: true,
    mode: "",
    access: {},
    error: "",
  });

  const [meta, setMeta] = useState({
    name: "",
    price: 0,
    overlay: {},
    payment: {},
    trialDays: 0,
  });

  const [nameField, setName] = useState("");
  const [phoneField, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
  const APPROVE_SECONDS = 15;

  const [approveLeft, setApproveLeft] = useState(() => {
    const until = Number(localStorage.getItem(ks.approved) || 0);
    return until > Date.now() ? Math.ceil((until - Date.now()) / 1000) : 0;
  });

  const firstGuardDoneRef = useRef(false);

  /* --------------------------------------------------
   * ✅ Fetch Exam Meta (public endpoint)
   * -------------------------------------------------- */
  async function fetchExamMeta() {
    if (!examId) return;
    try {
      const r = await getJSON(
        `/api/prep/public/exams/${encodeURIComponent(examId)}/meta?_=${Date.now()}`
      );
      const overlay = r?.exam?.overlay || {};
      const payment = overlay.payment || {};

      const courseName = r?.exam?.name || String(examId || "").toUpperCase();
      const price = Number(payment.priceINR ?? r?.exam?.price ?? 0);

      setMeta({
        name: courseName,
        price,
        overlay,
        payment,
        trialDays: Number(r?.exam?.trialDays || 0),
      });
    } catch (e) {
      console.warn("[PrepAccessOverlay] meta fetch failed:", e);
      setMeta((m) => ({
        ...m,
        name: m.name || String(examId || "").toUpperCase(),
      }));
    }
  }

  /* --------------------------------------------------
   * ✅ Guard — Determine if user already has access
   * (Calls /api/prep/access/status/guard)
   * -------------------------------------------------- */
  async function fetchGuard() {
    if (!examId) return;

    // Expire stale waiting state (15min)
    const startedAt = Number(localStorage.getItem(ks.waitAt) || 0);
    if (startedAt && Date.now() - startedAt > 15 * 60 * 1000) {
      localStorage.removeItem(ks.wait);
      localStorage.removeItem(ks.waitAt);
    }
    const keepWaiting = !!localStorage.getItem(ks.wait);

    try {
      const qs = new URLSearchParams({
        examId,
        email: emailField || email || "",
      });
      const r = await getJSON(`/api/prep/access/status/guard?${qs.toString()}`);
      const { access, overlay } = r || {};

      if (access?.status === "active") {
        // ✅ User already has active access, so hide overlay completely
        console.log(
          "[PrepAccessOverlay] ✅ Access already active — overlay hidden for",
          emailField || email,
          "in exam:",
          examId
        );

        setState((s) => ({ ...s, show: false, mode: "", access }));
        localStorage.removeItem(ks.wait);
        localStorage.removeItem(ks.waitAt);
        localStorage.removeItem(ks.approved);
        firstGuardDoneRef.current = true;
        return;
      }

      if (access?.status === "trial") {
        setState((s) => ({ ...s, show: false, mode: "trial", access }));
        firstGuardDoneRef.current = true;
        return;
      }

      let mode = overlay?.mode || "purchase";
      if (keepWaiting) mode = "waiting";
      setState((s) => ({ ...s, loading: false, show: true, mode, access }));
      firstGuardDoneRef.current = true;
    } catch (e) {
      console.error("[status/guard] failed:", e);
      setState((s) => ({
        ...s,
        loading: false,
        show: true,
        mode: "purchase",
        error: "Could not verify access",
      }));
      firstGuardDoneRef.current = true;
    }
  }

  /* --------------------------------------------------
   * Lifecycle Hooks
   * -------------------------------------------------- */
  useEffect(() => {
    setState((s) => ({ ...s, show: true, loading: true }));
    fetchExamMeta();
    fetchGuard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, ks.wait, ks.approved]);

  // UPI timer
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

  // WhatsApp timer
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

  // 15s auto-unlock countdown when approved
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
  }, [state.mode, ks.approved]);

  // Poll admin decision while waiting
  useEffect(() => {
    if (state.mode !== "waiting" || !emailField) return;
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
          noneCount++;
          if (noneCount >= 3) {
            stop = true;
            localStorage.removeItem(ks.wait);
            localStorage.removeItem(ks.waitAt);
            setState((s) => ({ ...s, show: true, mode: "" }));
            alert("Request not found. Please submit again.");
            return;
          }
        }
      } catch {
        // silent retry
      }
      setTimeout(loop, 5000);
    };
    loop();
    return () => {
      stop = true;
    };
  }, [state.mode, emailField, examId, ks.wait, ks.waitAt, ks.approved]);

  /* --------------------------------------------------
   * Payment handling & derived links
   * -------------------------------------------------- */
  const pay = useMemo(() => {
    const src = {
      ...(meta?.overlay?.payment || {}),
      ...(meta?.payment || {}),
    };
    const courseName = meta?.name || String(examId || "").toUpperCase();
    const priceINR = Number(src.priceINR ?? meta.price ?? 0);

    const upiId = (src.upiId || "").trim();
    const upiName = (src.upiName || "").trim();
    let wa = (src.whatsappNumber || "").trim().replace(/[^\d+]/g, "");
    if (wa.startsWith("+")) wa = wa.slice(1);
    if (/^\d{10}$/.test(wa)) wa = "91" + wa;

    const waText =
      src.whatsappText || `Hello, I paid for "${courseName}" (₹${priceINR}).`;

    const upiLink = upiId
      ? `upi://pay?pa=${encodeURIComponent(upiId)}${
          upiName ? `&pn=${encodeURIComponent(upiName)}` : ""
        }${
          priceINR ? `&am=${encodeURIComponent(priceINR)}` : ""
        }&cu=INR&tn=${encodeURIComponent(`Payment for ${courseName}`)}`
      : "";
    const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(waText)}` : "";
    return { courseName, priceINR, upiId, upiName, upiLink, wa, waLink };
  }, [meta, examId]);

  const isAndroid = /Android/i.test(navigator.userAgent);

  /* --------------------------------------------------
   * ✅ submitRequest (unchanged)
   * -------------------------------------------------- */
  async function submitRequest() {
    if (state.mode === "waiting") return;
    const emailVal = (emailField || "").trim().toLowerCase();
    if (!emailVal) return alert("Please enter your email.");

    const payload = {
      examId,
      email: emailVal,
      userEmail: emailVal,
      intent: "purchase",
      name: nameField,
      phone: phoneField,
      note: [
        upiStartTs ? "upi_clicked=1" : "",
        waStartTs ? "wa_clicked=1" : "",
      ]
        .filter(Boolean)
        .join("; "),
    };

    localStorage.setItem("userEmail", emailVal);
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/prep/access/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let j;
      try {
        j = await res.json();
      } catch {
        const text = await res.text();
        console.warn("[PrepWizard] non-JSON response:", text.slice(0, 200));
        j = { success: false, error: "non-JSON response", text };
      }

      if (j?.code === "ALREADY_ACTIVE") {
        unlockNow(false);
        return;
      }
      if (!j?.success) return alert(j?.error || "Request failed");

      if (j?.approved) {
        const until = Date.now() + APPROVE_SECONDS * 1000;
        localStorage.setItem(ks.approved, String(until));
        setState((s) => ({ ...s, show: true, mode: "approved" }));
        return;
      }

      localStorage.setItem(ks.wait, "1");
      localStorage.setItem(ks.waitAt, String(Date.now()));
      setState((s) => ({ ...s, show: true, mode: "waiting" }));
    } catch (err) {
      console.error("Submit request error:", err);
      alert("Could not submit now. Try again.");
      localStorage.removeItem(ks.wait);
      localStorage.removeItem(ks.waitAt);
    } finally {
      setSubmitting(false);
    }
  }

  function unlockNow(auto = false) {
    localStorage.setItem(ks.lastActive, String(Date.now()));
    if (auto) localStorage.setItem(ks.approved, "0");
    else localStorage.removeItem(ks.approved);
    localStorage.removeItem(ks.wait);
    localStorage.removeItem(ks.waitAt);
    setState((s) => ({ ...s, show: false }));

    if (typeof onApproved === "function") onApproved();
    else window.location.reload();
  }

  /* --------------------------------------------------
   * UI Rendering
   * -------------------------------------------------- */
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
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
        <div className="text-lg font-semibold mb-1">{title}</div>

        {/* APPROVED */}
        {state.mode === "approved" && (
          <>
            <div className="text-sm text-emerald-700 mb-3">
              Access granted! Unlocking in {approveLeft || APPROVE_SECONDS}s…
            </div>
            <button
              className="w-full py-3 rounded bg-emerald-600 text-white text-lg font-semibold mb-2"
              onClick={() => unlockNow(false)}
            >
              Unlock now
            </button>
          </>
        )}

        {/* WAITING */}
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

        {/* PURCHASE */}
        {state.mode !== "waiting" && state.mode !== "approved" && (
          <>
            <div className="flex items-center justify-between text-xs mb-3">
              <Step n={1} label="Pay via UPI" />
              <div className="flex-1 h-px bg-gray-200 mx-2" />
              <Step n={2} label="Send Proof" />
              <div className="flex-1 h-px bg-gray-200 mx-2" />
              <Step n={3} label="Submit" />
            </div>

            <div className="grid gap-2 mb-3">
              <button
                className={`w-full py-3 rounded text-white text-lg font-semibold ${
                  pay.upiLink
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (!pay.upiLink) return;
                  const now = Date.now();
                  localStorage.setItem(ks.upiStart, String(now));
                  setUpiStartTs(now);
                  window.location.href = pay.upiLink;
                }}
                disabled={!pay.upiLink}
              >
                Pay via UPI{pay.priceINR ? ` • ₹${pay.priceINR}` : ""}
              </button>
              <button
                className={`w-full py-3 rounded text-lg font-semibold border ${
                  pay.waLink
                    ? "bg-white hover:bg-gray-50"
                    : "bg-gray-100 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (!pay.waLink) return;
                  const now = Date.now();
                  localStorage.setItem(ks.waStart, String(now));
                  setWaStartTs(now);
                  window.open(pay.waLink, "_blank", "noopener,noreferrer");
                }}
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
                <button
                  className="underline"
                  onClick={() => navigator.clipboard?.writeText(pay.upiId)}
                >
                  Copy
                </button>
              </div>
            )}

            {(upiLeft > 0 || waLeft > 0) && (
              <div className="text-[12px] text-gray-700 mb-3">
                {upiLeft > 0 && (
                  <div>After paying, return to this tab (~{upiLeft}s).</div>
                )}
                {waLeft > 0 && (
                  <div>After sending on WhatsApp, come back (~{waLeft}s).</div>
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

            {meta.trialDays > 0 && (
              <div className="text-[11px] text-gray-500 mt-3">
                Free trial: {meta.trialDays} day
                {meta.trialDays > 1 ? "s" : ""} available after approval.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------
 * Helper Step UI
 * -------------------------------------------------- */
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
