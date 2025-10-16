// src/components/ResearchNav/ResearchNav.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ───────────────────────────── Milestones & Theme ───────────────────────────── */
const STEPS = [
  { id: "topic",      label: "Idea",       icon: "💡", need: ["title"] },
  { id: "literature", label: "Review",     icon: "🔎", need: ["lit"] },
  { id: "method",     label: "Method",     icon: "🧪", need: ["method"] },
  { id: "timeline",   label: "Timeline",   icon: "🗓️", need: ["start", "end"] },
  { id: "payment",    label: "Payment",    icon: "💳", need: [] },
  { id: "done",       label: "Submission", icon: "🏁", need: [] },
];

const THEMES = {
  topic:      { bg: "from-[#E1F5FE] via-[#F3FBFF] to-[#FFF7EE]", card: "#fffaf0", glow: "#8EF6E4" },
  literature:{ bg: "from-[#F3E5F5] via-[#FBF3FF] to-[#FFF7EE]", card: "#fffaf6", glow: "#C9A6FF" },
  method:    { bg: "from-[#E0F2F1] via-[#F1FBFA] to-[#FFF7EE]", card: "#f9fffd", glow: "#6FEACB" },
  timeline:  { bg: "from-[#FFF9C4] via-[#FFFBE5] to-[#FFF7EE]", card: "#fffbed", glow: "#FFD76E" },
  payment:   { bg: "from-[#FFF2C2] via-[#FFF6E3] to-[#FFF0D1]", card: "#fff6e6", glow: "#8AB6FF" },
  done:      { bg: "from-[#EFEBE9] via-[#F9F7F5] to-[#FFF7EE]", card: "#fff4e9", glow: "#9EDBFF" },
};

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
const LS_KEY = "researchnav:soft3d:v1";

/* ───────────────────────────────── Utilities ───────────────────────────────── */
function computeGate(form) {
  const out = [];
  let lock = false;
  for (const s of STEPS) {
    if (s.id === "done") { out.push({ ...s, state: "locked" }); continue; }
    if (lock) { out.push({ ...s, state: "locked" }); continue; }
    const ok = (s.need || []).every(k => !!form[k]);
    out.push({ ...s, state: ok ? "completed" : "in_progress" });
    if (!ok) lock = true;
  }
  // payment opens only after timeline valid
  const tlOK = (STEPS.find(x => x.id === "timeline")?.need || []).every(k => !!form[k]);
  const payIdx = out.findIndex(x => x.id === "payment");
  if (payIdx >= 0) out[payIdx].state = tlOK ? "in_progress" : "locked";
  return out;
}
const percent = (g) => Math.round((g.filter(s => s.id !== "done" && s.state === "completed").length / (STEPS.length - 1)) * 100);

/* ────────────────────────────── Typewriter Hook ───────────────────────────── */
function useTypewriter(text, speed = 18) {
  const [out, setOut] = useState("");
  const timer = useRef(null);
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    setOut("");
    let i = 0;
    timer.current = setInterval(() => {
      setOut(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(timer.current);
    }, Math.max(8, speed));
    return () => clearInterval(timer.current);
  }, [text, speed]);
  return out;
}

