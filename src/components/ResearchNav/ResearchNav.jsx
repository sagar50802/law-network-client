// File: src/components/ResearchNav/ResearchNav.jsx
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ----------------------------- Config & Icons ------------------------------ */
const MILESTONES = [
  { id: "topic",      label: "Idea",       icon: "💡", required: ["title"] },
  { id: "literature", label: "Review",     icon: "🔎", required: ["lit"] },
  { id: "method",     label: "Method",     icon: "🧪", required: ["method"] },
  { id: "timeline",   label: "Summary",    icon: "🗂️", required: ["start","end"] }, // label keeps sample vibe
  { id: "payment",    label: "Payment",    icon: "💳", required: [] },
  { id: "done",       label: "Submission", icon: "🏁", required: [] },
];

const INITIAL = {
  title: "",
  lit: "",
  method: "",
  start: "",
  end: "",
  notes: "",
  paymentVerified: false,
};

const LS_KEY = "researchnav:draft:v2";

/* --------------------------------- Utils ---------------------------------- */
function computeStepsState(form) {
  const steps = MILESTONES.map((s) => {
    if (s.id === "payment") {
      const tlOk = MILESTONES.find(m => m.id === "timeline").required.every(r => !!form[r]);
      return { ...s, status: tlOk ? "in_progress" : "locked" };
    }
    if (s.id === "done") return { ...s, status: "locked" };
    const ok = (s.required || []).every(r => !!form[r]);
    return { ...s, status: ok ? "completed" : (s.required.some(r => form[r]) ? "in_progress" : "locked") };
  });
  return steps;
}
function pctFromSteps(steps) {
  const num = steps.filter(s => s.status === "completed").length;
  return Math.round((num / (MILESTONES.length - 1)) * 100);
}

