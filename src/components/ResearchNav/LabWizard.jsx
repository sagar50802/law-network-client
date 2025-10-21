// src/components/ResearchNav/LabWizard.jsx
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

/* ─────────────── THEME ─────────────── */
const THEME = {
  pageGrad: "linear-gradient(180deg,#053532 0%, #085a54 50%, #0b2f2d 100%)",
  card: "#0f3a38",
  paper: "#022f2d",
  border: "#1d514e",
  ink: "#f6f8f7",
  inkSoft: "#c1d6d2",
  aqua: "#00ffd9",
  success: "#1bbf8a",
};

/* ─────────────── STATIC OPTIONS ─────────────── */
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

/* ─────────────── LOCAL STORAGE HELPERS ─────────────── */
const LS_PREFIX = "labwizard:v1:";
const readLS = (k, f) => {
  try {
    return JSON.parse(localStorage.getItem(LS_PREFIX + k)) ?? f;
  } catch {
    return f;
  }
};
const writeLS = (k, v) => {
  try {
    localStorage.setItem(LS_PREFIX + k, JSON.stringify(v));
  } catch {}
};

/* ─────────────── BACKDROP ─────────────── */
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

/* ─────────────── TOAST ─────────────── */
function Toast({ show, text }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-6 right-6 z-[60]"
        >
          <div
            className="px-3 py-2 rounded-lg text-sm border shadow-lg"
            style={{ background: "#033532", borderColor: THEME.border, color: THEME.ink }}
          >
            {text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────── INPUTS ─────────────── */
function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <div className="text-sm mb-1" style={{ color: THEME.inkSoft }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
        style={{ background: THEME.paper, color: THEME.ink, borderColor: THEME.border }}
      />
    </label>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-sm mb-1" style={{ color: THEME.inkSoft }}>
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
        style={{ background: THEME.paper, color: THEME.ink, borderColor: THEME.border }}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
function TextArea({ label, value, onChange, rows = 4 }) {
  return (
    <label className="block">
      <div className="text-sm mb-1" style={{ color: THEME.inkSoft }}>
        {label}
      </div>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
        style={{ background: THEME.paper, color: THEME.ink, borderColor: THEME.border }}
      />
    </label>
  );
}

/* ─────────────── MAIN FORM MODAL ─────────────── */
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

function StudentForm({ onClose }) {
  const navigate = useNavigate();
  const [data, setData] = useState(() => readLS("proposal:data", emptyProposal));
  const [step, setStep] = useState(0); // 0: fields, 1: lab choice
  const [showToast, setShowToast] = useState(false);

  const formComplete =
    data.name &&
    data.nationality &&
    data.place &&
    data.university &&
    data.stream &&
    data.researchAreaDept &&
    data.researchAreaSubject &&
    data.title &&
    data.abstract &&
    data.pages;

  // Persist as user types
  useEffect(() => {
    writeLS("proposal:data", data);
  }, [data]);

  const pingSaveToast = (msg = "Submission saved locally ✓") => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1200);
  };

  const goNextToOptions = () => {
    if (!formComplete) return;
    writeLS("proposal:data", data);
    pingSaveToast("Form saved ✓");
    // small delay to let toast appear
    setTimeout(() => setStep(1), 250);
  };

  const handleContinue = () => {
    if (!data.labOption) return;
    writeLS("proposal:data", data);
    pingSaveToast();
    // Navigate automatically for "Create in Your Lab"
    setTimeout(() => {
      if (data.labOption === "self") {
        navigate("/research-nav/journey");
      } else {
        onClose?.(); // For "Create with Professionals", close for now (admin flow later)
      }
    }, 350);
  };

  return (
    <>
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
          {/* HEADER */}
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
                <div className="font-semibold">Student Form</div>
                <div className="text-xs" style={{ color: THEME.inkSoft }}>
                  Step {step + 1}/2
                </div>
              </div>
            </div>
          </div>

          {/* BODY */}
          <div className="px-5 pb-5 max-h-[70vh] overflow-auto mt-4">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="form1"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field
                      label="Full Name"
                      value={data.name}
                      onChange={(v) => setData({ ...data, name: v })}
                    />
                    <Select
                      label="Gender"
                      value={data.gender}
                      onChange={(v) => setData({ ...data, gender: v })}
                      options={["Male", "Female", "Other"]}
                    />
                    <Field
                      label="Nationality"
                      value={data.nationality}
                      onChange={(v) => setData({ ...data, nationality: v })}
                    />
                    <Field
                      label="Place / City"
                      value={data.place}
                      onChange={(v) => setData({ ...data, place: v })}
                    />
                    <Field
                      label="University / College"
                      value={data.university}
                      onChange={(v) => setData({ ...data, university: v })}
                    />
                    <Select
                      label="Stream"
                      value={data.stream}
                      onChange={(v) => setData({ ...data, stream: v })}
                      options={STREAMS}
                    />
                    <Select
                      label="Research Area (Govt Dept)"
                      value={data.researchAreaDept}
                      onChange={(v) => setData({ ...data, researchAreaDept: v })}
                      options={GOV_DEPTS}
                    />
                    <Select
                      label="Research Area (UGC Subject)"
                      value={data.researchAreaSubject}
                      onChange={(v) =>
                        setData({ ...data, researchAreaSubject: v })
                      }
                      options={UGC_SUBJECTS}
                    />
                    <div className="md:col-span-2">
                      <Field
                        label="Research Title"
                        value={data.title}
                        onChange={(v) => setData({ ...data, title: v })}
                      />
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
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="form2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <LabOption
                      title="🧠 Create in Your Lab"
                      desc="Work independently with the wizard and auto-save."
                      selected={data.labOption === "self"}
                      onSelect={() => setData({ ...data, labOption: "self" })}
                      disabled={!formComplete}
                    />
                    <LabOption
                      title="👨‍🏫 Create with Professionals"
                      desc="Hand off to our experts. Admin will see your details."
                      selected={data.labOption === "pro"}
                      onSelect={() => setData({ ...data, labOption: "pro" })}
                      disabled={!formComplete}
                    />
                  </div>
                  <div className="text-xs mt-2" style={{ color: THEME.inkSoft }}>
                    Options unlock after you complete the form above.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FOOTER (no Back button by design) */}
          <div
            className="px-5 py-4 border-t flex items-center justify-end gap-2"
            style={{ borderColor: THEME.border }}
          >
            {step === 0 ? (
              <button
                onClick={goNextToOptions}
                disabled={!formComplete}
                className="px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                style={{ background: THEME.aqua, color: "#022724" }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleContinue}
                disabled={!data.labOption}
                className="px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                style={{ background: THEME.success, color: "#022724" }}
              >
                Continue →
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>

      <Toast show={showToast} text="Submission saved ✓" />
    </>
  );
}

function LabOption({ title, desc, selected, onSelect, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={onSelect}
      className={`text-left rounded-xl p-4 border transition-all ${
        selected ? "ring-2" : ""
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
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

/* ─────────────── PAGE WRAPPER ─────────────── */
export default function LabWizard() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen relative">
      <PeacockBackdrop />

      <header
        className="sticky top-0 z-30 backdrop-blur border-b flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(2,39,36,.7)", borderColor: THEME.border, color: THEME.aqua }}
      >
        <div className="font-semibold">Student Form</div>
        <div className="text-xs" style={{ color: THEME.inkSoft }}>
          Begin your research journey by filling this form
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div
          className="rounded-2xl border shadow-lg p-6"
          style={{ background: THEME.card, borderColor: THEME.border }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Student Form</h2>
          </div>
          <p className="text-sm mb-5" style={{ color: THEME.inkSoft }}>
            Fill out the form with accurate details to start your guided research journey.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg font-semibold"
            style={{ background: THEME.aqua, color: "#022724" }}
          >
            Fill the Form →
          </button>
        </div>
      </main>

      <AnimatePresence>
        {showForm && <StudentForm onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </div>
  );
}
