// File: src/components/ResearchNav/ResearchNav.jsx
// Standalone, safe module. Does NOT touch existing code. 
// Dependencies: React, Tailwind, Framer Motion (optional). No external API required yet.

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ----------------------------- Config & Icons ------------------------------ */
const MILESTONES = [
  { id: "topic",      label: "Topic",      icon: "📘", required: ["title"] },
  { id: "literature", label: "Literature", icon: "📄", required: ["lit"] },
  { id: "method",     label: "Method",     icon: "🧪", required: ["method"] },
  { id: "timeline",   label: "Timeline",   icon: "⏳", required: ["start","end"] },
  { id: "payment",    label: "Payment",    icon: "💰", required: [] },
  { id: "done",       label: "Done",       icon: "🎓", required: [] },
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

const LS_KEY = "researchnav:draft:v1";

/* --------------------------------- Utils ---------------------------------- */
function computeStepsState(form) {
  const steps = MILESTONES.map((s) => {
    if (s.id === "payment") {
      // unlocked after timeline completed
      const tlOk = MILESTONES.find(m => m.id === "timeline").required.every(r => !!form[r]);
      return { ...s, status: tlOk ? "in_progress" : "locked" };
    }
    if (s.id === "done") {
      // only when user hits submit at the end
      return { ...s, status: "locked" };
    }
    const ok = (s.required || []).every(r => !!form[r]);
    return { ...s, status: ok ? "completed" : (s.required.some(r => form[r]) ? "in_progress" : "locked") };
  });
  return steps;
}

function pctFromSteps(steps) {
  const num = steps.filter(s => s.status === "completed").length;
  return Math.round((num / (MILESTONES.length - 1)) * 100); // exclude done from raw
}

/* --------------------------- Shared: MilestoneBar -------------------------- */
function MilestoneBar({ steps, onJump, compact=false }) {
  return (
    <div className={`w-full flex items-center justify-between ${compact?"scale-95":""}`}>
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-3">
          <button
            className={[
              "w-10 h-10 rounded-full grid place-items-center text-lg transition",
              s.status === "completed" && "bg-emerald-500 text-white shadow",
              s.status === "in_progress" && "ring-2 ring-amber-400 bg-white",
              s.status === "locked" && "bg-gray-200 text-gray-500 opacity-70",
            ].filter(Boolean).join(" ")}
            disabled={s.status === "locked"}
            title={`${s.label}${s.status === "locked" ? " (Locked)" : ""}`}
            onClick={() => s.status !== "locked" && onJump?.(s.id)}
          >{s.icon}</button>
          <div className="text-xs font-medium text-gray-700 hidden md:block">{s.label}</div>
          {i < steps.length - 1 && (
            <div className={`h-1 w-12 rounded-full ${steps[i].status === "completed" ? "bg-emerald-400 animate-pulse" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------ Stage Summary (after steps) ---------------------- */
function StageSummaryPopup({ open, onClose, form, steps }) {
  if (!open) return null;
  const completed = steps.filter(s=>s.status==="completed").map(s=>s.label).join(", ");
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="p-6 space-y-4">
          <h3 className="text-xl font-bold">Stage Summary</h3>
          <div className="text-sm text-gray-600">Great progress! You’ve completed: <span className="font-semibold text-gray-900">{completed || "—"}</span></div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-gray-50 border"><div className="text-gray-500">Topic</div><div className="font-medium break-words">{form.title || <em className="text-gray-400">Not filled</em>}</div></div>
            <div className="p-3 rounded-xl bg-gray-50 border"><div className="text-gray-500">Method</div><div className="font-medium">{form.method || <em className="text-gray-400">Not set</em>}</div></div>
            <div className="p-3 rounded-xl bg-gray-50 border"><div className="text-gray-500">Timeline</div><div className="font-medium">{form.start && form.end ? `${form.start} → ${form.end}` : <em className="text-gray-400">Not planned</em>}</div></div>
            <div className="p-3 rounded-xl bg-gray-50 border"><div className="text-gray-500">Refs</div><div className="font-medium line-clamp-3">{form.lit || <em className="text-gray-400">Add 2–3 sources</em>}</div></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border">Close</button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Continue →</button>
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
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="p-6 text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <h3 className="text-2xl font-bold">Congratulations! Your proposal is now with the Controller.</h3>
          <p className="text-gray-600">The journey timeline is complete. You can preview your draft or download the full PDF after payment verification.</p>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button className="px-4 py-2 rounded-lg border">Preview PDF (1 page)</button>
            <button disabled={!paymentVerified} title={paymentVerified?"":"Complete payment to enable"} className={`px-4 py-2 rounded-lg text-white ${paymentVerified?"bg-emerald-600":"bg-gray-300 cursor-not-allowed"}`}>
              Download Full PDF
            </button>
            {!paymentVerified && (
              <button onClick={onVerifyPayment} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">I’ve Paid → Verify</button>
            )}
          </div>
          <div className="pt-2">
            <button onClick={onClose} className="text-sm text-gray-500 underline">Close</button>
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
      <div className="p-4 rounded-2xl bg-white/70 backdrop-blur border shadow-sm">
        <div className="font-semibold mb-2">Live Preview</div>
        <div className="text-sm space-y-2">
          <div><span className="text-gray-500">Topic:</span> <span className="font-medium">{form.title || <em className="text-gray-400">—</em>}</span></div>
          <div><span className="text-gray-500">Literature:</span> <span className="font-medium whitespace-pre-wrap">{form.lit || <em className="text-gray-400">Add references</em>}</span></div>
          <div><span className="text-gray-500">Method:</span> <span className="font-medium">{form.method || <em className="text-gray-400">—</em>}</span></div>
          <div><span className="text-gray-500">Timeline:</span> <span className="font-medium">{form.start && form.end ? `${form.start} → ${form.end}` : <em className="text-gray-400">—</em>}</span></div>
        </div>
      </div>
      <div className="p-4 rounded-2xl bg-white/70 backdrop-blur border shadow-sm">
        <div className="font-semibold mb-2">Tips</div>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
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

  useEffect(() => {
    // auto-save to localStorage on change
    localStorage.setItem(LS_KEY, JSON.stringify(form));
  }, [form]);

  function Input({ label, name, type="text", ...rest }) {
    return (
      <label className="block">
        <div className="text-sm text-gray-600 mb-1">{label}</div>
        {type === "textarea" ? (
          <textarea value={form[name]||""} onChange={e=>setForm(f=>({...f,[name]:e.target.value}))} className="w-full rounded-xl border p-3 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-200" rows={5} {...rest} />
        ) : (
          <input type={type} value={form[name]||""} onChange={e=>setForm(f=>({...f,[name]:e.target.value}))} className="w-full rounded-xl border p-3 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-200" {...rest} />
        )}
      </label>
    );
  }

  return (
    <div className="p-6 rounded-2xl border bg-white/70 backdrop-blur shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold capitalize">{stepId}</h2>
        {isValid ? <span className="text-emerald-600 text-sm font-medium">✓ Complete</span> : <span className="text-amber-600 text-sm">Complete required fields</span>}
      </div>

      {stepId === "topic" && (
        <div className="grid gap-4">
          <Input label="Proposed Title" name="title" placeholder="e.g., Data Mining in Legal Systems" />
          <Input label="Notes (optional)" name="notes" type="textarea" placeholder="Add problem statement / objectives" />
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
          <div className="p-4 rounded-xl bg-indigo-50 border text-sm">
            Proceed to payment to enable full PDF download after submission.
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="px-4 py-2 rounded-lg bg-emerald-600 text-white" onClick={()=>setForm(f=>({...f, paymentVerified:true}))}>Mock: Mark as Paid</button>
            <span className={`text-sm ${form.paymentVerified?"text-emerald-700":"text-gray-500"}`}>{form.paymentVerified?"Payment verified":"Awaiting payment"}</span>
          </div>
        </div>
      )}

      {stepId === "done" && (
        <div className="text-sm text-gray-700">All steps complete. Submit to finish the journey.</div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button type="button" onClick={onStageSummary} className="px-4 py-2 rounded-lg border">Stage Summary</button>
        {stepId === "done" ? (
          <button type="button" onClick={onFinish} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Submit → Finish</button>
        ) : (
          <button type="button" disabled={!isValid} title={!isValid?"Complete current step first":""} className={`px-4 py-2 rounded-lg text-white ${isValid?"bg-indigo-600":"bg-gray-300 cursor-not-allowed"}`} onClick={onStageSummary}>Next</button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Main Shell -------------------------------- */
export default function ResearchNav() {
  const [form, setForm] = useState(() => {
    try { return { ...INITIAL, ...(JSON.parse(localStorage.getItem(LS_KEY)||"{}")) }; } catch { return INITIAL; }
  });
  const steps = useMemo(()=>computeStepsState(form), [form]);
  const [currentId, setCurrentId] = useState("topic");
  const [showSummary, setShowSummary] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const percent = pctFromSteps(steps);

  // lock next path: calculate next unlocked step id
  useEffect(()=>{
    // ensure current remains valid; if current completed, allow moving to the next unlocked by user
  }, [steps, currentId]);

  const goToNext = () => {
    const order = MILESTONES.map(s=>s.id);
    const idx = order.indexOf(currentId);
    // Only move if current is valid
    const currReq = (MILESTONES.find(m=>m.id===currentId)?.required)||[];
    const valid = currReq.every(k=>!!form[k]);
    if (!valid) { setShowSummary(true); return; }
    const nextId = order[Math.min(idx+1, order.length-1)];
    setCurrentId(nextId);
  };

  const onJump = (id) => {
    // allow jump back freely; prevent jumping forward into locked
    const st = steps.find(s=>s.id===id);
    if (st?.status === "locked") return;
    setCurrentId(id);
  };

  const onFinish = () => {
    // lock editing (in real app: POST /submit)
    setShowEnd(true);
  };

  const curr = steps.find(s=>s.id===currentId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-lg font-bold">Research Navigation</div>
            <div className="text-sm text-gray-600">{percent}% complete</div>
          </div>

          <div className="mt-3">
            <MilestoneBar steps={steps} onJump={onJump} />
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-6xl mx-auto p-6 grid lg:grid-cols-10 gap-6">
        <section className="lg:col-span-7">
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
        </section>

        <aside className="lg:col-span-3">
          <RightRail form={form} />
        </aside>
      </main>

      {/* Stage Summary Popup */}
      <StageSummaryPopup open={showSummary} onClose={()=>setShowSummary(false)} form={form} steps={steps} />

      {/* End Ceremony */}
      <EndCeremony open={showEnd} onClose={()=>setShowEnd(false)} paymentVerified={!!form.paymentVerified} onVerifyPayment={()=>setForm(f=>({...f, paymentVerified:true}))} />
    </div>
  );
}

// To mount: import ResearchNav and render at a new route like /research-nav
// <Route path="/research-nav" element={<ResearchNav />} />
