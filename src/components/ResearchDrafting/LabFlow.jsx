// client/src/components/ResearchDrafting/LabFlow.jsx
import { useEffect, useRef, useState } from "react";
import { fetchDraft, genStep, markPaid } from "../../utils/researchDraftingApi";

const steps = [
  { key: "abstract", title: "Put your Abstract" },
  { key: "review", title: "Review of Literature" },
  { key: "methodology", title: "Research Methodology" },
  { key: "aims", title: "Aim of Research" },
  { key: "chapterization", title: "Chapterization" },
  { key: "conclusion", title: "Conclusion" },
  { key: "assemble", title: "Assemble & Preview" },
];

/* --------------------------------------------------------------------- */
/* Smooth Typewriter                                                     */
/* --------------------------------------------------------------------- */
function Typewriter({ text = "" }) {
  const [display, setDisplay] = useState("");
  const indexRef = useRef(0);
  const typingInterval = useRef(null);

  useEffect(() => {
    if (!text) {
      setDisplay("");
      indexRef.current = 0;
      return;
    }

    const end = text.length;
    clearInterval(typingInterval.current);
    typingInterval.current = setInterval(() => {
      if (indexRef.current < end) {
        const nextChar = text[indexRef.current];
        indexRef.current += 1;
        setDisplay((prev) => prev + nextChar);
      } else {
        clearInterval(typingInterval.current);
      }
    }, 18);

    return () => clearInterval(typingInterval.current);
  }, [text]);

  return (
    <div
      className="text-gray-800 leading-7 whitespace-pre-line transition-all duration-300 ease-linear will-change-auto md:[font-family:'Homemade_Apple',cursive]"
      style={{ opacity: display ? 1 : 0.6 }}
    >
      {display}
      <span className="animate-pulse text-indigo-400 ml-0.5 select-none">▌</span>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* MAIN COMPONENT                                                        */
/* --------------------------------------------------------------------- */
export default function LabFlow({ id, onMarked }) {
  const [draft, setDraft] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const [message, setMessage] = useState(null);
  const [autoGenRunning, setAutoGenRunning] = useState(false);
  const [autoGenPct, setAutoGenPct] = useState(0);
  const autoGenCancelRef = useRef(false);

  const notebookRef = useRef(null);

  const sectionRefs = {
    title: useRef(null),
    abstract: useRef(null),
    review: useRef(null),
    methodology: useRef(null),
    aims: useRef(null),
    chapterization: useRef(null),
    conclusion: useRef(null),
    assemble: useRef(null),
  };

  async function load() {
    const r = await fetchDraft(id);
    if (r?.ok) setDraft({ ...r.draft, locked: r.locked });
  }
  useEffect(() => {
    load();
  }, [id]);

  function scrollToSection(key) {
    const wrap = notebookRef.current;
    const el = sectionRefs[key]?.current;
    if (wrap && el) {
      const wrapTop = wrap.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      const offset = elTop - wrapTop + wrap.scrollTop - 12;
      wrap.scrollTo({ top: offset, behavior: "smooth" });
    } else if (wrap) {
      wrap.scrollTo({ top: wrap.scrollHeight, behavior: "smooth" });
    }
  }

  async function runStep(k) {
    setBusy(true);

    setDraft((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.locked = true;
      updated.gen = updated.gen || {};
      updated.gen[k] = { text: "System is generating content...", placeholder: true };
      return updated;
    });

    try {
      const r = await genStep(id, k);
      if (r?.ok) {
        setDraft({ ...r.draft, locked: r.locked || true });
        setTimeout(() => {
          setStepIdx((prev) => Math.min(prev + 1, steps.length - 1));
        }, 350);

        if (k === "assemble") {
          setTimeout(() => setShowPay(true), 600);
        }

        setTimeout(() => scrollToSection(k), 400);
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!draft) return;
    if (autoGenRunning) return;
    if (stepIdx === 0 && !draft.gen?.abstract?.text) {
      runStep("abstract");
    }
  }, [draft, autoGenRunning]); // eslint-disable-line

  useEffect(() => {
    if (!draft?._id) return;

    if (
      draft.status === "awaiting_payment" ||
      draft.status === "paid" ||
      draft.status === "approved"
    ) {
      return;
    }

    let mounted = true;
    autoGenCancelRef.current = false;

    async function autoGenerateAll() {
      if (!mounted) return;
      setAutoGenRunning(true);
      setAutoGenPct(0);
      setMessage("⚙️ Auto-generation started — please wait until all steps finish...");

      for (let i = 0; i < steps.length; i++) {
        if (autoGenCancelRef.current) break;
        const step = steps[i];
        setMessage(`⚙️ Please wait, finishing step (${step.title})...`);
        setStepIdx(i);
        scrollToSection(step.key);
        const r = await genStep(draft._id, step.key);
        if (r?.ok) {
          const refreshed = await fetchDraft(draft._id);
          if (refreshed?.ok) setDraft({ ...refreshed.draft, locked: refreshed.locked });
        }
        const pct = Math.round(((i + 1) / steps.length) * 100);
        setAutoGenPct(pct);
        await new Promise((r) => setTimeout(r, 1200));
      }

      if (!autoGenCancelRef.current) {
        setMessage(null);
        setAutoGenRunning(false);
        onMarked && onMarked();
      } else {
        setAutoGenRunning(false);
      }
    }

    autoGenerateAll();

    return () => {
      mounted = false;
      autoGenCancelRef.current = true;
      setAutoGenRunning(false);
    };
  }, [draft?._id, draft?.status, onMarked]);

  useEffect(() => {
    const key = steps[stepIdx]?.key;
    if (key) setTimeout(() => scrollToSection(key), 60);
  }, [stepIdx]);

  function handleNotebookScroll() {
    const el = notebookRef.current;
    if (!el) return;
    const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight || 1)) * 100;
    setScrollPct(pct);
    setShowScrollHint(pct < 90);
  }

  function scrollToLatest() {
    notebookRef.current?.scrollTo({
      top: notebookRef.current.scrollHeight,
      behavior: "smooth",
    });
  }

  const notebookLock = {
    userSelect: "none",
    WebkitUserSelect: "none",
    MozUserSelect: "none",
  };
  const preventContext = (e) => e.preventDefault();

  return (
    <div className="max-w-6xl mx-auto p-3 md:p-6">
      {message && (
        <div className="flex flex-col items-center text-center mb-3">
          <div className="text-xs text-gray-600 animate-pulse">{message}</div>
          {autoGenRunning && (
            <div className="w-full max-w-xs bg-gray-200 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="h-2 bg-indigo-500 rounded-full transition-all"
                style={{ width: `${autoGenPct}%` }}
              />
            </div>
          )}
          {autoGenRunning && (
            <button
              className="mt-2 px-3 py-1 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs"
              onClick={() => {
                autoGenCancelRef.current = true;
                setAutoGenRunning(false);
                setMessage("⏹️ Auto generation cancelled.");
                setTimeout(() => setMessage(null), 2500);
              }}
            >
              ⏹️ Cancel Auto-Generation
            </button>
          )}
        </div>
      )}

      <DesktopProgress stepIdx={stepIdx} />
      <MobileProgress stepIdx={stepIdx} setStepIdx={setStepIdx} />

      <div className="grid md:grid-cols-5 gap-6">
        <div className="hidden md:block md:col-span-2">
          <ActionCard
            stepIdx={stepIdx}
            busy={busy}
            showPay={showPay}
            draft={draft}
            runStep={runStep}
            reload={load}
          />
        </div>

        <div className="md:col-span-3 relative">
          <div
            ref={notebookRef}
            onScroll={handleNotebookScroll}
            onContextMenu={preventContext}
            style={notebookLock}
            className="p-5 border rounded-2xl bg-[rgba(253,253,250,0.96)] shadow-inner max-h-[78vh] md:max-h-[80vh] overflow-y-auto"
          >
            <div ref={sectionRefs.title}>
              {sectionBlock("Title", draft?.gen?.title || draft?.title || "", draft)}
            </div>
            {draft?.gen?.abstract?.text && (
              <div ref={sectionRefs.abstract}>
                {sectionBlock("Put your Abstract", draft.gen.abstract.text, draft)}
              </div>
            )}
            {draft?.gen?.review?.text && (
              <div ref={sectionRefs.review}>
                {sectionBlock("Review of Literature", draft.gen.review.text, draft)}
              </div>
            )}
            {draft?.gen?.methodology?.text && (
              <div ref={sectionRefs.methodology}>
                {sectionBlock("Research Methodology", draft.gen.methodology.text, draft)}
              </div>
            )}
            {draft?.gen?.aims?.text && (
              <div ref={sectionRefs.aims}>
                {sectionBlock("Aim of Research", draft.gen.aims.text, draft)}
              </div>
            )}
            {draft?.gen?.chapterization?.text && (
              <div ref={sectionRefs.chapterization}>
                {sectionBlock("Chapterization", draft.gen.chapterization.text, draft)}
              </div>
            )}
            {draft?.gen?.conclusion?.text && (
              <div ref={sectionRefs.conclusion}>
                {sectionBlock("Conclusion", draft.gen.conclusion.text, draft)}
              </div>
            )}
            {draft?.gen?.assembled?.text && (
              <div ref={sectionRefs.assemble}>
                {sectionBlock("Final Preview", draft.gen.assembled.text, draft)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

 /* --------------------------------------------------------------------- */
/* sectionBlock                                                          */
/* --------------------------------------------------------------------- */
function sectionBlock(title, body, draft) {
  const isLocked = draft?.locked;
  const isGenerating = body?.includes("System is generating");

  // ✅ Allow "Title" and "Put your Abstract" to stay visible even when locked
  const forceUnlocked = title === "Title" || title === "Put your Abstract";

  return (
    <div className="mb-6 relative animate-fadeIn">
      <div className="font-semibold text-black mb-1">{title}</div>

      <div className="relative">
        <div
          className="bg-white/95 border border-gray-200 rounded-xl p-3 md:p-4 shadow-sm min-h-[80px]"
        >
          {isGenerating ? (
            <div className="text-gray-400 italic animate-pulse">
              System is generating...
            </div>
          ) : isLocked && !forceUnlocked ? (
            // 🟣 Shimmer placeholder (blur locked content)
            <div className="relative overflow-hidden rounded-xl select-none pointer-events-none">
              <div className="h-[90px] md:h-[110px] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse rounded-lg" />
            </div>
          ) : (
            // 🧠 Keep full live typing animation for visible/unlocked parts
            <Typewriter text={body || ""} />
          )}
        </div>

        {/* 🔒 Show lock overlay for all except Title & Abstract */}
        {isLocked && !forceUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[2px] rounded-xl">
            <span className="text-[11px] md:text-sm text-gray-700 bg-white/90 px-3 py-1 rounded-full shadow">
              🔒 Unlock this section after payment
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* DesktopProgress                                                       */
/* --------------------------------------------------------------------- */
function DesktopProgress({ stepIdx }) {
  const pct = ((stepIdx + 1) / steps.length) * 100;
  return (
    <div className="hidden md:block sticky top-0 z-20 mb-5">
      <div className="bg-white/90 backdrop-blur-md border rounded-2xl shadow-sm px-4 py-3">
        <div className="flex flex-wrap gap-3 items-center justify-center">
          {steps.map((s, idx) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  idx <= stepIdx ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {idx + 1}
              </div>
              <span
                className={`text-sm ${
                  idx <= stepIdx ? "text-emerald-700" : "text-gray-500"
                }`}
              >
                {s.title}
              </span>
              {idx < steps.length - 1 && (
                <div
                  className={`w-10 h-[2px] rounded-full ${
                    idx < stepIdx ? "bg-emerald-400" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="h-1 w-full bg-gray-200 rounded-full mt-2 overflow-hidden">
        <div
          className="h-1 bg-indigo-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* MobileProgress                                                        */
/* --------------------------------------------------------------------- */
function MobileProgress({ stepIdx, setStepIdx }) {
  const trackRef = useRef(null);
  const stepRefs = useRef([]);

  useEffect(() => {
    const el = stepRefs.current[stepIdx];
    const container = trackRef.current;
    if (el && container) {
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offset =
        elRect.left - containerRect.left - containerRect.width / 2 + elRect.width / 2;
      container.scrollBy({ left: offset, behavior: "smooth" });
    }
  }, [stepIdx]);

  return (
    <div className="md:hidden sticky top-0 z-20 bg-white/95 py-2 mb-3">
      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto no-scrollbar px-1 scroll-smooth"
      >
        {steps.map((s, idx) => (
          <button
            key={s.key}
            ref={(el) => (stepRefs.current[idx] = el)}
            onClick={() => setStepIdx(idx)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs shrink-0 transition-all ${
              idx === stepIdx
                ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm"
                : "bg-white border-gray-200 text-gray-500"
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold bg-white border mr-1">
              {idx + 1}
            </span>
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* GenerateButton                                                        */
/* --------------------------------------------------------------------- */
function GenerateButton({ busy, stepIdx, runStep }) {
  const stepTitle = steps[stepIdx]?.title || "";
  return (
    <button
      disabled={busy}
      onClick={() => runStep(steps[stepIdx].key)}
      className={`relative w-full px-4 py-3 rounded-xl text-white font-medium overflow-hidden transition-all ${
        busy ? "cursor-wait" : "hover:scale-[1.02] hover:shadow-md"
      }`}
    >
      <span
        className={`absolute inset-0 transition-all duration-700 ${
          busy ? "animate-[fill_3s_linear_infinite]" : ""
        }`}
        style={{
          background:
            "linear-gradient(180deg, rgba(99,102,241,0.9) 0%, rgba(129,140,248,1) 100%)",
          zIndex: 0,
        }}
      />
      <span className="relative z-10 flex justify-center items-center gap-2 text-center">
        {busy ? "System is writing..." : `Generate next step: ${stepTitle}`}
      </span>
      <style>
        {`
          @keyframes fill {
            0% { transform: translateY(100%); }
            50% { transform: translateY(0%); }
            100% { transform: translateY(100%); }
          }
        `}
      </style>
    </button>
  );
}

/* --------------------------------------------------------------------- */
/* ActionCard (desktop)                                                  */
/* --------------------------------------------------------------------- */
function ActionCard({ stepIdx, busy, showPay, draft, runStep, reload }) {
  return (
    <div className="p-4 border rounded-2xl bg-white shadow-sm sticky top-24">
      <div className="text-lg font-semibold mb-2">
        Step {stepIdx + 1}: {steps[stepIdx].title}
      </div>
      <GenerateButton busy={busy} stepIdx={stepIdx} runStep={runStep} />
      <p className="mt-3 text-xs text-gray-500 leading-snug">
        The system writes step-by-step. Tracking is synced — it will scroll to the step.
      </p>

      {showPay && (
        <div className="mt-6 p-3 rounded-xl border bg-amber-50 shadow-inner">
          <div className="font-semibold mb-2">Final Step: Payment</div>
          <PayBox draft={draft} onMarked={reload} />

          {!draft?.locked && (
            <div className="mt-3 flex gap-2">
              <a
                href={`/api/research-drafting/${draft._id}/export?fmt=pdf`}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs md:text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download PDF
              </a>
              <a
                href={`/api/research-drafting/${draft._id}/export?fmt=docx`}
                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs md:text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download Word
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* MobileGenerateFAB                                                     */
/* --------------------------------------------------------------------- */
function MobileGenerateFAB({ stepIdx, busy, showPay, draft, runStep, reload }) {
  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="w-60">
        <GenerateButton busy={busy} stepIdx={stepIdx} runStep={runStep} />
      </div>
      {showPay && (
        <div className="bg-amber-50 border rounded-xl p-2 shadow w-60">
          <div className="text-xs font-semibold mb-1">Final Step: Payment</div>
          <PayBox draft={draft} onMarked={reload} />
          {!draft?.locked && (
            <div className="mt-2 flex gap-2">
              <a
                href={`/api/research-drafting/${draft._id}/export?fmt=pdf`}
                className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-[11px]"
                target="_blank"
                rel="noopener noreferrer"
              >
                PDF
              </a>
              <a
                href={`/api/research-drafting/${draft._id}/export?fmt=docx`}
                className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[11px]"
                target="_blank"
                rel="noopener noreferrer"
              >
                Word
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* --------------------------------------------------------------------- */
/* PayBox (with waiting + polling + resume + minimize)                   */
/* --------------------------------------------------------------------- */
function PayBox({ draft, onMarked }) {
  const amount = draft?.payment?.amount || 299;
  const upiId = draft?.payment?.upiId || "lawnetwork@upi";
  const wa = draft?.payment?.waNumber || "919999999999";
  const alreadyUnlocked =
    draft?.status === "paid" || draft?.status === "approved" || draft?.locked === false;

  const storageKey = draft ? `rd:waiting:${draft._id}` : null;
  const [upiDone, setUpiDone] = useState(false);
  const [waDone, setWaDone] = useState(false);
  const [waiting, setWaiting] = useState(() =>
    storageKey ? localStorage.getItem(storageKey) === "1" : false
  );
  const [countdown, setCountdown] = useState(15);
  const [polling, setPolling] = useState(waiting);
  const [shake, setShake] = useState(false);
  const [minimized, setMinimized] = useState(false); // ✅ new line

  const upiLink = `upi://pay?pa=${encodeURIComponent(
    upiId
  )}&pn=${encodeURIComponent("LawNetwork")}&am=${encodeURIComponent(
    amount
  )}&cu=INR&tn=${encodeURIComponent("Research Drafting")}`;

  const waLink = `https://wa.me/${wa}?text=${encodeURIComponent(
    `Hi, I am ${draft?.name || ""}. I am sending payment proof for Research Drafting (₹${amount}).`
  )}`;

  async function confirmPaidAndSent() {
    if (!upiDone || !waDone) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    await markPaid(draft._id, {
      userMarkedPaid: true,
      upiConfirmed: true,
      whatsappConfirmed: true,
    });

    if (storageKey) localStorage.setItem(storageKey, "1");
    setWaiting(true);
    setCountdown(15);
    setPolling(true);
    onMarked && onMarked();
  }

  // polling for admin approval
  useEffect(() => {
    if (!polling || !draft?._id) return;

    let cancelled = false;
    let timerId = null;

    async function tick() {
      try {
        const latest = await fetchDraft(draft._id);
        if (cancelled) return;

        const unlocked =
          latest?.draft?.status === "paid" || latest?.draft?.status === "approved";
        if (unlocked) {
          if (storageKey) localStorage.removeItem(storageKey);
          setWaiting(false);
          setPolling(false);
          onMarked && onMarked();
          return;
        }
      } catch (e) {
        // ignore
      }

      timerId = setTimeout(tick, countdown > 0 ? 3000 : 8000);
      setCountdown((c) => (c > 0 ? c - 3 : 0));
    }
    tick();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [polling, draft?._id, countdown]);

  // if unlocked, clear local waiting
  useEffect(() => {
    if (alreadyUnlocked && storageKey) {
      localStorage.removeItem(storageKey);
      setWaiting(false);
      setPolling(false);
    }
  }, [alreadyUnlocked, storageKey]);

  /* ✅ NEW: floating minimized button (when unlocked & minimized) */
  if (alreadyUnlocked && minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg cursor-pointer animate-pulse z-50"
      >
        💾 Download PDF
      </div>
    );
  }

  return (
     <div
    className={`space-y-2 text-xs md:text-sm transform transition-all duration-500 ease-in-out ${
      minimized ? "translate-y-96 opacity-0 scale-95" : "translate-y-0 opacity-100 scale-100"
    }`}
  >
      <div>
        Amount: <b>₹{amount}</b> • UPI: <code>{upiId}</code>
      </div>

      {/* 1️⃣ Pay buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`px-3 py-1.5 rounded-lg text-xs text-white ${
            upiDone ? "bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
          onClick={() => {
            window.location.href = upiLink;
            setUpiDone(true);
          }}
        >
          {upiDone ? "✓ UPI Paid" : "UPI Pay"}
        </button>

        <button
          className={`px-3 py-1.5 rounded-lg text-xs text-white ${
            waDone ? "bg-indigo-700" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
          onClick={() => {
            window.open(waLink, "_blank");
            setWaDone(true);
          }}
        >
          {waDone ? "✓ WhatsApp Sent" : "WhatsApp Proof"}
        </button>
      </div>

      {/* 2️⃣ Confirm */}
      {!alreadyUnlocked && !waiting && (
        <button
          onClick={confirmPaidAndSent}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-300 text-yellow-900 transition-transform ${
            shake ? "animate-[wiggle_0.6s_ease-in-out]" : "hover:bg-yellow-400"
          }`}
        >
          I paid and sent screenshot of my payment on WhatsApp
        </button>
      )}

      {/* 3️⃣ Waiting */}
      {waiting && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
          <span className="text-[11px] text-yellow-800">
            Waiting for admin approval
            {countdown > 0 ? ` • checking in ${countdown}s` : " • still checking..."}
          </span>
        </div>
      )}

      {/* 4️⃣ Unlocked (with Minimize button) */}
      {alreadyUnlocked && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <div className="flex justify-between items-center">
            <span className="text-green-700 text-xs">
              ✅ Approved — content unlocked. You can now view and download your file.
            </span>
            <button
              onClick={() => setMinimized(true)}
              className="text-[10px] text-green-600 underline animate-pulse"
            >
              Minimize
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            <a
              href={`/api/research-drafting/${draft._id}/export?fmt=pdf`}
              className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs"
              target="_blank"
              rel="noopener noreferrer"
            >
              PDF
            </a>
            <a
              href={`/api/research-drafting/${draft._id}/export?fmt=docx`}
              className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs"
              target="_blank"
              rel="noopener noreferrer"
            >
              Word
            </a>
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-500">
        {alreadyUnlocked
          ? "You have full access now."
          : "Step 1: UPI Pay • Step 2: WhatsApp Proof • Step 3: Confirm payment below."}
      </p>
    </div>
  );
}
