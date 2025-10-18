// src/components/ResearchNav/ResearchNav.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ───────────────────────────── Milestones ───────────────────────────── */
const STEPS = [
  { id: "idea", label: "Idea", icon: "💡", need: ["title"], etaMin: 6 },
  { id: "review", label: "Review", icon: "🔎", need: ["lit"], etaMin: 10 },
  { id: "method", label: "Method", icon: "🧪", need: ["method"], etaMin: 12 },
  { id: "payment", label: "Payment", icon: "💳", need: [], etaMin: 3 },
  { id: "done", label: "Submission", icon: "🏁", need: [], etaMin: 0 },
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
  paymentProofName: "",
};

/* 🦚 Peacock Theme */
const PALETTE = {
  paper: "#0b2f2d",
  card: "#0f3a38",
  border: "#1d514e",
  ink: "#f6f8f7",
  inkSoft: "#c1d6d2",
  blue: "#3fe2bf",
  blueSoft: "#88f7dd",
  mint: "#1bbf8a",
};

const LS_KEY = "researchnav:soft3d:strict";

/* ─────────────────────────── Gating / Progress (unchanged) ─────────────────────────── */
function gate(form) {
  const out = [];
  let lock = false;
  for (const s of STEPS) {
    if (s.id === "done") {
      out.push({ ...s, state: "locked" });
      continue;
    }
    if (lock) {
      out.push({ ...s, state: "locked" });
      continue;
    }
    const ok = (s.need || []).every((k) => !!form[k]);
    out.push({ ...s, state: ok ? "completed" : "in_progress" });
    if (!ok) lock = true;
  }
  // Payment only unlocks once Method is complete
  const mOK = (STEPS.find((x) => x.id === "method").need || []).every(
    (r) => !!form[r]
  );
  const pay = out.find((x) => x.id === "payment");
  if (pay) pay.state = mOK ? "in_progress" : "locked";
  return out;
}
const pct = (g) =>
  Math.round(
    (g.filter((s) => s.id !== "done" && s.state === "completed").length /
      (STEPS.length - 1)) *
      100
  );