/* ------------------------- Vertical Flowing Track -------------------------- */
function VerticalTrack({ steps, currentId, onJump }) {
  // SVG path animation: dashed stroke flows; completed segments glow
  return (
    <div className="relative w-full">
      {/* Big parchment card behind the track */}
      <div className="rounded-[24px] border border-[#ecd9b6] bg-[#fff5dd] shadow-[0_10px_40px_rgba(150,120,60,.08)] px-4 sm:px-6 py-6">
        <div className="grid grid-cols-[36px_1fr] gap-3">
          {/* Column 1: the animated path */}
          <div className="relative">
            <svg
              className="block"
              width="36"
              height={steps.length * 140}
              viewBox={`0 0 36 ${steps.length * 140}`}
              fill="none"
            >
              {/* Base path */}
              <path
                d={`M18 10 ${Array.from({ length: steps.length - 1 })
                  .map((_, i) => `C18 ${i*140+50}, 18 ${i*140+90}, 18 ${i*140+130}`)
                  .join(" ")}`}
                stroke="#b7d7ff"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.5"
              />
              {/* Flowing dashed overlay */}
              <path
                d={`M18 10 ${Array.from({ length: steps.length - 1 })
                  .map((_, i) => `C18 ${i*140+50}, 18 ${i*140+90}, 18 ${i*140+130}`)
                  .join(" ")}`}
                className="animate-dash"
                stroke="url(#blueGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="10 10"
              />
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#69a7ff" />
                  <stop offset="100%" stopColor="#4fb5ff" />
                </linearGradient>
              </defs>
            </svg>

            {/* Glowing nodes */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-px">
              {steps.map((s, idx) => {
                const top = idx * 140 + 10;
                const locked = s.status === "locked";
                const current = s.id === currentId;
                const completed = s.status === "completed";
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => !locked && onJump?.(s.id)}
                    className={[
                      "absolute -left-3.5 w-7 h-7 rounded-full grid place-items-center transition",
                      locked
                        ? "bg-[#dcd6c4] text-[#948a73] shadow-none"
                        : completed
                        ? "bg-[#74e4c4] text-white shadow-[0_0_0_6px_rgba(116,228,196,.35)]"
                        : current
                        ? "bg-white text-[#4fb5ff] border-2 border-[#4fb5ff] shadow-[0_0_12px_rgba(79,181,255,.45)]"
                        : "bg-white text-[#4fb5ff] border border-[#a8d8ff]"
                    ].join(" ")}
                    style={{ top }}
                    title={`${s.label}${locked ? " (Locked)" : ""}`}
                    disabled={locked}
                  >
                    <span className="animate-pulse-slow">{s.icon}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 2: step cards aligned with nodes */}
          <div className="relative">
            {steps.map((s, idx) => {
              const locked = s.status === "locked";
              const current = s.id === currentId;
              const completed = s.status === "completed";
              return (
                <div key={s.id} className="mb-[100px] last:mb-0">
                  <div
                    className={[
                      "rounded-2xl border px-4 sm:px-5 py-4 shadow-sm",
                      "bg-[#fffaf0] border-[#ecd9b6]",
                      locked ? "opacity-60 cursor-not-allowed" : "hover:shadow-md transition-shadow",
                      current ? "ring-2 ring-[#4fb5ff]/50" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold text-[#1b2a3b]">
                        {s.icon} <span className="align-middle">{s.label}</span>
                      </div>
                      <div className="text-xs">
                        {completed ? (
                          <span className="inline-block rounded-full bg-[#e6fff7] text-[#0b7a57] border border-[#baf2de] px-2 py-0.5">
                            ✓ Completed
                          </span>
                        ) : current ? (
                          <span className="inline-block rounded-full bg-[#e7f4ff] text-[#2467a8] border border-[#bcdfff] px-2 py-0.5">
                            In progress
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-[#f7f2e6] text-[#7b6b48] border border-[#eadfcb] px-2 py-0.5">
                            {locked ? "Locked" : "Pending"}
                          </span>
                        )}
                      </div>
                    </div>
                    {current && (
                      <p className="mt-1 text-sm text-[#6b6657]">
                        Fill this section to unlock the next stop on the path.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scoped CSS for dash & glow */}
      <style>{`
        @keyframes dashFlow { to { stroke-dashoffset: -20; } }
        .animate-dash { animation: dashFlow 1.4s linear infinite; stroke-dashoffset: 0; }
        @keyframes pulseSlow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        .animate-pulse-slow { animation: pulseSlow 2.6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* ------------------------ Stage Summary (after steps) ---------------------- */
function StageSummaryPopup({ open, onClose, form, steps }) {
  if (!open) return null;
  const completed = steps.filter(s=>s.status==="completed").map(s=>s.label).join(", ");
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
      <motion.div initial={{ scale: .96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xl rounded-2xl border border-[#ecd9b6] bg-[#fffaf0] shadow-2xl">
        <div className="p-6 space-y-4">
          <h3 className="text-2xl font-bold text-[#1b2a3b]">Stage Summary</h3>
          <div className="text-sm text-[#675f4d]">Completed: <span className="font-semibold text-[#1b2a3b]">{completed || "—"}</span></div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-[#ecd9b6] bg-white/70 p-3">
              <div className="text-[#7b6b48]">Idea</div>
              <div className="font-medium break-words text-[#1b2a3b]">{form.title || <em className="text-[#7b6b48]">Not filled</em>}</div>
            </div>
            <div className="rounded-xl border border-[#ecd9b6] bg-white/70 p-3">
              <div className="text-[#7b6b48]">Method</div>
              <div className="font-medium">{form.method || <em className="text-[#7b6b48]">—</em>}</div>
            </div>
            <div className="rounded-xl border border-[#ecd9b6] bg-white/70 p-3">
              <div className="text-[#7b6b48]">Timeline</div>
              <div className="font-medium">{form.start && form.end ? `${form.start} → ${form.end}` : <em className="text-[#7b6b48]">Not planned</em>}</div>
            </div>
            <div className="rounded-xl border border-[#ecd9b6] bg-white/70 p-3">
              <div className="text-[#7b6b48]">Refs</div>
              <div className="font-mono whitespace-pre-wrap">{form.lit || <em className="text-[#7b6b48]">Add references</em>}</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#e2d1ae]">Close</button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#4fb5ff] text-white">Continue →</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------ End Ceremony + PDF Gating ------------------------ */
function EndCeremony({ open, onClose, paymentVerified, onVerifyPayment }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur grid place-items-center p-4">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-xl rounded-2xl border border-[#ecd9b6] bg-[#fffaf0] shadow-2xl overflow-hidden">
        <div className="p-6 text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <h3 className="text-2xl font-bold text-[#1b2a3b]">Congratulations! Your proposal is now with the Controller.</h3>
          <p className="text-[#675f4d]">Preview your draft; full PDF unlocks after payment verification.</p>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button className="px-4 py-2 rounded-lg border border-[#e2d1ae] bg-white/70">Preview PDF (1 page)</button>
            <button
              disabled={!paymentVerified}
              title={paymentVerified? "" : "Complete payment to enable"}
              className={`px-4 py-2 rounded-lg text-white ${paymentVerified? "bg-[#1bbf8a]" : "bg-[#b8c7d5] cursor-not-allowed"}`}
            >
              Download Full PDF
            </button>
            {!paymentVerified && (
              <button onClick={onVerifyPayment} className="px-4 py-2 rounded-lg bg-[#4fb5ff] text-white">I’ve Paid → Verify</button>
            )}
          </div>
          <div className="pt-2">
            <button onClick={onClose} className="underline text-sm text-[#675f4d]">Close</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------- Right Rail ------------------------------- */
function RightRail({ form }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#ecd9b6] bg-[#fffaf0] shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-[#1b2a3b]">Live Preview</div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fff] border border-[#e2d1ae] text-[#7b6b48]">
            auto-save
          </span>
        </div>
        <div className="text-sm space-y-1 text-[#1b2a3b]">
          <div><span className="text-[#7b6b48]">Topic:</span> <span className="font-medium">{form.title || <em className="text-[#7b6b48]">—</em>}</span></div>
          <div><span className="text-[#7b6b48]">Literature:</span> <span className="whitespace-pre-wrap">{form.lit || <em className="text-[#7b6b48]">Add references</em>}</span></div>
          <div><span className="text-[#7b6b48]">Method:</span> <span>{form.method || <em className="text-[#7b6b48]">—</em>}</span></div>
          <div><span className="text-[#7b6b48]">Timeline:</span> <span>{form.start && form.end ? `${form.start} → ${form.end}` : <em className="text-[#7b6b48]">—</em>}</span></div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#ecd9b6] bg-[#fffaf0] shadow-sm p-4">
        <div className="font-semibold text-[#1b2a3b] mb-2">Tips</div>
        <ul className="list-disc list-inside text-sm text-[#675f4d] space-y-1">
          <li>Keep objectives measurable.</li>
          <li>Add at least 3 credible references.</li>
          <li>Use clear start and end dates.</li>
        </ul>
      </div>
    </div>
  );
}

/* ---------------------------- Step Form (Center) --------------------------- */
function StepForm({ stepId, form, setForm, onStageSummary, onFinish }) {
  const required = useMemo(() => (MILESTONES.find(m => m.id === stepId)?.required) || [], [stepId]);
  const isValid = required.every(k => !!form[k]);

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(form)); }, [form]);

  function Input({ label, name, type="text", placeholder }) {
    const props = {
      value: form[name] || "",
      onChange: e => setForm(f => ({ ...f, [name]: e.target.value })),
      className: "w-full rounded-xl border border-[#e2d1ae] bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#c7e3ff]",
      placeholder,
    };
    return (
      <label className="block">
        <div className="text-sm text-[#7b6b48] mb-1">{label}</div>
        {type === "textarea" ? <textarea rows={6} {...props} /> : <input type={type} {...props} />}
      </label>
    );
  }

  return (
    <div className="rounded-2xl border border-[#ecd9b6] bg-[#fffaf0] shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[#1b2a3b]">{MILESTONES.find(s=>s.id===stepId)?.label}</h2>
        {isValid
          ? <span className="text-sm text-[#0b7a57]">✓ Complete</span>
          : <span className="text-sm text-[#b17a1a]">Complete required fields</span>}
      </div>

      {stepId === "topic" && (
        <div className="grid gap-4">
          <Input label="Enter your research idea" name="title" placeholder="e.g., Fairness in Constitutional AI Decisions" />
          <Input label="Notes (optional)" name="notes" type="textarea" placeholder="Add problem statement / objectives…" />
        </div>
      )}

      {stepId === "literature" && (
        <div className="grid gap-4">
          <Input label="Key References" name="lit" type="textarea" placeholder="Paste citations or links…" />
        </div>
      )}

      {stepId === "method" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Methodology" name="method" placeholder="Survey / Doctrinal / Experimental…" />
          <Input label="Tools (optional)" name="tools" placeholder="e.g., SPSS, Pandas, NVivo" />
        </div>
      )}

      {stepId === "timeline" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Start Date" name="start" type="date" />
          <Input label="End Date" name="end" type="date" />
        </div>
      )}

      {stepId === "payment" && (
        <div className="grid gap-4">
          <div className="rounded-xl border border-[#e2d1ae] bg-[#f6f0df] p-4 text-sm text-[#675f4d]">
            Complete payment to enable full PDF download after submission. Attach WhatsApp screenshot if asked.
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="px-4 py-2 rounded-lg bg-[#1bbf8a] text-white" onClick={()=>setForm(f=>({...f, paymentVerified:true}))}>Mock: Mark as Paid</button>
            <span className={`text-sm ${form.paymentVerified? "text-[#0b7a57]" : "text-[#7b6b48]"}`}>
              {form.paymentVerified? "Payment verified" : "Awaiting payment"}
            </span>
          </div>
        </div>
      )}

      {stepId === "done" && (
        <div className="text-sm text-[#675f4d]">All steps complete. Submit to finish the journey.</div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button type="button" onClick={onStageSummary} className="px-4 py-2 rounded-lg border border-[#e2d1ae] bg-white/70">Stage Summary</button>
        {stepId === "done" ? (
          <button type="button" onClick={onFinish} className="px-4 py-2 rounded-lg bg-[#4fb5ff] text-white">Submit → Finish</button>
        ) : (
          <button type="button" disabled={!isValid} title={!isValid? "Complete current step first" : ""} className="px-4 py-2 rounded-lg bg-[#4fb5ff] text-white disabled:opacity-60" onClick={onStageSummary}>Next</button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Main Shell -------------------------------- */
export default function ResearchNav() {
  const [form, setForm] = useState(() => {
    try { return { ...INITIAL, ...(JSON.parse(localStorage.getItem(LS_KEY)||"{}")) }; }
    catch { return INITIAL; }
  });
  const steps = useMemo(()=>computeStepsState(form), [form]);
  const [currentId, setCurrentId] = useState("topic");
  const [showSummary, setShowSummary] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const percent = pctFromSteps(steps);

  const goToNext = () => {
    const order = MILESTONES.map(s=>s.id);
    const idx = order.indexOf(currentId);
    const currReq = (MILESTONES.find(m=>m.id===currentId)?.required)||[];
    const valid = currReq.every(k=>!!form[k]);
    if (!valid) { setShowSummary(true); return; }
    const nextId = order[Math.min(idx+1, order.length-1)];
    setCurrentId(nextId);
  };

  const onJump = (id) => {
    const st = steps.find(s=>s.id===id);
    if (st?.status === "locked") return;
    setCurrentId(id);
  };

  const onFinish = () => { setShowEnd(true); };

  const curr = steps.find(s=>s.id===currentId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff3cf] via-[#fff8e6] to-[#ffeec6]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#fff8e8e6] backdrop-blur border-b border-[#f0e2c9]">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-lg font-extrabold text-[#1b2a3b]">Research Navigation</div>
            <div className="text-sm text-[#675f4d]">{percent}% complete</div>
          </div>
        </div>
      </header>

      {/* Body: vertical track left, editor + right rail responsive */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* LEFT: Vertical track */}
          <div className="lg:col-span-5">
            <VerticalTrack steps={steps} currentId={currentId} onJump={onJump} />
          </div>

          {/* CENTER: Active step form */}
          <div className="lg:col-span-4">
            <AnimatePresence mode="wait">
              <motion.div key={curr?.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                <StepForm
                  stepId={curr?.id}
                  form={form}
                  setForm={setForm}
                  onStageSummary={() => { setShowSummary(true); if (curr?.id !== "done") goToNext(); }}
                  onFinish={onFinish}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT: Preview + tips (hidden on small screens → drops under) */}
          <div className="lg:col-span-3">
            <RightRail form={form} />
          </div>
        </div>
      </main>

      {/* Popups */}
      <StageSummaryPopup open={showSummary} onClose={()=>setShowSummary(false)} form={form} steps={steps} />
      <EndCeremony open={showEnd} onClose={()=>setShowEnd(false)} paymentVerified={!!form.paymentVerified} onVerifyPayment={()=>setForm(f=>({...f, paymentVerified:true}))} />
    </div>
  );
}
