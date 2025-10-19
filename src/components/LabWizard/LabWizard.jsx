import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ───────────────────────────── THEME (Peacock) ───────────────────────────── */
const THEME = {
  pageGrad: "linear-gradient(180deg,#053532 0%, #085a54 50%, #0b2f2d 100%)",
  card: "#0f3a38",
  paper: "#022f2d",
  border: "#1d514e",
  ink: "#f6f8f7",
  inkSoft: "#c1d6d2",
  aqua: "#00ffd9",
  aquaSoft: "#93e2d2",
  success: "#1bbf8a",
  warn: "#eab308",
};

/* ───────────────────────────── DATA / OPTIONS ───────────────────────────── */
const STREAMS = ["10th", "12th", "UG", "PG", "PhD"];

const GOV_DEPTS = [
  "Agriculture & Farmers Welfare",
  "Education (MoE)",
  "Health & Family Welfare",
  "Home Affairs",
  "Law & Justice",
  "Environment, Forest & Climate Change",
  "Electronics & IT",
  "Science & Technology",
  "Social Justice & Empowerment",
  "Women & Child Development",
];

const UGC_SUBJECTS = [
  "Political Science",
  "Law / Jurisprudence",
  "Economics",
  "Sociology",
  "Public Administration",
  "Computer Science",
  "Management",
  "History",
  "Philosophy",
];

/* ───────────────────────────── LOCAL STORAGE ───────────────────────────── */
const LS_PREFIX = "labwizard:v1:";

/* helpers */
const readLS = (k, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(LS_PREFIX + k));
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const writeLS = (k, v) => {
  try {
    localStorage.setItem(LS_PREFIX + k, JSON.stringify(v));
  } catch {}
};

/* ───────────────────────────── BACKDROP ───────────────────────────── */
function PeacockBackdrop() {
  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0" style={{ background: THEME.pageGrad }} />
      <div
        className="absolute inset-0 opacity-[.12] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(#00ffc8 1px, transparent 1px), radial-gradient(#00ffc8 1px, transparent 1px)",
          backgroundSize: "8px 8px, 12px 12px",
          backgroundPosition: "0 0, 3px 3px",
        }}
      />
    </div>
  );
}