/* ───────────────────────── Typewriter hook (unchanged) ───────────────────────── */
function useTypewriter(text, speed = 16) {
  const [out, setOut] = useState("");
  const t = useRef(null);
  useEffect(() => {
    if (t.current) clearInterval(t.current);
    setOut("");
    let i = 0;
    t.current = setInterval(() => {
      setOut(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(t.current);
    }, Math.max(8, speed));
    return () => clearInterval(t.current);
  }, [text, speed]);
  return out;
}

/* ─────────────────────── Peacock Background ─────────────────────── */
function StudioBackdrop() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,#053532 0%, #085a54 50%, #0b2f2d 100%)",
        }}
      />
      {/* soft diagonal water reflection */}
      <div
        className="absolute inset-0 opacity-[.12] animate-[shimmer_6s_linear_infinite]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(0,255,217,.15) 0%, transparent 40%, rgba(0,255,217,.15) 80%)",
          backgroundSize: "200% 200%",
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 200%; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────── Domino’s-style tracker (only completed + current) ───────────────────── */
function DominoTracker({ gates, activeId, onSelect }) {
  // Only show completed + the first in_progress (current). No future steps.
  const visible = gates.filter((s) => s.state !== "locked");

  return (
    <div
      className="rounded-2xl p-3 border shadow-md overflow-x-auto"
      style={{ background: PALETTE.card, borderColor: PALETTE.border }}
    >
      <div className="flex items-stretch gap-2 min-w-[560px]">
        {visible.map((s, i) => {
          const isActive = s.id === activeId;
          const isDone = s.state === "completed";
          return (
            <button
              key={s.id}
              onClick={() => onSelect?.(s.id)}
              className={[
                "flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                isActive
                  ? "ring-2 ring-[#00ffd9]/50"
                  : "hover:bg-[#0b403d]/40",
              ].join(" ")}
              style={{
                background: isDone
                  ? "linear-gradient(180deg,#0a443f,#093a36)"
                  : "#0c3d3a",
                borderColor: PALETTE.border,
                color: PALETTE.ink,
              }}
              title={STEPS.find((x) => x.id === s.id)?.label}
            >
              <span
                className={[
                  "w-8 h-8 grid place-items-center rounded-full text-lg border",
                  isDone
                    ? "bg-[#1bbf8a] text-white border-transparent"
                    : isActive
                    ? "text-[#00ffd9] border-[#00ffd9]"
                    : "text-[#88f7dd] border-[#295e59]",
                ].join(" ")}
              >
                {STEPS.find((x) => x.id === s.id)?.icon}
              </span>
              <div className="text-left">
                <div className="font-semibold">
                  {STEPS.find((x) => x.id === s.id)?.label}
                </div>
                <div className="text-xs opacity-80">
                  {isDone ? "Completed ✓" : isActive ? "In progress" : "Ready"}
                </div>
              </div>

              {/* connector between visible tiles */}
              {i < visible.length - 1 && (
                <div
                  className="mx-2 flex-0 w-12 h-1 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg,#00ffd9 0%, #3fe2bf 100%)",
                    boxShadow: "0 0 10px rgba(0,255,217,.35)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Wizard Modal (closable + scroll-safe) ─────────────────────────────── */
function WizardModal({ open, onClose, children, title, subtitle, complete }) {
  if (!open) return null;
  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: PALETTE.card, borderColor: PALETTE.border, color: PALETTE.ink }}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
      >
        {/* header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: PALETTE.border, background: "#0b3b38" }}
        >
          <div>
            <div className="text-lg font-bold">{title}</div>
            {subtitle && <div className="text-xs opacity-80">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-3">
            {complete && (
              <span
                className="text-xs rounded-full px-2 py-1 border"
                style={{
                  background: "#09463f",
                  borderColor: PALETTE.border,
                  color: "#00ffd9",
                }}
                title="All required fields are filled"
              >
                Completed ✓
              </span>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-sm"
              style={{
                border: `1px solid ${PALETTE.border}`,
                background: "#ffffff10",
                color: PALETTE.ink,
              }}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* body */}
        <div className="p-5 max-h-[72vh] overflow-y-auto">{children}</div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────── Step Form (inside wizard) ─────────────────────────────── */
function StepForm({ stepId, form, setForm, onNext }) {
  const t = STEPS.find((s) => s.id === stepId);
  const tw = useTypewriter(
    t
      ? `Currently on the "${t.label}" stage — please fill the required details below.`
      : "",
    20
  );

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") setForm((f) => ({ ...f, [name]: checked }));
    else if (type === "file")
      setForm((f) => ({ ...f, [name]: files[0]?.name || "" }));
    else setForm((f) => ({ ...f, [name]: value }));
  };

  return (
    <div
      className="rounded-2xl p-5 shadow-lg border"
      style={{
        background: PALETTE.card,
        borderColor: PALETTE.border,
        color: PALETTE.ink,
      }}
    >
      <div className="mb-3 font-mono text-[#00ffd9]">{tw}</div>

      {stepId === "idea" && (
        <div className="space-y-3">
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Enter your research title"
            className="w-full px-3 py-2 rounded-lg border bg-[#022f2d] text-[#f6f8f7] border-[#1d514e] focus:outline-none focus:ring-2 focus:ring-[#00ffd9]/50"
          />
        </div>
      )}

      {stepId === "review" && (
        <textarea
          name="lit"
          value={form.lit}
          onChange={handleChange}
          rows={6}
          placeholder="Brief literature review or references"
          className="w-full px-3 py-2 rounded-lg border bg-[#022f2d] text-[#f6f8f7] border-[#1d514e] focus:outline-none focus:ring-2 focus:ring-[#00ffd9]/50"
        />
      )}

      {stepId === "method" && (
        <div className="space-y-3">
          <textarea
            name="method"
            value={form.method}
            onChange={handleChange}
            rows={6}
            placeholder="Methodology outline"
            className="w-full px-3 py-2 rounded-lg border bg-[#022f2d] text-[#f6f8f7] border-[#1d514e] focus:outline-none focus:ring-2 focus:ring-[#00ffd9]/50"
          />
          <input
            name="tools"
            value={form.tools}
            onChange={handleChange}
            placeholder="Tools / software"
            className="w-full px-3 py-2 rounded-lg border bg-[#022f2d] text-[#f6f8f7] border-[#1d514e] focus:outline-none focus:ring-2 focus:ring-[#00ffd9]/50"
          />
        </div>
      )}

      {stepId === "payment" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="paymentVerified"
              checked={form.paymentVerified}
              onChange={handleChange}
              id="paymentVerified"
            />
            <label htmlFor="paymentVerified">Payment Verified</label>
          </div>
          <input
            type="file"
            name="paymentProofName"
            onChange={handleChange}
            className="text-sm text-[#c1d6d2]"
          />
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={onNext}
          className="px-4 py-2 rounded-lg font-semibold"
          style={{
            background: "#00ffd9",
            color: "#022724",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Completion Toast ─────────────────────────────── */
function CompletionToast({ label }) {
  if (!label) return null;
  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -10, opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 26 }}
      className="fixed top-16 right-6 z-40"
    >
      <div
        className="px-3 py-2 rounded-lg shadow-lg border text-sm"
        style={{
          background: "#022f2d",
          borderColor: "#1d514e",
          color: "#e5f7f4",
        }}
      >
        ✓ Completed: <span className="font-semibold">{label}</span>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────── Main Component ─────────────────────────────── */
export default function ResearchNav() {
  const [form, setForm] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || INITIAL;
    } catch {
      return INITIAL;
    }
  });

  const gates = useMemo(() => gate(form), [form]);
  const [activeId, setActiveId] = useState("idea");
  const [wizardOpen, setWizardOpen] = useState(true);
  const [justCompleted, setJustCompleted] = useState("");

  const order = STEPS.map((s) => s.id);
  const progress = pct(gates);

  const isStepComplete = (stepId) => {
    const st = STEPS.find((s) => s.id === stepId);
    if (!st) return false;
    return (st.need || []).every((k) => !!form[k]);
  };

  const handleNext = () => {
    if (isStepComplete(activeId)) {
      const label = STEPS.find((s) => s.id === activeId)?.label || "";
      setJustCompleted(label);
      setTimeout(() => setJustCompleted(""), 1600);
    }
    const idx = order.indexOf(activeId);
    if (idx < order.length - 1) {
      setActiveId(order[idx + 1]);
      setWizardOpen(true);
    }
  };

  const handleSelectFromTracker = (id) => {
    // Allow editing completed steps and the current step only (no future)
    const visibleIds = gates.filter((s) => s.state !== "locked").map((s) => s.id);
    if (!visibleIds.includes(id)) return;
    setActiveId(id);
    setWizardOpen(true);
  };

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(form));
  }, [form]);

  const current = STEPS.find((s) => s.id === activeId);
  const currentIsComplete = isStepComplete(activeId);

  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden">
      <StudioBackdrop />

      {/* Header with modern progress bar */}
      <header
        className="sticky top-0 z-30 backdrop-blur border-b px-6 py-3"
        style={{
          background: "rgba(2, 39, 36, 0.7)",
          borderColor: PALETTE.border,
          color: "#00ffd9",
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold">Research Navigation</h1>
          <div className="flex items-center gap-3 text-sm text-[#9de1d6]">
            <span>{progress}% Complete</span>
            <div className="w-36 h-2 rounded-full bg-[#0a4d47] overflow-hidden border border-[#1d514e]">
              <motion.div
                className="h-full"
                style={{
                  background:
                    "linear-gradient(90deg,#00ffd9 0%, #3fe2bf 100%)",
                  boxShadow: "0 0 14px rgba(0,255,217,.35)",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Tracker + helper text */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <DominoTracker
          gates={gates}
          activeId={activeId}
          onSelect={handleSelectFromTracker}
        />
        <div className="text-sm text-[#c1d6d2]">
          {current?.icon} <b>{current?.label}</b> —{" "}
          {currentIsComplete
            ? "Completed ✓ You can still edit before moving on."
            : "Fill the required fields to complete this step."}
        </div>
      </main>

      {/* Wizard for the active step (closable) */}
      <AnimatePresence>
        {wizardOpen && current && current.id !== "done" && (
          <WizardModal
            open={wizardOpen}
            onClose={() => setWizardOpen(false)}
            title={`${current.icon} ${current.label}`}
            subtitle={
              currentIsComplete
                ? "Completed ✓ — you can still edit before moving on."
                : "Fill the required fields and click Next."
            }
            complete={currentIsComplete}
          >
            <StepForm
              stepId={activeId}
              form={form}
              setForm={setForm}
              onNext={handleNext}
            />
          </WizardModal>
        )}
      </AnimatePresence>

      {/* Completion toast */}
      <AnimatePresence>
        {justCompleted && <CompletionToast label={justCompleted} />}
      </AnimatePresence>
    </div>
  );
}

/* ───────── Components kept but not rendered (no preview/summary UI now) ───────── */
// LivePreview & SummaryPopup are intentionally not mounted to match your request.
// They’re preserved in your repo history if you need to re-enable them later.
