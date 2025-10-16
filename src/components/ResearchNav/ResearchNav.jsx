// File: src/components/ResearchNav/ResearchNav.jsx
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ----------------------------- Config & Icons ------------------------------ */
const MILESTONES = [
  { id: "topic",      label: "Topic",      icon: "💡", required: ["title"] },
  { id: "literature", label: "Literature", icon: "📚", required: ["lit"] },
  { id: "method",     label: "Method",     icon: "🧪", required: ["method"] },
  { id: "timeline",   label: "Timeline",   icon: "⏳", required: ["start", "end"] },
  { id: "payment",    label: "Payment",    icon: "💳", required: [] },
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

/* --------------------------- Shared: MilestoneBar -------------------------- */
function MilestoneBar({ steps, onJump }) {
  return (
    <div className="w-full flex items-center justify-between">
      {steps.map((s, i) => {
        const locked = s.status === "locked";
        const completed = s.status === "completed";
        return (
          <div key={s.id} className="flex items-center gap-3">
            <button
              className={`pill ${locked ? "pill-lock" : ""}`}
              disabled={locked}
              onClick={() => !locked && onJump?.(s.id)}
              title={`${s.label}${locked ? " (Locked)" : ""}`}
            >
              <span>{s.icon}</span>
              <span className="text-sm font-semibold">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`connector ${completed ? "on" : ""}`} style={{ width: 72 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------ Stage Summary (after steps) ---------------------- */
function StageSummaryPopup({ open, onClose, form, steps }) {
  if (!open) return null;
  const completed = steps.filter(s => s.status === "completed").map(s => s.label);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="modal-paper w-full max-w-xl"
      >
        <div className="p-6 space-y-4">
          <h3 className="text-2xl section-title">Stage Summary</h3>
          <div className="text-sm ink-700">
            Completed:{" "}
            {completed.length ? (
              <span className="font-semibold ink-900">{completed.join(", ")}</span>
            ) : (
              <em>—</em>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="paper p-3">
              <div className="ink-700">Topic</div>
              <div className="font-medium break-words ink-900">
                {form.title || <em className="ink-700">Not filled</em>}
              </div>
            </div>
            <div className="paper p-3">
              <div className="ink-700">Method</div>
              <div className="font-medium">{form.method || <em className="ink-700">—</em>}</div>
            </div>
            <div className="paper p-3">
              <div className="ink-700">Timeline</div>
              <div className="font-medium">
                {form.start && form.end ? `${form.start} → ${form.end}` : <em className="ink-700">Not planned</em>}
              </div>
            </div>
            <div className="paper p-3">
              <div className="ink-700">Refs</div>
              <div className="font-mono whitespace-pre-wrap">{form.lit || <em className="ink-700">Add references</em>}</div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-paper">Close</button>
            <button onClick={onClose} className="btn-primary">Continue →</button>
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
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="modal-paper w-full max-w-xl overflow-hidden"
      >
        <div className="p-6 text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <h3 className="text-2xl section-title">Congratulations! Your proposal is now with the Controller.</h3>
          <p className="ink-700">The journey timeline is complete. Preview your draft; full PDF unlocks after payment verification.</p>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button className="btn-paper">Preview PDF (1 page)</button>
            <button
              disabled={!paymentVerified}
              title={paymentVerified ? "" : "Complete payment to enable"}
              className="btn-primary disabled:opacity-60"
            >
              Download Full PDF
            </button>
            {!paymentVerified && (
              <button onClick={onVerifyPayment} className="btn-primary">I’ve Paid → Verify</button>
            )}
          </div>
          <div className="pt-2">
            <button onClick={onClose} className="underline text-sm ink-700">Close</button>
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
      <div className="rail-card">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold ink-900">Live Preview</div>
          <span className="badge-chip">auto-save</span>
        </div>
        <div className="text-sm space-y-1">
          <div><span className="ink-700">Topic:</span> <span className="font-medium ink-900">{form.title || <em className="ink-700">—</em>}</span></div>
          <div><span className="ink-700">Literature:</span> <span className="ink-900 whitespace-pre-wrap">{form.lit || <em className="ink-700">Add references</em>}</span></div>
          <div><span className="ink-700">Method:</span> <span className="ink-900">{form.method || <em className="ink-700">—</em>}</span></div>
          <div><span className="ink-700">Timeline:</span> <span className="ink-900">{form.start && form.end ? `${form.start} → ${form.end}` : <em className="ink-700">—</em>}</span></div>
        </div>
      </div>

      <div className="rail-card">
        <div className="font-semibold ink-900 mb-2">Tips</div>
        <ul className="list-disc list-inside text-sm ink-700 space-y-1">
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
    localStorage.setItem(LS_KEY, JSON.stringify(form));
  }, [form]);

  function Input({ label, name, type = "text", placeholder }) {
    const props = {
      value: form[name] || "",
      onChange: e => setForm(f => ({ ...f, [name]: e.target.value })),
      className: "input-paper w-full",
      placeholder,
    };
    return (
      <label className="block">
        <div className="text-sm ink-700 mb-1">{label}</div>
        {type === "textarea" ? (
          <textarea rows={6} {...props} />
        ) : (
          <input type={type} {...props} />
        )}
      </label>
    );
  }

  return (
    <div className="paper p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl section-title capitalize">{stepId}</h2>
        {isValid ? (
          <span className="text-sm" style={{ color: "var(--accent-emerald)" }}>✓ Complete</span>
        ) : (
          <span className="text-sm" style={{ color: "var(--accent-amber)" }}>Complete required fields</span>
        )}
      </div>

      {stepId === "topic" && (
        <div className="grid gap-4">
          <Input label="Proposed Title" name="title" placeholder="e.g., Constitutions & Data Mining" />
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
          <div className="paper-soft p-4 text-sm ink-700">
            Complete payment to enable full PDF download after submission.
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="btn-primary" onClick={() => setForm(f => ({ ...f, paymentVerified: true }))}>
              Mock: Mark as Paid
            </button>
            <span className={`text-sm ${form.paymentVerified ? "ink-900" : "ink-700"}`}>
              {form.paymentVerified ? "Payment verified" : "Awaiting payment"}
            </span>
          </div>
        </div>
      )}

      {stepId === "done" && (
        <div className="text-sm ink-700">All steps complete. Submit to finish the journey.</div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button type="button" onClick={onStageSummary} className="btn-paper">Stage Summary</button>
        {stepId === "done" ? (
          <button type="button" onClick={onFinish} className="btn-primary">Submit → Finish</button>
        ) : (
          <button
            type="button"
            disabled={!isValid}
            title={!isValid ? "Complete current step first" : ""}
            className="btn-primary disabled:opacity-60"
            onClick={onStageSummary}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Main Shell -------------------------------- */
export default function ResearchNav() {
  const [form, setForm] = useState(() => {
    try { return { ...INITIAL, ...(JSON.parse(localStorage.getItem(LS_KEY) || "{}")) }; }
    catch { return INITIAL; }
  });
  const steps = useMemo(() => computeStepsState(form), [form]);
  const [currentId, setCurrentId] = useState("topic");
  const [showSummary, setShowSummary] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const percent = pctFromSteps(steps);

  const goToNext = () => {
    const order = MILESTONES.map(s => s.id);
    const idx = order.indexOf(currentId);
    const currReq = (MILESTONES.find(m => m.id === currentId)?.required) || [];
    const valid = currReq.every(k => !!form[k]);
    if (!valid) { setShowSummary(true); return; }
    const nextId = order[Math.min(idx + 1, order.length - 1)];
    setCurrentId(nextId);
  };

  const onJump = (id) => {
    const st = steps.find(s => s.id === id);
    if (st?.status === "locked") return;
    setCurrentId(id);
  };

  const onFinish = () => {
    setShowEnd(true);
  };

  const curr = steps.find(s => s.id === currentId);

  return (
    <div className="min-h-screen theme-parchment">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#fff8e8e6] backdrop-blur border-b border-[#f0e2c9]">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-lg font-extrabold ink-900">Research Navigation</div>
            <div className="text-sm ink-700">{percent}% complete</div>
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
            <motion.div
              key={curr?.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
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

      {/* Popups */}
      <StageSummaryPopup open={showSummary} onClose={() => setShowSummary(false)} form={form} steps={steps} />
      <EndCeremony open={showEnd} onClose={() => setShowEnd(false)} paymentVerified={!!form.paymentVerified}
