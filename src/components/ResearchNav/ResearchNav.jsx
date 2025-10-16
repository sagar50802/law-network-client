// src/components/ResearchNav/ResearchNav.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ----------------------------- Milestones ---------------------------------- */
const STEPS = [
  { id: "topic",      label: "Idea",       icon: "💡", need: ["title"] },
  { id: "literature", label: "Review",     icon: "🔎", need: ["lit"] },
  { id: "method",     label: "Method",     icon: "🧪", need: ["method"] },
  { id: "timeline",   label: "Timeline",   icon: "🗓️", need: ["start","end"] },
  { id: "payment",    label: "Payment",    icon: "💳", need: [] },
  { id: "done",       label: "Submission", icon: "🏁", need: [] },
];

const INITIAL = {
  title: "",
  lit: "",
  method: "",
  start: "",
  end: "",
  notes: "",
  tools: "",
  paymentVerified: false,
};
const LS_KEY = "researchnav:liquid:v1";

/* -------------------------------- Helpers ---------------------------------- */
function gateStates(form) {
  // compute status per step and enforce locking of future steps
  const status = [];
  let lock = false;
  for (const s of STEPS) {
    if (s.id === "done") { status.push({ ...s, state: "locked" }); continue; }
    if (lock) { status.push({ ...s, state: "locked" }); continue; }
    const ok = (s.need || []).every(k => !!form[k]);
    status.push({ ...s, state: ok ? "completed" : (s.need?.some(k => form[k]) ? "in_progress" : "in_progress") });
    if (!ok) lock = true;
  }
  // payment opens after timeline is valid
  const tl = status.find(s => s.id === "timeline");
  const pay = status.find(s => s.id === "payment");
  if (pay) pay.state = tl?.state === "completed" ? "in_progress" : "locked";
  return status;
}
const progressPct = (states) =>
  Math.round((states.filter(s => s.id !== "done" && s.state === "completed").length / (STEPS.length - 1)) * 100);

/* -------------------------- Hook: Typewriter -------------------------------- */
function useTypewriter(sourceText, speed = 18) {
  const [out, setOut] = useState("");
  const stopRef = useRef(null);

  useEffect(() => {
    // reset and type again on source change
    if (stopRef.current) clearInterval(stopRef.current);
    setOut("");
    let i = 0;
    const run = () => {
      setOut(sourceText.slice(0, i));
      i++;
      if (i > sourceText.length) clearInterval(stopRef.current);
    };
    stopRef.current = setInterval(run, Math.max(8, speed));
    return () => clearInterval(stopRef.current);
  }, [sourceText, speed]);

  return out;
}