/* ───────────────────────────── MODULE CARD (Dropdown) ───────────────────────────── */
function ModuleCard({ title, subtitle, badge, open, onToggle, children, disabled }) {
  return (
    <motion.div
      layout
      className="rounded-2xl border shadow-lg overflow-hidden"
      style={{ background: THEME.card, borderColor: THEME.border, color: THEME.ink }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        onClick={onToggle}
        disabled={disabled}
        className="w-full text-left px-5 py-4 flex items-center gap-4 disabled:opacity-60"
      >
        <div
          className="h-10 w-10 rounded-xl grid place-items-center"
          style={{ background: "#033532", border: `1px solid ${THEME.border}` }}
        >
          <span aria-hidden>🧪</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            {badge && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "#033532",
                  border: `1px solid ${THEME.border}`,
                  color: THEME.aqua,
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && <div className="text-sm" style={{ color: THEME.inkSoft }}>{subtitle}</div>}
        </div>
        <div
          className="ml-3 text-sm px-3 py-1 rounded-full"
          style={{ background: "#033532", border: `1px solid ${THEME.border}`, color: THEME.aqua }}
        >
          {open ? "Hide" : "Open"}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-5 pb-5"
          >
            <div
              className="rounded-xl p-4"
              style={{ background: THEME.paper, border: `1px solid ${THEME.border}` }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ───────────────────────────── PROGRESS STRIP (Domino-style) ───────────────────────────── */
const stripBase = "h-2 rounded-full overflow-hidden w-full";
function ProgressStrip({ total, current }) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div>
      <div className={stripBase} style={{ background: "#0a4d47" }}>
        <motion.div
          className="h-full"
          style={{ background: THEME.aqua }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>
      <div className="mt-1 text-xs" style={{ color: THEME.inkSoft }}>
        Step {current + 1}/{total} · {pct}% complete
      </div>
    </div>
  );
}

/* ───────────────────────────── PROPOSAL WIZARD (MODULE #1) ───────────────────────────── */

const PROPOSAL_STEPS = ["Details", "Lab", "Preview"];

const emptyProposal = {
  name: "",
  gender: "Other",
  nationality: "",
  place: "",
  university: "",
  stream: "",
  researchAreaDept: "",
  researchAreaSubject: "",
  title: "",
  abstract: "",
  pages: "",
  labOption: "", // "self" | "pro"
};

function ProposalWizard({ onClose }) {
  const [data, setData] = useState(() => readLS("proposal:data", emptyProposal));
  const [step, setStep] = useState(() => readLS("proposal:step", 0));

  const next = () => setStep(s => Math.min(s + 1, PROPOSAL_STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));
  const go = (n) => setStep(() => n);

  // Save to LS
  useEffect(() => { writeLS("proposal:data", data); }, [data]);
  useEffect(() => { writeLS("proposal:step", step); }, [step]);

  const canNext =
    step === 0
      ? data.name &&
        data.nationality &&
        data.place &&
        data.university &&
        data.stream &&
        data.researchAreaDept &&
        data.researchAreaSubject &&
        data.title &&
        data.abstract &&
        data.pages
      : step === 1
      ? !!data.labOption
      : true;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-[min(880px,95vw)] rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: THEME.card, borderColor: THEME.border, color: THEME.ink }}
        initial={{ y: 24, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: THEME.border }}
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-grid place-items-center h-9 w-9 rounded-xl"
              style={{ background: "#033532", border: `1px solid ${THEME.border}` }}
            >
              📘
            </span>
            <div>
              <div className="font-semibold">Research Proposal / Synopsis</div>
              <div className="text-xs" style={{ color: THEME.inkSoft }}>
                {PROPOSAL_STEPS[step]}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ background: "#033532", border: `1px solid ${THEME.border}`, color: THEME.aqua }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 pt-4">
          <ProgressStrip total={PROPOSAL_STEPS.length} current={step} />
        </div>

        {/* Body (scrollable) */}
        <div className="px-5 pb-5 max-h-[70vh] overflow-auto mt-4">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="grid md:grid-cols-2 gap-4"
              >
                <Field label="Full Name" value={data.name} onChange={(v) => setData({ ...data, name: v })} />
                <Select
                  label="Gender"
                  value={data.gender}
                  onChange={(v) => setData({ ...data, gender: v })}
                  options={["Male", "Female", "Other"]}
                />
                <Field label="Nationality" value={data.nationality} onChange={(v) => setData({ ...data, nationality: v })} />
                <Field label="Place / City" value={data.place} onChange={(v) => setData({ ...data, place: v })} />
                <Field label="University / College" value={data.university} onChange={(v) => setData({ ...data, university: v })} />
                <Select label="Stream" value={data.stream} onChange={(v) => setData({ ...data, stream: v })} options={STREAMS} />
                <Select
                  label="Research Area (Govt Dept)"
                  value={data.researchAreaDept}
                  onChange={(v) => setData({ ...data, researchAreaDept: v })}
                  options={GOV_DEPTS}
                />
                <Select
                  label="Research Area (UGC Subject)"
                  value={data.researchAreaSubject}
                  onChange={(v) => setData({ ...data, researchAreaSubject: v })}
                  options={UGC_SUBJECTS}
                />
                <div className="md:col-span-2">
                  <Field label="Research Title" value={data.title} onChange={(v) => setData({ ...data, title: v })} />
                </div>
                <div className="md:col-span-2">
                  <TextArea
                    label="Abstract / Summary"
                    rows={5}
                    value={data.abstract}
                    onChange={(v) => setData({ ...data, abstract: v })}
                  />
                </div>
                <Field
                  label="Required Page Count"
                  type="number"
                  value={data.pages}
                  onChange={(v) => setData({ ...data, pages: v })}
                />
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="grid sm:grid-cols-2 gap-4"
              >
                <LabOption
                  title="Create in Your Lab"
                  desc="Work independently with the wizard and auto-save."
                  selected={data.labOption === "self"}
                  onSelect={() => setData({ ...data, labOption: "self" })}
                />
                <LabOption
                  title="Create with Professionals"
                  desc="Hand off to our experts. Admin will see your details."
                  selected={data.labOption === "pro"}
                  onSelect={() => setData({ ...data, labOption: "pro" })}
                />
                <div className="sm:col-span-2 text-xs" style={{ color: THEME.inkSoft }}>
                  Your choice can be changed later. Admin-only visibility is automatically handled on the backend; students never
                  see admin tools.
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <PreviewCard data={data} onEdit={() => go(0)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: THEME.border }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: THEME.inkSoft }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: THEME.aqua }} />
            Auto-saved locally
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={step === 0}
              className="px-3 py-2 rounded-lg text-sm disabled:opacity-50"
              style={{ background: "#033532", border: `1px solid ${THEME.border}`, color: THEME.ink }}
            >
              ← Back
            </button>
            {step < PROPOSAL_STEPS.length - 1 ? (
              <button
                onClick={next}
                disabled={!canNext}
                className="px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                style={{ background: THEME.aqua, color: "#022724" }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{ background: THEME.success, color: "white" }}
              >
                Done ✓
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* Reusable inputs (styled to match Peacock theme) */
function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <div className="text-sm mb-1" style={{ color: THEME.inkSoft }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
        style={{
          background: THEME.paper,
          color: THEME.ink,
          borderColor: THEME.border,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,.05)",
        }}
      />
    </label>
  );
}
function TextArea({ label, value, onChange, rows = 4 }) {
  return (
    <label className="block">
      <div className="text-sm mb-1" style={{ color: THEME.inkSoft }}>{label}</div>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
        style={{
          background: THEME.paper,
          color: THEME.ink,
          borderColor: THEME.border,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,.05)",
        }}
      />
    </label>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-sm mb-1" style={{ color: THEME.inkSoft }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
        style={{ background: THEME.paper, color: THEME.ink, borderColor: THEME.border }}
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
function LabOption({ title, desc, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-xl p-4 border transition-all ${selected ? "ring-2" : ""}`}
      style={{
        background: THEME.paper,
        borderColor: selected ? THEME.aqua : THEME.border,
        color: THEME.ink,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        {selected && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "#033532", border: `1px solid ${THEME.border}`, color: THEME.aqua }}
          >
            Selected
          </span>
        )}
      </div>
      <div className="text-sm mt-1" style={{ color: THEME.inkSoft }}>
        {desc}
      </div>
    </button>
  );
}
function PreviewCard({ data, onEdit }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: THEME.paper, borderColor: THEME.border, color: THEME.ink }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Preview</div>
        <button
          className="text-xs px-2 py-1 rounded border"
          style={{ background: "#033532", border: `1px solid ${THEME.border}`, color: THEME.aqua }}
          onClick={onEdit}
        >
          Edit
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-sm">
        <KV k="Name" v={data.name} />
        <KV k="Gender" v={data.gender} />
        <KV k="Nationality" v={data.nationality} />
        <KV k="Place" v={data.place} />
        <KV k="University" v={data.university} />
        <KV k="Stream" v={data.stream} />
        <KV k="Govt Dept" v={data.researchAreaDept} />
        <KV k="UGC Subject" v={data.researchAreaSubject} />
        <KV k="Title" v={data.title} className="md:col-span-2" />
        <div className="md:col-span-2">
          <div className="text-xs" style={{ color: THEME.inkSoft }}>Abstract</div>
          <div className="font-mono whitespace-pre-wrap">{data.abstract}</div>
        </div>
        <KV k="Pages" v={data.pages} />
        <KV k="Lab Option" v={data.labOption === "pro" ? "Create with Professionals" : "Create in Your Lab"} />
      </div>
    </div>
  );
}
const KV = ({ k, v, className }) => (
  <div className={className}>
    <div className="text-xs" style={{ color: THEME.inkSoft }}>{k}</div>
    <div className="font-medium break-words">{v || "—"}</div>
  </div>
);

/* ───────────────────────────── MAIN: LAB WIZARD (8 BOXES) ───────────────────────────── */

const MODULES = [
  { id: "proposal", name: "Research Proposal / Synopsis", emoji: "📘", ready: true },
  { id: "dissertation", name: "Dissertation", emoji: "📗", ready: false },
  { id: "phd", name: "PhD Thesis", emoji: "📕", ready: false },
  { id: "assignment", name: "Assignment & More", emoji: "📝", ready: false },
  { id: "correction", name: "Correction Service", emoji: "🛠️", ready: false },
  { id: "publishing", name: "Article Publishing", emoji: "📰", ready: false },
  { id: "review", name: "Journal Review", emoji: "🔎", ready: false },
  { id: "legal", name: "Legal Research", emoji: "⚖️", ready: false },
];

export default function LabWizard() {
  const [openId, setOpenId] = useState("proposal");
  const [showProposal, setShowProposal] = useState(false);

  // Progress chip for proposal box (reads LS)
  const proposalStep = readLS("proposal:step", 0);
  const proposalPct = Math.round(((proposalStep + 1) / PROPOSAL_STEPS.length) * 100);

  return (
    <div className="min-h-screen relative">
      <PeacockBackdrop />

      {/* Top Bar */}
      <header
        className="sticky top-0 z-30 backdrop-blur border-b flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(2,39,36,.7)", borderColor: THEME.border, color: THEME.aqua }}
      >
        <div className="font-semibold">Lab Wizard</div>
        <div className="text-xs" style={{ color: THEME.inkSoft }}>
          Your research journey, one box at a time
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid gap-5">
        {MODULES.map((m) => (
          <ModuleCard
            key={m.id}
            title={
              <span className="inline-flex items-center gap-2">
                <span className="text-lg">{m.emoji}</span> {m.name}
              </span>
            }
            subtitle={m.ready ? "Open to start / continue" : "Coming soon"}
            badge={m.ready ? undefined : "Soon"}
            open={openId === m.id}
            onToggle={() => setOpenId((id) => (id === m.id ? "" : m.id))}
            disabled={!m.ready}
          >
            {m.id === "proposal" ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="text-sm" style={{ color: THEME.inkSoft }}>Proposal Wizard</div>
                  <div className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: "#033532", border: `1px solid ${THEME.border}`, color: THEME.aqua }}>
                    {proposalPct}% complete
                  </div>
                </div>
                <div className="grid sm:grid-cols-[1fr_auto] gap-3">
                  <div className="text-sm" style={{ color: THEME.inkSoft }}>
                    Start the guided wizard to collect all details for your synopsis. You can edit any step later; we only reveal
                    the next step after you finish the current one.
                  </div>
                  <button
                    onClick={() => setShowProposal(true)}
                    className="px-4 py-2 rounded-lg font-semibold"
                    style={{ background: THEME.aqua, color: "#022724" }}
                  >
                    Open Wizard →
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm" style={{ color: THEME.inkSoft }}>
                This module is planned. Your current theme and logic will be reused here.
              </div>
            )}
          </ModuleCard>
        ))}
      </main>

      {/* Proposal Modal */}
      <AnimatePresence>{showProposal && <ProposalWizard onClose={() => setShowProposal(false)} />}</AnimatePresence>
    </div>
  );
}