/* ─────────────────────────── Liquid Vertical Path ─────────────────────────── */
function LiquidTrack({ gates, activeId, onClick }) {
  const H = gates.length * 150;
  const pathD =
    `M21 10 ` +
    Array.from({ length: gates.length - 1 })
      .map((_, i) => `C21 ${i*150+50}, 21 ${i*150+95}, 21 ${i*150+140}`)
      .join(" ");

  return (
    <div className="relative">
      <div className="rounded-[28px] border border-[#eadbb6] bg-[#fff2da] shadow-[0_30px_70px_rgba(120,90,40,.08)] p-5">
        <div className="grid grid-cols-[42px_1fr] gap-4">
          {/* Animated rail */}
          <div className="relative">
            <svg width="42" height={H} viewBox={`0 0 42 ${H}`} className="block">
              <path d={pathD} stroke="#eadbb6" strokeWidth="10" strokeLinecap="round" />
              <defs>
                <linearGradient id="liq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7ed3ff" />
                  <stop offset="100%" stopColor="#45b1ff" />
                </linearGradient>
              </defs>
              {/* flowing dash */}
              <path
                d={pathD}
                stroke="url(#liq)"
                strokeWidth="4"
                strokeLinecap="round"
                className="animate-dash"
                strokeDasharray="16 16"
              />
              {/* soft glow bulbs along the way */}
              {gates.map((_, i) => (
                <circle key={i} cx="21" cy={i*150+10} r="4" fill="#7ed3ff" className="animate-glow" />
              ))}
            </svg>

            {/* Nodes */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0">
              {gates.map((s, i) => {
                const top = i * 150 + 10;
                const locked = s.state === "locked";
                const current = s.id === activeId;
                const done = s.state === "completed";
                return (
                  <button
                    key={s.id}
                    style={{ top }}
                    title={locked ? `${s.label} (Locked)` : s.label}
                    disabled={locked}
                    onClick={() => !locked && onClick?.(s.id)}
                    className={[
                      "absolute -left-5 w-10 h-10 rounded-full grid place-items-center select-none",
                      locked && "bg-[#d8d1bf] text-[#8f8164]",
                      current && "bg-white text-[#45b1ff] border-2 border-[#45b1ff] shadow-[0_0_22px_rgba(69,177,255,.45)]",
                      done && "bg-[#27cda2] text-white shadow-[0_0_0_10px_rgba(39,205,162,.18)]",
                      !locked && !current && !done && "bg-white text-[#45b1ff] border border-[#bfe3ff]",
                    ].join(" ")}
                  >
                    <span className="animate-ripple">{STEPS.find(x=>x.id===s.id)?.icon}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* “Only current & previous” step cards; future is a faint hint */}
          <div className="relative">
            {gates.map((s, idx) => {
              const canShow = s.state !== "locked";
              const current = s.id === activeId;
              return (
                <div key={s.id} className="mb-[110px] last:mb-0">
                  {canShow ? (
                    <div
                      className={[
                        "rounded-2xl border px-4 py-3 shadow-sm",
                        "bg-[#fffaf0] border-[#eadbb6]",
                        current ? "ring-2 ring-[#45b1ff]/40" : "hover:shadow-md transition-shadow",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-[#182836] text-base">
                          {STEPS.find(x=>x.id===s.id)?.icon} {STEPS.find(x=>x.id===s.id)?.label}
                        </div>
                        <span
                          className="text-[11px] rounded-full px-2 py-0.5 border"
                          style={{
                            background: current ? "#e9f4ff" : (s.state === "completed" ? "#e9fff9" : "#f6f0e4"),
                            borderColor: current ? "#bfe3ff" : (s.state === "completed" ? "#b6f0e2" : "#eadbb6"),
                            color: current ? "#246aa8" : (s.state === "completed" ? "#0b7a57" : "#7b6b48"),
                          }}
                        >
                          {s.state === "completed" ? "Completed" : current ? "In progress" : "Ready"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="pl-2">
                      <div className="inline-flex items-center gap-2 text-[#8f8164] text-sm opacity-55">
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

      {/* local CSS for animations */}
      <style>{`
        @keyframes dash { to { stroke-dashoffset: -32; } }
        .animate-dash { animation: dash 1.25s linear infinite; stroke-dashoffset: 0; }
        @keyframes glow { 0%,100% { filter: drop-shadow(0 0 4px rgba(126,211,255,.9)); } 50% { filter: drop-shadow(0 0 14px rgba(126,211,255,.9)); } }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
        @keyframes ripple { 0% { box-shadow: 0 0 0 0 rgba(69,177,255,.35); } 70% { box-shadow: 0 0 0 12px rgba(69,177,255,0); } 100% { box-shadow: 0 0 0 0 rgba(69,177,255,0);} }
        .animate-ripple { animation: ripple 2.4s ease-out infinite; }
      `}</style>
    </div>
  );
}

/* ───────────────────────────── Glass A4 Page (Flip) ───────────────────────── */
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
          <div className="absolute inset-0 rounded-[18px] border border-[#d7c8a8] bg-white/25 backdrop-blur-xl shadow-[0_30px_70px_rgba(0,0,0,.08)] [backface-visibility:hidden] overflow-hidden">
            {front}
            <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-gradient-to-br from-white/40 via-transparent to-white/10" />
          </div>
          {/* back */}
          <div className="absolute inset-0 rounded-[18px] border border-[#d7c8a8] bg-white/25 backdrop-blur-xl shadow-[0_30px_70px_rgba(0,0,0,.08)] [transform:rotateY(180deg)] [backface-visibility:hidden] overflow-hidden">
            {back}
            <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-gradient-to-br from-white/40 via-transparent to-white/10" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button className="px-3 py-1.5 rounded-md bg-[#45b1ff] text-white text-sm shadow" onClick={() => setFlip(v => !v)}>
          {flip ? "Turn to Front" : "Flip Page"}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────── Live Preview (A4) ─────────────────────────── */
function LivePreview({ form }) {
  const text =
`Topic: ${form.title || "—"}
Literature: ${form.lit || "—"}
Method: ${form.method || "—"}
Timeline: ${form.start && form.end ? `${form.start} → ${form.end}` : "—"}`;
  const typed = useTypewriter(text, 14);

  const Front = (
    <div className="p-6 sm:p-8 text-[#0f1d2a]">
      <div className="text-lg font-semibold mb-3">Live Preview</div>
      <div
        className="font-[ui-monospace,monospace] whitespace-pre-wrap text-[13.5px] leading-6 rounded-[12px] p-3 sm:p-4"
        style={{
          textShadow: "0 1px 0 rgba(255,255,255,.25)",
          background: "linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.25))",
          border: "1px solid rgba(215,200,168,.6)",
        }}
      >
        {typed}<span className="inline-block w-3 h-4 align-baseline bg-[#0f1d2a] ml-0.5 animate-pulse" />
      </div>
      <div className="mt-4 text-xs text-[#6e634c]">Auto-writing simulates pen on glass.</div>
    </div>
  );

  const Back = (
    <div className="p-6 sm:p-8 text-[#0f1d2a]">
      <div className="text-lg font-semibold mb-3">Notes</div>
      <div className="text-sm text-[#6e634c] whitespace-pre-wrap">{form.notes || "—"}</div>
      <div className="mt-4 text-xs text-[#6e634c]">Tools: {form.tools || "—"}</div>
    </div>
  );

  return <GlassA4 front={Front} back={Back} />;
}

/* ───────────────────────────── Step Form (Center) ────────────────────────── */
function StepForm({ id, form, setForm, onSummary, onFinish }) {
  const need = useMemo(() => STEPS.find(s => s.id === id)?.need || [], [id]);
  const valid = need.every(k => !!form[k]);

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
    <div className="rounded-2xl border border-[#eadbb6] shadow-sm p-6" style={{ background: THEMES[id]?.card || "#fffaf0" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[18px] font-bold text-[#182836]">
          {STEPS.find(s=>s.id===id)?.icon} {STEPS.find(s=>s.id===id)?.label}
        </h3>
        <span className={`text-sm ${valid ? "text-[#0b7a57]" : "text-[#b17a1a]"}`}>{valid ? "✓ Complete" : "Fill required fields"}</span>
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
          {/* Glass payment card like your sample */}
          <div className="rounded-xl border border-[#e2d1ae] bg-white/50 backdrop-blur-lg p-4 shadow">
            <div className="text-base font-semibold text-[#7b6b48] mb-2">Payment</div>
            <div className="grid sm:grid-cols-[120px_1fr] gap-4 items-center">
              {/* QR placeholder */}
              <div className="h-[120px] w-[120px] rounded-lg bg-white grid place-items-center border border-[#e2d1ae] shadow-inner">
                <div className="text-[10px] text-[#7b6b48]">QR</div>
              </div>
              <div>
                <div className="text-sm text-[#182836]">UPI</div>
                <div className="text-xs text-[#6e634c] mb-2">Attach WhatsApp screenshot</div>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#e2d1ae] bg-white/80 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setForm(f => ({ ...f, paymentProofName: e.target.files?.[0]?.name || "" }))}
                  />
                  <span className="text-sm text-[#182836]">Upload Proof</span>
                  {form.paymentProofName && <span className="text-xs text-[#6e634c]">({form.paymentProofName})</span>}
                </label>
              </div>
            </div>

            {/* Verify / draft progress */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <button
                className="px-4 py-2 rounded-lg bg-[#1bbf8a] text-white"
                onClick={() => setForm(f => ({ ...f, paymentVerified: true }))}
              >
                Mark as Paid
              </button>
              <span className={`text-sm ${form.paymentVerified ? "text-[#0b7a57]" : "text-[#6e634c]"}`}>
                {form.paymentVerified ? "Payment verified" : "Awaiting verification"}
              </span>
            </div>
            {/* Mock progress (shows as you move to done) */}
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-[#eee2c8] overflow-hidden">
                <div className={`h-full ${form.paymentVerified ? "bg-[#45b1ff]" : "bg-[#d6c7a5]"}`} style={{ width: form.paymentVerified ? "100%" : "35%" }} />
              </div>
              <div className="text-[11px] text-[#8f8164] mt-1">
                {form.paymentVerified ? "Draft ready to download on submission" : "Generating Draft PDF…"}
              </div>
            </div>
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
            disabled={!valid}
            title={!valid ? "Complete current step first" : ""}
            onClick={onSummary}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Summary & Ceremony ─────────────────────────── */
function SummaryPopup({ open, onClose, form, gates }) {
  if (!open) return null;
  const list = gates.filter(s => s.state === "completed").map(s => s.label).join(", ");
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
        <div className="text-4xl">🎓</div>
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

/* ─────────────────────────────────── Main ─────────────────────────────────── */
export default function ResearchNav() {
  const [form, setForm] = useState(() => {
    try { return { ...INITIAL, ...(JSON.parse(localStorage.getItem(LS_KEY) || "{}")) }; }
    catch { return INITIAL; }
  });

  const gates = useMemo(() => computeGate(form), [form]);
  const [active, setActive] = useState("topic");
  const [showSummary, setShowSummary] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const pct = percent(gates);
  const theme = THEMES[active] || THEMES.topic;

  // prevent jumping into future locked steps
  const jump = (id) => {
    const s = gates.find(x => x.id === id);
    if (!s || s.state === "locked") return;
    setActive(id);
  };

  const goNext = () => {
    const need = STEPS.find(s => s.id === active)?.need || [];
    const ok = need.every(k => !!form[k]);
    if (!ok) { setShowSummary(true); return; }
    const order = STEPS.map(s => s.id);
    const next = order[Math.min(order.indexOf(active) + 1, order.length - 1)];
    setActive(next);
  };

  const onFinish = () => setShowEnd(true);

  const curr = gates.find(s => s.id === active);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg}`}>
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/60 backdrop-blur border-b border-[#efdfbe] shadow-sm">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold text-[#182836]">Research Navigation</div>
            <div className="text-sm text-[#6e634c]">{pct}% complete</div>
          </div>
        </div>
      </header>

      {/* Body grid */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 grid lg:grid-cols-12 gap-6">
        {/* Left: vertical water path */}
        <div className="lg:col-span-4">
          <LiquidTrack gates={gates} activeId={active} onClick={jump} />
        </div>

        {/* Center: current step editor (only one visible) */}
        <div className="lg:col-span-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={curr?.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24 }}
            >
              <StepForm
                id={curr?.id}
                form={form}
                setForm={setForm}
                onSummary={() => { setShowSummary(true); if (curr?.id !== "done") goNext(); }}
                onFinish={onFinish}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: A4 live glass page with auto typewriting + flip */}
        <div className="lg:col-span-4">
          <LivePreview form={form} />
        </div>
      </main>

      {/* Overlays */}
      <SummaryPopup open={showSummary} onClose={() => setShowSummary(false)} form={form} gates={gates} />
      <EndCeremony
        open={showEnd}
        onClose={() => setShowEnd(false)}
        paymentVerified={!!form.paymentVerified}
        onVerifyPayment={() => setForm(f => ({ ...f, paymentVerified: true }))}
      />
    </div>
  );
}
