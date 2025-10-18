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

/* 🦚 Updated Peacock Theme */
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

/* ─────────────────────────── Gating / Progress ─────────────────────────── */
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

/* ───────────────────────── Typewriter hook ───────────────────────── */
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
      {/* diagonal shimmer reflection */}
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

/* ─────────────────── Vertical “Water” Track (modern style) ─────────────────── */
function WaterTrack({ gates, activeId, onClick }) {
  const visible = gates.filter((s) => s.state !== "locked"); // only unlocked
  const H = (visible.length + 1) * 140;
  const pathD =
    `M22 12 ` +
    Array.from({ length: visible.length })
      .map(
        (_, i) =>
          `C22 ${i * 140 + 54}, 22 ${i * 140 + 98}, 22 ${i * 140 + 128}`
      )
      .join(" ");

  return (
    <div
      className="rounded-[26px] px-4 py-5 shadow-[0_30px_80px_rgba(0,0,0,.35)] relative overflow-hidden"
      style={{
        background: PALETTE.card,
        border: `1px solid ${PALETTE.border}`,
      }}
    >
      {/* water surface shimmer (diagonal) */}
      <div className="absolute inset-0 opacity-[.08] animate-[wave_8s_linear_infinite] bg-[linear-gradient(120deg,rgba(0,255,217,.3)_0%,transparent_40%,rgba(0,255,217,.3)_80%)] bg-[length:200%_200%]" />
      <div className="grid grid-cols-[48px_1fr] gap-4 relative z-10">
        {/* Rail */}
        <div className="relative">
          <svg width="48" height={H} viewBox={`0 0 48 ${H}`} className="block">
            <defs>
              <linearGradient id="liq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00ffd9" />
                <stop offset="100%" stopColor="#3fe2bf" />
              </linearGradient>
              {/* subtle glow for the water path */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* dark pipe underlay */}
            <path
              d={pathD}
              stroke="#144945"
              strokeWidth="11"
              strokeLinecap="round"
            />
            {/* glowing, flowing water */}
            <path
              d={pathD}
              stroke="url(#liq)"
              strokeWidth="5"
              strokeLinecap="round"
              className="animate-dash"
              strokeDasharray="28 28"
              filter="url(#glow)"
            />

            {/* bubbles at each node */}
            {visible.map((_, i) => (
              <circle
                key={i}
                cx="22"
                cy={i * 140 + 12}
                r="6"
                fill="#3fe2bf"
                className="animate-bubble"
              />
            ))}
            <circle
              cx="22"
              cy={visible.length * 140 + 4}
              r="3.5"
              fill="#275d5b"
              opacity=".6"
            />
          </svg>

          {/* Nodes */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0">
            {visible.map((s, i) => {
              const top = i * 140 + 12;
              const active = s.id === activeId;
              const done = s.state === "completed";
              return (
                <button
                  key={s.id}
                  style={{ top }}
                  onClick={() => onClick?.(s.id)}
                  className={[
                    "absolute -left-[22px] w-14 h-14 rounded-full grid place-items-center select-none text-2xl",
                    active &&
                      "bg-[#022724] text-[#00ffd9] border-2 border-[#00ffd9] shadow-[0_0_30px_rgba(0,255,217,.45)]",
                    done &&
                      "bg-[#1bbf8a] text-white shadow-[0_0_0_14px_rgba(27,191,138,.25)]",
                    !active &&
                      !done &&
                      "bg-[#053532] text-[#00ffd9] border border-[#1e8073]",
                  ].join(" ")}
                  title={STEPS.find((x) => x.id === s.id)?.label}
                >
                  <span className="animate-ripple text-[28px]">
                    {STEPS.find((x) => x.id === s.id)?.icon}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current visible card (unchanged layout/logic) */}
        <div className="relative">
          {visible.slice(-1).map((s) => {
            const active = s.id === activeId;
            return (
              <div key={s.id} className="mb-[110px] last:mb-0">
                <div
                  className={[
                    "rounded-2xl px-4 py-3 shadow-sm",
                    active ? "ring-2 ring-[#00ffd9]/45" : "hover:shadow-md",
                  ].join(" ")}
                  style={{
                    background: PALETTE.card,
                    border: `1px solid ${PALETTE.border}`,
                    color: PALETTE.ink,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-lg">
                      {STEPS.find((x) => x.id === s.id)?.icon}{" "}
                      {STEPS.find((x) => x.id === s.id)?.label}
                    </div>
                    <span
                      className="text-[11px] rounded-full px-2 py-0.5 border"
                      style={{
                        background: active ? "#044c46" : "#0c3d3a",
                        borderColor: PALETTE.border,
                        color: active ? "#00ffd9" : "#c1d6d2",
                      }}
                    >
                      {active ? "In progress" : "Ready"}
                    </span>
                  </div>
                </div>
                <div className="pl-2 mt-6">
                  <div className="inline-flex items-center gap-2 text-[#93e2d2] text-sm opacity-80">
                    <span className="h-2 w-2 rounded-full bg-[#00ffd9] animate-ping" />
                    <span>Next step ahead…</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes dash { to { stroke-dashoffset: -56; } }
        .animate-dash { animation: dash 2.2s linear infinite; stroke-dashoffset: 0; }

        @keyframes bubble {
          0% { transform: translateY(0); opacity: .9; }
          100% { transform: translateY(-30px); opacity: 0; }
        }
        .animate-bubble { animation: bubble 3s ease-in-out infinite; }

        @keyframes ripple {
          0%{box-shadow:0 0 0 0 rgba(0,255,217,.40);}
          70%{box-shadow:0 0 0 14px rgba(0,255,217,0);}
          100%{box-shadow:0 0 0 0 rgba(0,255,217,0);}
        }
        .animate-ripple { animation: ripple 2.6s ease-out infinite; }

        @keyframes wave {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 200%; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────── Bottom progress pill ─────────────────────────────── */
function BottomPill({ progress, onOpen }) {
  return (
    <motion.div
      className="fixed bottom-5 right-5 flex items-center gap-3 cursor-pointer px-4 py-2 rounded-full shadow-md"
      style={{
        background: "#033532cc",
        border: `1px solid ${PALETTE.border}`,
        color: PALETTE.ink,
      }}
      onClick={onOpen}
      whileHover={{ scale: 1.05 }}
    >
      <div className="h-2 w-24 bg-[#0a4d47] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[#00ffd9]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <span className="text-sm">{progress}%</span>
    </motion.div>
  );
}

/* ──────────────────────────────── Step Form ──────────────────────────────── */
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
    <motion.div
      key={stepId}
      className="rounded-2xl p-5 shadow-lg border"
      style={{
        background: PALETTE.card,
        borderColor: PALETTE.border,
        color: PALETTE.ink,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
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
          rows={4}
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
            rows={4}
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
    </motion.div>
  );
}

/* ──────────────────────────────── Live Preview ──────────────────────────────── */
function LivePreview({ form }) {
  const txt =
    `📘  Topic: ${form.title || "—"}\n\n` +
    `📚  Literature: ${form.lit || "—"}\n\n` +
    `🧪  Method: ${form.method || "—"}\n\n` +
    `🧰  Tools: ${form.tools || "—"}\n\n` +
    `💳  Payment: ${form.paymentVerified ? "✅ Verified" : "⏳ Pending"}`;
  const typed = useTypewriter(txt, 12);

  return (
    <div
      className="rounded-2xl p-5 border shadow-md font-mono whitespace-pre-wrap text-sm leading-relaxed"
      style={{
        background: "#022f2d",
        borderColor: "#10403b",
        color: "#e5f7f4",
      }}
    >
      {typed}
      <span className="animate-pulse ml-1 text-[#00ffd9]">|</span>
    </div>
  );
}

/* ──────────────────────────────── Summary Popup ──────────────────────────────── */
function SummaryPopup({ open, onClose, form, gates }) {
  if (!open) return null;
  const done = gates.filter((g) => g.state === "completed").length;
  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="rounded-2xl p-6 shadow-2xl w-[520px] max-w-[90vw] relative overflow-y-auto max-h-[90vh]"
        style={{
          background: "#033532",
          border: `1px solid ${PALETTE.border}`,
          color: PALETTE.ink,
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-[#c1d6d2] hover:text-[#00ffd9] text-xl"
          title="Close"
        >
          ✕
        </button>
        <h2 className="text-lg font-semibold mb-2 text-[#00ffd9]">
          Progress Summary
        </h2>
        <p className="text-sm text-[#c1d6d2] mb-4">
          Completed {done}/{STEPS.length - 1} stages
        </p>
        <LivePreview form={form} />
        <div className="text-right mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[#022724] font-semibold"
            style={{ background: "#00ffd9" }}
          >
            Continue →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ──────────────────────────────── Main Component ──────────────────────────────── */
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
  const [showSummary, setShowSummary] = useState(false);

  const order = STEPS.map((s) => s.id);
  const progress = pct(gates);

  const handleNext = () => {
    const idx = order.indexOf(activeId);
    if (idx < order.length - 1) setActiveId(order[idx + 1]);
    else setShowSummary(true);
  };

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(form));
  }, [form]);

  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden">
      <StudioBackdrop />

      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur border-b flex justify-between items-center px-6 py-3"
        style={{
          background: "rgba(2, 39, 36, 0.7)",
          borderColor: PALETTE.border,
          color: "#00ffd9",
        }}
      >
        <h1 className="text-lg font-semibold">Research Navigation</h1>
        <span className="text-sm text-[#9de1d6]">{progress}% Complete</span>
      </header>

      {/* Body Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 px-4 sm:px-6 py-8">
        {/* Left column: WaterTrack */}
        <div className="xl:col-span-3">
          <WaterTrack
            gates={gates}
            activeId={activeId}
            onClick={setActiveId}
          />
        </div>

        {/* Middle column: StepForm */}
        <div className="xl:col-span-5">
          <AnimatePresence mode="wait">
            <StepForm
              key={activeId}
              stepId={activeId}
              form={form}
              setForm={setForm}
              onNext={handleNext}
            />
          </AnimatePresence>
        </div>

        {/* Right column: LivePreview */}
        <div className="xl:col-span-4">
          <LivePreview form={form} />
        </div>
      </main>

      {/* Floating summary popup */}
      <AnimatePresence>
        {showSummary && (
          <SummaryPopup
            open={showSummary}
            onClose={() => setShowSummary(false)}
            form={form}
            gates={gates}
          />
        )}
      </AnimatePresence>

      {/* Bottom pill progress */}
      <BottomPill progress={progress} onOpen={() => setShowSummary(true)} />
    </div>
  );
}