/* --------------------------- Liquid Vertical Track ------------------------- */
function LiquidTrack({ states, activeId, onStepClick }) {
  // Render animated “water” line + ripple nodes. Locked nodes dim. Only current/past clickable.
  return (
    <div className="relative">
      <div className="rounded-[28px] border border-[#eadbb6] bg-[#fff5dc] shadow-[0_20px_50px_rgba(120,90,40,.08)] p-5">
        <div className="grid grid-cols-[42px_1fr] gap-4">

          {/* Path */}
          <div className="relative">
            <svg
              width="42"
              height={states.length * 150}
              viewBox={`0 0 42 ${states.length * 150}`}
              className="block"
            >
              {/* faint parchment rail */}
              <path
                d={`M21 10 ${Array.from({ length: states.length - 1 })
                  .map((_, i) => `C21 ${i*150+50}, 21 ${i*150+95}, 21 ${i*150+140}`)
                  .join(" ")}`}
                stroke="#e8dcc1"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* animated water */}
              <defs>
                <linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7ed3ff" />
                  <stop offset="100%" stopColor="#45b1ff" />
                </linearGradient>
              </defs>
              <path
                d={`M21 10 ${Array.from({ length: states.length - 1 })
                  .map((_, i) => `C21 ${i*150+50}, 21 ${i*150+95}, 21 ${i*150+140}`)
                  .join(" ")}`}
                stroke="url(#liquid)"
                strokeWidth="4"
                strokeLinecap="round"
                className="animate-liquid"
                strokeDasharray="14 14"
              />
            </svg>

            {/* nodes */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0">
              {states.map((s, i) => {
                const top = i * 150 + 10;
                const locked = s.state === "locked";
                const current = s.id === activeId;
                const completed = s.state === "completed";
                const nodeCls = [
                  "absolute -left-4 w-8 h-8 rounded-full grid place-items-center select-none",
                  locked && "bg-[#d8d1bf] text-[#8f8164]",
                  current && "bg-white text-[#45b1ff] border-2 border-[#45b1ff] shadow-[0_0_18px_rgba(69,177,255,.45)]",
                  completed && "bg-[#27cda2] text-white shadow-[0_0_0_8px_rgba(39,205,162,.18)]",
                  !locked && !current && !completed && "bg-white text-[#45b1ff] border border-[#bfe3ff]",
                ].filter(Boolean).join(" ");
                return (
                  <button
                    key={s.id}
                    style={{ top }}
                    className={nodeCls}
                    onClick={() => !locked && onStepClick(s.id)}
                    title={locked ? `${s.label} (Locked)` : s.label}
                    disabled={locked}
                  >
                    <span className="animate-ripple">{STEPS.find(x => x.id === s.id)?.icon}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ghost indicator cards (only for current & past) */}
          <div className="relative">
            {states.map((s, idx) => {
              const isLocked = s.state === "locked";
              const isActive = s.id === activeId;
              // show only current and previous cards; future cards appear as faint “Next …” tabs (indicators)
              const showCard = !isLocked;
              return (
                <div key={s.id} className="mb-[110px] last:mb-0 relative">
                  {showCard ? (
                    <div className={[
                      "rounded-2xl border px-4 py-3 bg-[#fffaf0] border-[#eadbb6] shadow-sm",
                      isActive ? "ring-2 ring-[#45b1ff]/40" : "hover:shadow-md transition-shadow"
                    ].join(" ")}>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-[#182836] text-base">
                          {STEPS.find(x => x.id === s.id)?.icon} {STEPS.find(x => x.id === s.id)?.label}
                        </div>
                        <span className="text-[11px] rounded-full px-2 py-0.5 border"
                              style={{
                                background: isActive ? "#e9f4ff" : (s.state === "completed" ? "#e9fff9" : "#f6f0e4"),
                                borderColor: isActive ? "#bfe3ff" : (s.state === "completed" ? "#b6f0e2" : "#eadbb6"),
                                color: isActive ? "#246aa8" : (s.state === "completed" ? "#0b7a57" : "#7b6b48")
                              }}>
                          {s.state === "completed" ? "Completed" : isActive ? "In progress" : "Ready"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // subtle “next” indicator
                    <div className="pl-2">
                      <div className="inline-flex items-center gap-2 text-[#8f8164] text-sm opacity-60">
                        <span className="h-2 w-2 rounded-full bg-[#d8caa8] animate-ping" />
                        <span>Next step ahead…</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* local CSS */}
      <style>{`
        @keyframes liquid { to { stroke-dashoffset: -28; } }
        .animate-liquid { animation: liquid 1.25s linear infinite; stroke-dashoffset: 0; }
        @keyframes ripple { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(69,177,255,.35);} 70% { box-shadow: 0 0 0 8px rgba(69,177,255,0);} 100% { transform: scale(1); } }
        .animate-ripple { animation: ripple 2.4s ease-out infinite; }
      `}</style>
    </div>
  );
}

/* ------------------------------- A4 Glass Page ----------------------------- */
function GlassA4({ front, back }) {
  const [flip, setFlip] = useState(false);
  return (
    <div className="flex flex-col items-center">
      <div className="relative [perspective:1600px]">
        <div
          className={[
            "relative w-[min(92vw,760px)]",
            "aspect-[210/297]", // A4 ratio
            "[transform-style:preserve-3d] transition-transform duration-700",
            flip ? "[transform:rotateY(180deg)]" : ""
          ].join(" ")}
        >
          {/* front */}
          <div className="absolute inset-0 rounded-[18px] border border-[#d7c8a8] bg-white/25 backdrop-blur-xl shadow-[0_30px_70px_rgba(0,0,0,.08)] [backface-visibility:hidden]">
            {front}
            <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-gradient-to-br from-white/40 via-transparent to-white/10" />
          </div>
          {/* back */}
          <div className="absolute inset-0 rounded-[18px] border border-[#d7c8a8] bg-white/25 backdrop-blur-xl shadow-[0_30px_70px_rgba(0,0,0,.08)] [transform:rotateY(180deg)] [backface-visibility:hidden]">
            {back}
            <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-gradient-to-br from-white/40 via-transparent to-white/10" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          className="px-3 py-1.5 rounded-md bg-[#45b1ff] text-white text-sm shadow"
          onClick={() => setFlip(v => !v)}
        >
          {flip ? "Turn to Front" : "Flip Page"}
        </button>
      </div>
    </div>
  );
}

/* --------------------------- Live Preview Content -------------------------- */
function LivePreview({ form }) {
  const previewText =
    `Topic: ${form.title || "—"}\n` +
    `Literature: ${form.lit || "—"}\n` +
    `Method: ${form.method || "—"}\n` +
    `Timeline: ${form.start && form.end ? `${form.start} → ${form.end}` : "—"}`;

  const ink = useTypewriter(previewText, 14);

  const Front = (
    <div className="p-6 sm:p-8 text-[#0f1d2a]">
      <div className="text-lg font-semibold mb-3">Live Preview</div>
      <div
        className="font-[ui-monospace,monospace] whitespace-pre-wrap text-[13.5px] leading-6"
        style={{
          textShadow: "0 1px 0 rgba(255,255,255,.25)",
          borderRadius: 12,
          padding: "10px 12px",
          background: "linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.25))",
          border: "1px solid rgba(215,200,168,.6)"
        }}
      >
        {ink}
        <span className="inline-block w-3 h-4 align-baseline bg-[#0f1d2a] ml-0.5 animate-pulse" />
      </div>
      <div className="mt-4 text-xs text-[#6e634c]">Auto-write effect simulates pen on glass.</div>
    </div>
  );

  const Back = (
    <div className="p-6 sm:p-8 text-[#0f1d2a]">
      <div className="text-lg font-semibold mb-3">Notes</div>
      <div className="text-sm text-[#6e634c] whitespace-pre-wrap">
        {form.notes || "—"}
      </div>
      <div className="mt-4 text-xs text-[#6e634c]">Tools: {form.tools || "—"}</div>
    </div>
  );

  return <GlassA4 front={Front} back={Back} />;
}

/* ------------------------------- Step Form --------------------------------- */
function StepForm({ id, form, setForm, onSummary, onFinish }) {
  const need = useMemo(() => STEPS.find(s => s.id === id)?.need || [], [id]);
  const ok = need.every(k => !!form[k]);

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(form)); }, [form]);

  const Field = ({ label, name, type = "text", placeholder }) => {
    const common = {
      value: form[name] || "",
      onChange: e => setForm(f => ({ ...f, [name]: e.target.value })),
      className:
        "w-full rounded-xl border border-[#e2d1ae] bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#bfe3ff]",
      placeholder
    };
    return (
      <label className="block">
        <div className="text-sm text-[#7b6b48] mb-1">{label}</div>
        {type === "textarea" ? <textarea rows={6} {...common} /> : <input type={type} {...common} />}
      </label>
    );
  };

  return (
    <div className="rounded-2xl border border-[#eadbb6] bg-[#fffaf0] shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[18px] font-bold text-[#182836]">
          {STEPS.find(s => s.id === id)?.icon} {STEPS.find(s => s.id === id)?.label}
        </h3>
        <span className={`text-sm ${ok ? "text-[#0b7a57]" : "text-[#b17a1a]"}`}>
          {ok ? "✓ Complete" : "Fill required fields"}
        </span>
      </div>

      {id === "topic" && (
        <div className="grid gap-4">
          <Field label="Enter your research idea" name="title" placeholder="e.g., Fairness in Constitutional AI" />
          <Field label="Notes (optional)" name="notes" type="textarea" placeholder="Problem statement / objectives…" />
        </div>
      )}
      {id === "literature" && (
        <div className="grid gap-4">
          <Field label="Key References" name="lit" type="textarea" placeholder="Paste citations or links…" />
        </div>
      )}
      {id === "method" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Methodology" name="method" placeholder="Survey / Doctrinal / Experimental…" />
          <Field label="Tools (optional)" name="tools" placeholder="SPSS, NVivo, Pandas…" />
        </div>
      )}
      {id === "timeline" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Start Date" name="start" type="date" />
          <Field label="End Date" name="end" type="date" />
        </div>
      )}
      {id === "payment" && (
        <div className="grid gap-4">
          <div className="rounded-xl border border-[#e2d1ae] bg-[#f7f0df] p-4 text-sm text-[#6e634c]">
            After payment verification, the full PDF download unlocks. Attach WhatsApp screenshot if requested.
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg bg-[#1bbf8a] text-white"
              onClick={() => setForm(f => ({ ...f, paymentVerified: true }))}
            >
              Mock: Mark as Paid
            </button>
            <span className={`text-sm ${form.paymentVerified ? "text-[#0b7a57]" : "text-[#6e634c]"}`}>
              {form.paymentVerified ? "Payment verified" : "Awaiting payment"}
            </span>
          </div>
        </div>
      )}
      {id === "done" && <div className="text-sm text-[#6e634c]">All steps complete. Submit to finish the journey.</div>}

      <div className="flex items-center justify-between mt-6">
        <button className="px-4 py-2 rounded-lg border border-[#e2d1ae] bg-white/70" onClick={onSummary}>
          Stage Summary
        </button>
        {id === "done" ? (
          <button className="px-4 py-2 rounded-lg bg-[#45b1ff] text-white" onClick={onFinish}>
            Submit → Finish
          </button>
        ) : (
          <button
            className="px-4 py-2 rounded-lg bg-[#45b1ff] text-white disabled:opacity-60"
            disabled={!ok}
            onClick={onSummary}
            title={!ok ? "Complete current step first" : ""}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- Summary & Ceremony --------------------------- */
function SummaryPopup({ open, onClose, form, states }) {
  if (!open) return null;
  const list = states.filter(s => s.state === "completed").map(s => s.label).join(", ");
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
      <motion.div initial={{ scale: .96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xl rounded-2xl border border-[#eadbb6] bg-[#fffaf0] shadow-2xl p-6">
        <h3 className="text-xl font-bold text-[#182836] mb-2">Stage Summary</h3>
        <div className="text-sm text-[#6e634c] mb-4">Completed: <span className="font-medium text-[#182836]">{list || "—"}</span></div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-[#eadbb6] bg-white/70 p-3">
            <div className="text-[#7b6b48]">Idea</div>
            <div className="font-medium">{form.title || <em className="text-[#7b6b48]">—</em>}</div>
          </div>
          <div className="rounded-xl border border-[#eadbb6] bg-white/70 p-3">
            <div className="text-[#7b6b48]">Method</div>
            <div className="font-medium">{form.method || <em className="text-[#7b6b48]">—</em>}</div>
          </div>
          <div className="rounded-xl border border-[#eadbb6] bg-white/70 p-3">
            <div className="text-[#7b6b48]">Timeline</div>
            <div className="font-medium">{form.start && form.end ? `${form.start} → ${form.end}` : <em className="text-[#7b6b48]">—</em>}</div>
          </div>
          <div className="rounded-xl border border-[#eadbb6] bg-white/70 p-3">
            <div className="text-[#7b6b48]">Refs</div>
            <div className="font-mono whitespace-pre-wrap">{form.lit || <em className="text-[#7b6b48]">—</em>}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#e2d1ae] bg-white/70">Close</button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#45b1ff] text-white">Continue →</button>
        </div>
      </motion.div>
    </div>
  );
}

function EndCeremony({ open, onClose, paymentVerified, onVerifyPayment }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur grid place-items-center p-4">
      <motion.div initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-xl rounded-2xl border border-[#eadbb6] bg-[#fffaf0] shadow-2xl p-6 text-center">
        <div className="text-4xl">🎉</div>
        <h3 className="text-xl font-bold text-[#182836] mt-2">Congratulations! Your proposal is now with the Controller.</h3>
        <p className="text-[#6e634c] mt-1">Preview is available; full PDF unlocks after payment verification.</p>
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
          <button className="px-4 py-2 rounded-lg border border-[#e2d1ae] bg-white/70">Preview PDF (1 page)</button>
          <button disabled={!paymentVerified}
                  className={`px-4 py-2 rounded-lg text-white ${paymentVerified ? "bg-[#1bbf8a]" : "bg-[#b8c7d5] cursor-not-allowed"}`}>
            Download Full PDF
          </button>
          {!paymentVerified && (
            <button onClick={onVerifyPayment} className="px-4 py-2 rounded-lg bg-[#45b1ff] text-white">
              I’ve Paid → Verify
            </button>
          )}
        </div>
        <button onClick={onClose} className="underline text-sm text-[#6e634c] mt-3">Close</button>
      </motion.div>
    </div>
  );
}

/* ---------------------------------- Main ----------------------------------- */
export default function ResearchNav() {
  const [form, setForm] = useState(() => {
    try { return { ...INITIAL, ...(JSON.parse(localStorage.getItem(LS_KEY) || "{}")) }; }
    catch { return INITIAL; }
  });

  const states = useMemo(() => gateStates(form), [form]);
  const [active, setActive] = useState("topic");
  const [showSummary, setShowSummary] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const pct = progressPct(states);
  const order = STEPS.map(s => s.id);
  const currentIndex = order.indexOf(active);

  // prevent jumping into future locked steps
  const onStepClick = (id) => {
    const s = states.find(x => x.id === id);
    if (s?.state === "locked") return;
    setActive(id);
  };

  const goNext = () => {
    const need = STEPS.find(s => s.id === active)?.need || [];
    const ok = need.every(k => !!form[k]);
    if (!ok) { setShowSummary(true); return; }
    const nextId = order[Math.min(currentIndex + 1, order.length - 1)];
    setActive(nextId);
  };

  const onFinish = () => setShowEnd(true);

  const current = states.find(s => s.id === active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff2c8] via-[#fff6e2] to-[#ffe7b8]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#fff8e8da] backdrop-blur border-b border-[#efdfbe]">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold text-[#182836]">Research Navigation</div>
            <div className="text-sm text-[#6e634c]">{pct}% complete</div>
          </div>
        </div>
      </header>

      {/* Layout */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 grid lg:grid-cols-12 gap-6">
        {/* Left: Liquid Track */}
        <div className="lg:col-span-4">
          <LiquidTrack states={states} activeId={active} onStepClick={onStepClick} />
        </div>

        {/* Center: Form (only current step visible) */}
        <div className="lg:col-span-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={current?.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
            >
              <StepForm
                id={current?.id}
                form={form}
                setForm={setForm}
                onSummary={() => { setShowSummary(true); if (current?.id !== "done") goNext(); }}
                onFinish={onFinish}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Live A4 Glass Preview with Flip */}
        <div className="lg:col-span-4">
          <LivePreview form={form} />
        </div>
      </main>

      {/* Overlays */}
      <SummaryPopup open={showSummary} onClose={() => setShowSummary(false)} form={form} states={states} />
      <EndCeremony
        open={showEnd}
        onClose={() => setShowEnd(false)}
        paymentVerified={!!form.paymentVerified}
        onVerifyPayment={() => setForm(f => ({ ...f, paymentVerified: true }))}
      />
    </div>
  );
}
