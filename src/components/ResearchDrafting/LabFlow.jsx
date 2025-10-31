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

/* ---------- Typewriter ---------- */
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

  // font-handwriting only for md+ screens (mobile uses normal font)
  return (
    <div className="text-gray-800 leading-7 whitespace-pre-line md:[font-family:'Homemade_Apple',cursive] transition-all">
      {out}
    </div>
  );
}

export default function LabFlow({ id }) {
  const [draft, setDraft] = useState(null);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const wrapRef = useRef(null);

  /* ---------- Load draft on mount ---------- */
  async function load() {
    const r = await fetchDraft(id);
    if (r?.ok) setDraft(r.draft);
  }
  useEffect(() => {
    load();
  }, [id]);

  /* ---------- Generate a step ---------- */
  async function runStep(k) {
    setBusy(true);
    try {
      const r = await genStep(id, k);
      if (r?.ok) {
        setDraft(r.draft);
        setTimeout(
          () => setI((s) => Math.min(s + 1, steps.length - 1)),
          400
        );
        if (k === "assemble") {
          setTimeout(() => setShowPay(true), 600);
        }
        // scroll to notebook
        setTimeout(() => {
          wrapRef.current?.scrollTo({
            top: wrapRef.current.scrollHeight,
            behavior: "smooth",
          });
        }, 450);
      }
    } finally {
      setBusy(false);
    }
  }

  /* ---------- Auto-start first step if empty ---------- */
  useEffect(() => {
    if (!draft) return;
    if (i === 0 && !draft.gen?.abstract?.text) {
      runStep("abstract");
    }
    // eslint-disable-next-line
  }, [draft]);

  /* ---------- Auto-scroll on step change ---------- */
  useEffect(() => {
    if (!wrapRef.current) return;
    wrapRef.current.scrollTo({
      top: wrapRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [i]);

  /* ---------- Scroll progress inside notebook ---------- */
  function onScrollNotebook() {
    const el = wrapRef.current;
    if (!el) return;
    const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight || 1)) * 100;
    setScrollPct(Math.min(100, Math.max(0, pct)));
  }

  /* ---------- Sticky progress tracker ---------- */
  function ProgressTracker() {
    const progressPct = ((i + 1) / steps.length) * 100;
    return (
      <div className="sticky top-0 z-20 mb-4">
        <div className="bg-white/90 backdrop-blur-md border rounded-2xl shadow-sm px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 justify-center">
            {steps.map((s, idx) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold transition-all ${
                    idx <= i ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`text-xs md:text-sm ${
                    idx <= i ? "text-emerald-700" : "text-gray-500"
                  }`}
                >
                  {s.title}
                </span>
                {idx < steps.length - 1 && (
                  <div
                    className={`w-8 md:w-10 h-[2px] rounded-full ${
                      idx < i ? "bg-emerald-400" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        {/* thin animated progress bar */}
        <div className="h-1 w-full bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div
            className="h-1 bg-indigo-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    );
  }

  /* ---------- Section renderer ---------- */
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

  const notebookLock = {
    userSelect: "none",
    WebkitUserSelect: "none",
    MozUserSelect: "none",
  };
  function preventContext(e) {
    e.preventDefault();
  }

  /* ---------- MAIN RETURN ---------- */
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <ProgressTracker />

      <div className="grid md:grid-cols-5 gap-6">
        {/* ----- LEFT: action card (desktop) ----- */}
        <div className="md:col-span-2 hidden md:block">
          <ActionCard
            stepIdx={i}
            busy={busy}
            showPay={showPay}
            draft={draft}
            runStep={runStep}
            reload={load}
          />
        </div>

        {/* ----- RIGHT: notebook ----- */}
        <div className="md:col-span-3 relative">
          <div
            ref={wrapRef}
            onScroll={onScrollNotebook}
            onContextMenu={preventContext}
            style={notebookLock}
            className="p-5 border rounded-2xl bg-[rgba(253,253,250,0.96)] shadow-inner overflow-y-auto max-h-[78vh] md:max-h-[80vh] transition-all"
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

          {/* scroll progress rail on the right of notebook */}
          <div className="hidden md:block absolute top-5 -right-3 h-[80%] w-1 bg-gray-200 rounded-full">
            <div
              className="w-1 bg-indigo-500 rounded-full transition-all"
              style={{ height: `${scrollPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ----- MOBILE sticky action bar ----- */}
      <div className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 w-[95%]">
        <MobileActionBar
          stepIdx={i}
          busy={busy}
          showPay={showPay}
          draft={draft}
          runStep={runStep}
          reload={load}
        />
      </div>
    </div>
  );
}

/* =========================================
   ACTION CARD (desktop)
   ========================================= */
function ActionCard({ stepIdx, busy, showPay, draft, runStep, reload }) {
  return (
    <div className="p-4 border rounded-2xl bg-white shadow-sm sticky top-24">
      <div className="text-lg font-semibold mb-2">
        Step {stepIdx + 1}: {steps[stepIdx].title}
      </div>
      <button
        disabled={busy}
        onClick={() => runStep(steps[stepIdx].key)}
        className={`w-full px-4 py-3 rounded-xl text-white font-medium transition-all transform ${
          busy
            ? "bg-indigo-300 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:scale-[1.01] animate-[pulse_2.1s_ease-in-out_infinite]"
        }`}
      >
        {busy
          ? "Working..."
          : stepIdx === steps.length - 1
          ? "Re-Assemble Preview"
          : "Generate this step"}
      </button>
      <p className="mt-3 text-xs text-gray-500 leading-snug">
        The system writes in a typewriting, handwriting-feel container.
        Auto-scroll follows new content. Tap next to move ahead.
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

/* =========================================
   MOBILE ACTION BAR
   ========================================= */
function MobileActionBar({ stepIdx, busy, showPay, draft, runStep, reload }) {
  return (
    <div className="bg-white/95 backdrop-blur-md border rounded-2xl shadow-lg p-3 flex flex-col gap-2">
      <div className="text-sm font-semibold">
        Step {stepIdx + 1}: {steps[stepIdx].title}
      </div>
      <button
        disabled={busy}
        onClick={() => runStep(steps[stepIdx].key)}
        className={`w-full px-4 py-2.5 rounded-xl text-white font-medium transition-all ${
          busy
            ? "bg-indigo-300"
            : "bg-indigo-600 hover:bg-indigo-700 animate-[pulse_2.1s_ease-in-out_infinite]"
        }`}
      >
        {busy
          ? "Working..."
          : stepIdx === steps.length - 1
          ? "Re-Assemble Preview"
          : "Generate this step"}
      </button>

      {showPay && (
        <div className="mt-2 p-2 rounded-xl border bg-amber-50">
          <div className="text-xs font-semibold mb-1">Final Step: Payment</div>
          <PayBox draft={draft} onMarked={reload} />
        </div>
      )}
    </div>
  );
}

/* =========================================
   PAYMENT BOX
   ========================================= */
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
    <div className="space-y-2 text-sm">
      <div className="text-gray-700">
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
          className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
          onClick={mark}
        >
          I Paid — Mark
        </button>
      </div>
      <p className="text-[10px] text-gray-500">
        Admin will verify and approve access.
      </p>
    </div>
  );
}
