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
      setOut((prev) => prev + text.slice(i, i + 2)); // faster typing
      i += 2;
      if (i >= text.length) clearInterval(t);
    }, 12);
    return () => clearInterval(t);
  }, [text]);

  // ✅ fixed font declaration (Option A)
  return (
    <div
      style={{ fontFamily: '"Homemade Apple", cursive' }}
      className="text-gray-800 leading-7"
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
  const wrapRef = useRef(null);

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
        setTimeout(() => setI((s) => Math.min(s + 1, steps.length - 1)), 450);
        if (k === "assemble") setTimeout(() => setShowPay(true), 600);
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
      <div className="mb-6">
        <div className="font-bold text-black mb-1">{title}</div>
        <div className="bg-white/90 rounded-xl border p-3">
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
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {steps.map((s, idx) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                idx <= i ? "bg-emerald-600" : "bg-gray-300"
              }`}
            >
              {idx + 1}
            </div>
            <div
              className={`text-sm ${
                idx <= i ? "text-emerald-700" : "text-gray-500"
              }`}
            >
              {s.title}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`w-10 h-1 rounded-full ${
                  idx < i ? "bg-emerald-400" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Left side: generate buttons */}
        <div className="md:col-span-2">
          <div className="p-4 border rounded-2xl bg-white sticky top-4">
            <div className="text-lg font-semibold mb-2">
              Step {i + 1}: {steps[i].title}
            </div>
            <button
              disabled={busy}
              onClick={() => runStep(steps[i].key)}
              className="w-full px-4 py-3 rounded-xl bg-indigo-600 text-white disabled:opacity-50"
            >
              {busy
                ? "Working..."
                : i === steps.length - 1
                ? "Re-Assemble Preview"
                : "Generate this step"}
            </button>
            <div className="mt-3 text-xs text-gray-500">
              The system writes in a typewriting, handwriting-feel container.
              You can go back in browser to edit intake and return.
            </div>

            {showPay && (
              <div className="mt-6 p-3 rounded-xl border bg-amber-50">
                <div className="font-semibold mb-2">
                  Final Step: Payment
                </div>
                <PayBox draft={draft} onMarked={load} />
              </div>
            )}
          </div>
        </div>

        {/* Right side: notebook-style preview */}
        <div className="md:col-span-3">
          <div
            ref={wrapRef}
            onContextMenu={preventContext}
            style={notebookLock}
            className="p-5 border rounded-2xl bg-[rgba(253,253,250,0.9)] shadow relative overflow-hidden"
          >
            <style>{`
              .no-select * {
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
              }
            `}</style>

            <div className="no-select text-[15px] text-gray-800 leading-7">
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

            <div className="pointer-events-none absolute inset-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="space-y-3">
      <div className="text-sm text-gray-700">
        Amount: <b>₹{amount}</b> • UPI: <code>{upiId}</code>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
          href={upiLink}
        >
          UPI Pay (prefilled)
        </a>
        <a
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white"
          href={waLink}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp Proof
        </a>
        <button
          className="px-4 py-2 rounded-xl border"
          onClick={mark}
        >
          I Paid — Mark & Submit
        </button>
      </div>
      <div className="text-xs text-gray-500">
        Admin will verify your proof and approve access in dashboard.
      </div>
    </div>
  );
}
