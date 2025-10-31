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

/* ---------------- Typewriter ---------------- */
function Typewriter({ text = "" }) {
  const [out, setOut] = useState("");

  useEffect(() => {
    setOut("");
    let i = 0;
    const t = setInterval(() => {
      setOut((prev) => prev + text.slice(i, i + 2));
      i += 2;
      if (i >= text.length) clearInterval(t);
    }, 12);
    return () => clearInterval(t);
  }, [text]);

  return (
    <div
      className="
        text-gray-800 leading-7 whitespace-pre-line
        md:[font-family:'Homemade_Apple',cursive]
      "
    >
      {out}
    </div>
  );
}

export default function LabFlow({ id }) {
  const [draft, setDraft] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const notebookRef = useRef(null);

  /* -------- load draft -------- */
  async function load() {
    const r = await fetchDraft(id);
    if (r?.ok) setDraft(r.draft);
  }
  useEffect(() => {
    load();
  }, [id]);

  /* -------- run step -------- */
  async function runStep(k) {
    setBusy(true);
    try {
      const r = await genStep(id, k);
      if (r?.ok) {
        setDraft(r.draft);
        // move to next visual step
        setTimeout(() => {
          setStepIdx((s) => Math.min(s + 1, steps.length - 1));
        }, 350);
        // payment open on assemble
        if (k === "assemble") {
          setTimeout(() => setShowPay(true), 600);
        }
        // scroll to bottom to reveal fresh content
        setTimeout(() => {
          if (!notebookRef.current) return;
          notebookRef.current.scrollTo({
            top: notebookRef.current.scrollHeight,
            behavior: "smooth",
          });
        }, 400);
      }
    } finally {
      setBusy(false);
    }
  }

  /* -------- auto-run first step if empty -------- */
  useEffect(() => {
    if (!draft) return;
    if (stepIdx === 0 && !draft.gen?.abstract?.text) {
      runStep("abstract");
    }
    // eslint-disable-next-line
  }, [draft]);

  /* -------- notebook scroll progress -------- */
  function handleNotebookScroll() {
    const el = notebookRef.current;
    if (!el) return;
    const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight || 1)) * 100;
    setScrollPct(pct);
    // show "scroll to latest" if user is not near bottom
    setShowScrollHint(pct < 90);
  }

  /* -------- mobile scroll-to-bottom button -------- */
  function scrollToLatest() {
    if (!notebookRef.current) return;
    notebookRef.current.scrollTo({
      top: notebookRef.current.scrollHeight,
      behavior: "smooth",
    });
  }

  /* ---------------- Progress (desktop) ---------------- */
  function DesktopProgress() {
    const pct = ((stepIdx + 1) / steps.length) * 100;
    return (
      <div className="hidden md:block sticky top-0 z-20 mb-5">
        <div className="bg-white/90 backdrop-blur-md border rounded-2xl shadow-sm px-4 py-3">
          <div className="flex flex-wrap gap-3 items-center justify-center">
            {steps.map((s, idx) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx <= stepIdx
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 text-gray-600"
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

  /* ---------------- Progress (mobile) ---------------- */
  function MobileProgress() {
    return (
      <div className="md:hidden sticky top-0 z-20 bg-white/95 py-2 mb-3">
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-1">
          {steps.map((s, idx) => (
            <button
              key={s.key}
              onClick={() => setStepIdx(idx)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs shrink-0 ${
                idx === stepIdx
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
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

  /* ---------------- Section block ---------------- */
  function sectionBlock(title, body) {
    return (
      <div className="mb-6 animate-fadeIn">
        <div className="font-semibold text-black mb-1">{title}</div>
        <div className="bg-white/95 border border-gray-200 rounded-xl p-3 md:p-4 shadow-sm">
          <Typewriter text={body || ""} />
        </div>
      </div>
    );
  }

  /* --------- prevent copy (as in your original idea) --------- */
  const notebookLock = {
    userSelect: "none",
    WebkitUserSelect: "none",
    MozUserSelect: "none",
  };
  function preventContext(e) {
    e.preventDefault();
  }

  return (
    <div className="max-w-6xl mx-auto p-3 md:p-6">
      <DesktopProgress />
      <MobileProgress />

      <div className="grid md:grid-cols-5 gap-6">
        {/* LEFT (desktop) */}
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

        {/* RIGHT (notebook) */}
        <div className="md:col-span-3 relative">
          <div
            ref={notebookRef}
            onScroll={handleNotebookScroll}
            onContextMenu={preventContext}
            style={notebookLock}
            className="
              p-5 border rounded-2xl bg-[rgba(253,253,250,0.96)] shadow-inner
              max-h-[78vh] md:max-h-[80vh] overflow-y-auto
            "
          >
            <div className="text-[15px] text-gray-800 leading-7">
              {sectionBlock("Title", draft?.gen?.title || draft?.title || "")}
              {draft?.gen?.abstract?.text &&
                sectionBlock("Put your Abstract", draft.gen.abstract.text)}
              {draft?.gen?.review?.text &&
                sectionBlock("Review of Literature", draft.gen.review.text)}
              {draft?.gen?.methodology?.text &&
                sectionBlock(
                  "Research Methodology",
                  draft.gen.methodology.text
                )}
              {draft?.gen?.aims?.text &&
                sectionBlock("Aim of Research", draft.gen.aims.text)}
              {draft?.gen?.chapterization?.text &&
                sectionBlock(
                  "Chapterization",
                  draft.gen.chapterization.text
                )}
              {draft?.gen?.conclusion?.text &&
                sectionBlock("Conclusion", draft.gen.conclusion.text)}
              {draft?.gen?.assembled?.text &&
                sectionBlock("Final Preview", draft.gen.assembled.text)}
            </div>
          </div>

          {/* scroll rail (desktop only) */}
          <div className="hidden md:block absolute top-6 -right-3 h-[78vh] w-1 bg-gray-200 rounded-full">
            <div
              className="w-1 bg-indigo-500 rounded-full transition-all"
              style={{ height: `${scrollPct}%` }}
            />
          </div>

          {/* mobile scroll-to-latest helper */}
          {showScrollHint && (
            <button
              onClick={scrollToLatest}
              className="md:hidden absolute right-3 bottom-24 bg-white/90 border rounded-full px-3 py-1 text-xs shadow"
            >
              Scroll to latest ↓
            </button>
          )}
        </div>
      </div>

      {/* MOBILE floating action button */}
      <div className="md:hidden fixed bottom-3 right-3 left-3 flex justify-end pointer-events-none">
        <div className="pointer-events-auto">
          <MobileGenerateFAB
            stepIdx={stepIdx}
            busy={busy}
            showPay={showPay}
            draft={draft}
            runStep={runStep}
            reload={load}
          />
        </div>
      </div>
    </div>
  );
}

/* =================== DESKTOP ACTION CARD =================== */
function ActionCard({ stepIdx, busy, showPay, draft, runStep, reload }) {
  return (
    <div className="p-4 border rounded-2xl bg-white shadow-sm sticky top-24">
      <div className="text-lg font-semibold mb-2">
        Step {stepIdx + 1}: {steps[stepIdx].title}
      </div>
      <button
        disabled={busy}
        onClick={() => runStep(steps[stepIdx].key)}
        className={`w-full px-4 py-3 rounded-xl text-white font-medium transition-all ${
          busy
            ? "bg-indigo-300 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700 animate-[pulse_2s_ease-in-out_infinite]"
        }`}
      >
        {busy
          ? "Working..."
          : stepIdx === steps.length - 1
          ? "Re-Assemble Preview"
          : "Generate this step"}
      </button>
      <p className="mt-3 text-xs text-gray-500 leading-snug">
        The system writes step-by-step. You can always go back to edit intake.
      </p>

      {showPay && (
        <div className="mt-6 p-3 rounded-xl border bg-amber-50 shadow-inner">
          <div className="font-semibold mb-2">Final Step: Payment</div>
          <PayBox draft={draft} onMarked={reload} />
        </div>
      )}
    </div>
  );
}

/* =================== MOBILE FAB =================== */
function MobileGenerateFAB({
  stepIdx,
  busy,
  showPay,
  draft,
  runStep,
  reload,
}) {
  return (
    <div className="flex flex-col gap-2 items-end">
      <button
        disabled={busy}
        onClick={() => runStep(steps[stepIdx].key)}
        className={`px-5 py-3 rounded-full shadow-lg text-white text-sm font-semibold flex items-center gap-2 ${
          busy
            ? "bg-indigo-300"
            : "bg-indigo-600 animate-[pulse_2s_ease-in-out_infinite]"
        }`}
      >
        {busy ? "Working..." : "Generate this step"}
      </button>
      {showPay && (
        <div className="bg-amber-50 border rounded-xl p-2 shadow w-60">
          <div className="text-xs font-semibold mb-1">Final Step: Payment</div>
          <PayBox draft={draft} onMarked={reload} />
        </div>
      )}
    </div>
  );
}

/* =================== PAYMENT BOX =================== */
function PayBox({ draft, onMarked }) {
  const amount = draft?.payment?.amount || 299;
  const upiId = draft?.payment?.upiId || "lawnetwork@upi";
  const wa = draft?.payment?.waNumber || "919999999999";

  const upiLink = `upi://pay?pa=${encodeURIComponent(
    upiId
  )}&pn=${encodeURIComponent(
    "LawNetwork"
  )}&am=${encodeURIComponent(amount)}&cu=INR&tn=${encodeURIComponent(
    "Research Drafting"
  )}`;
  const waLink = `https://wa.me/${wa}?text=${encodeURIComponent(
    `Hi, I am ${draft?.name || ""}. I am sending payment proof for Research Drafting (Amount: ₹${amount}).`
  )}`;

  async function mark() {
    await markPaid(draft._id, {
      name: draft?.name,
      email: draft?.email,
      phone: draft?.phone,
    });
    onMarked && onMarked();
  }

  return (
    <div className="space-y-2 text-xs md:text-sm">
      <div>
        Amount: <b>₹{amount}</b> • UPI: <code>{upiId}</code>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
          href={upiLink}
        >
          UPI Pay
        </a>
        <a
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          href={waLink}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp Proof
        </a>
        <button
          className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-xs"
          onClick={mark}
        >
          I Paid — Mark
        </button>
      </div>
      <p className="text-[10px] text-gray-500">
        Admin will verify your proof and approve access.
      </p>
    </div>
  );
}
