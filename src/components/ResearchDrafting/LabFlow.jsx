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

function Typewriter({ text = "" }) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    let i = 0;
    const t = setInterval(() => {
      setOut((p) => p + text.slice(i, i + 2));
      i += 2;
      if (i >= text.length) clearInterval(t);
    }, 15);
    return () => clearInterval(t);
  }, [text]);

  return (
    <div
      className="leading-7 text-gray-800 animate-fadeIn"
      style={{
        fontFamily:
          window.innerWidth < 640
            ? "Inter, sans-serif"
            : '"Homemade Apple", cursive',
        transition: "all 0.3s ease",
      }}
    >
      {out}
    </div>
  );
}

export default function LabFlow({ id }) {
  const [draft, setDraft] = useState(null);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const containerRef = useRef(null);

  async function load() {
    const r = await fetchDraft(id);
    if (r?.ok) setDraft(r.draft);
  }
  useEffect(() => {
    load();
  }, [id]);

  async function runStep(k) {
    setBusy(true);
    try {
      const r = await genStep(id, k);
      if (r?.ok) {
        setDraft(r.draft);
        setTimeout(() => {
          setI((s) => Math.min(s + 1, steps.length - 1));
          containerRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 400);
        if (k === "assemble") setTimeout(() => setShowPay(true), 700);
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!draft) return;
    if (i === 0 && !draft.gen?.abstract?.text) runStep("abstract");
    // eslint-disable-next-line
  }, [draft]);

  function sectionBlock(title, body) {
    return (
      <div className="mb-6 transition-all duration-300 hover:scale-[1.01]">
        <h3 className="font-semibold text-black mb-1">{title}</h3>
        <div className="bg-white/90 rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md">
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

  return (
    <div
      className="max-w-6xl mx-auto p-4 md:p-6 space-y-6"
      ref={containerRef}
    >
      {/* Progress tracker */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {steps.map((s, idx) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                idx < i
                  ? "bg-emerald-600 text-white"
                  : idx === i
                  ? "bg-indigo-600 text-white scale-110 shadow-lg"
                  : "bg-gray-300 text-gray-700"
              }`}
            >
              {idx + 1}
            </div>
            <div
              className={`text-sm whitespace-nowrap ${
                idx <= i ? "text-indigo-700" : "text-gray-500"
              }`}
            >
              {s.title}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`w-10 h-1 rounded-full transition-all ${
                  idx < i ? "bg-indigo-400" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Left column — actions */}
        <div className="md:col-span-2">
          <div className="p-5 border rounded-2xl bg-white sticky top-4 shadow-sm">
            <div className="text-lg font-semibold mb-3">
              Step {i + 1}: {steps[i].title}
            </div>
            <button
              disabled={busy}
              onClick={() => runStep(steps[i].key)}
              className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                busy
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-md text-white"
              }`}
            >
              {busy
                ? "Working..."
                : i === steps.length - 1
                ? "Re-Assemble Preview"
                : "Generate this Step"}
            </button>
            <p className="mt-3 text-xs text-gray-500">
              The system writes automatically with a typewriting animation.{" "}
              <br />
              You can return anytime to edit your intake.
            </p>

            {showPay && (
              <div className="mt-6 p-4 rounded-xl border bg-amber-50 shadow-sm">
                <h4 className="font-semibold mb-2 text-amber-800">
                  Final Step: Payment
                </h4>
                <PayBox draft={draft} onMarked={load} />
              </div>
            )}
          </div>
        </div>

        {/* Right column — notebook preview */}
        <div className="md:col-span-3">
          <div
            onContextMenu={preventContext}
            style={notebookLock}
            className="p-5 border rounded-2xl bg-[rgba(253,253,250,0.9)] shadow relative overflow-hidden animate-fadeIn"
          >
            <div className="text-[15px] text-gray-800 leading-7 space-y-4">
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
        </div>
      </div>
    </div>
  );
}

/* ---------- Payment Box ---------- */
function PayBox({ draft, onMarked }) {
  const amount = draft?.payment?.amount || 299;
  const upiId = draft?.payment?.upiId || "lawnetwork@upi";
  const wa = draft?.payment?.waNumber || "919999999999";

  const upiLink = `upi://pay?pa=${encodeURIComponent(
    upiId
  )}&pn=${encodeURIComponent("LawNetwork")}&am=${encodeURIComponent(
    amount
  )}&cu=INR&tn=${encodeURIComponent("Research Drafting")}`;
  const waLink = `https://wa.me/${wa}?text=${encodeURIComponent(
    `Hi, I am ${draft?.name || ""}. Sending payment proof for Research Drafting (₹${amount}).`
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
    <div className="space-y-3">
      <div className="text-sm text-gray-700">
        Amount: <b>₹{amount}</b> • UPI: <code>{upiId}</code>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
          href={upiLink}
        >
          UPI Pay (prefilled)
        </a>
        <a
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all"
          href={waLink}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp Proof
        </a>
        <button
          className="px-4 py-2 rounded-xl border hover:bg-gray-100 transition-all"
          onClick={mark}
        >
          I Paid — Mark & Submit
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Admin will verify your proof and approve access in dashboard.
      </p>
    </div>
  );
}
