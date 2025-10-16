// src/components/ResearchNav/ResearchNav.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ───────────────────────────── Milestones ───────────────────────────── */
const STEPS = [
  { id: "idea",      label: "Idea",       icon: "💡", need: ["title"],     etaMin: 6 },
  { id: "review",    label: "Review",     icon: "🔎", need: ["lit"],       etaMin: 10 },
  { id: "method",    label: "Method",     icon: "🧪", need: ["method"],   etaMin: 12 },
  { id: "payment",   label: "Payment",    icon: "💳", need: [],           etaMin: 3  },
  { id: "done",      label: "Submission", icon: "🏁", need: [],           etaMin: 0  },
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

const PALETTE = {
  paper: "#fff7e6",
  card: "#fffaf0",
  border: "#ead7b5",
  ink: "#212a3a",
  inkSoft: "#6e634c",
  blue: "#4fb5ff",
  blueSoft: "#bfe3ff",
  mint: "#1bbf8a",
};

const LS_KEY = "researchnav:soft3d:strict";

/* ─────────────────────────── Gating / Progress ─────────────────────────── */
function gate(form) {
  const out = [];
  let lock = false;
  for (const s of STEPS) {
    if (s.id === "done") { out.push({ ...s, state: "locked" }); continue; }
    if (lock) { out.push({ ...s, state: "locked" }); continue; }
    const ok = (s.need || []).every(k => !!form[k]);
    out.push({ ...s, state: ok ? "completed" : "in_progress" });
    if (!ok) lock = true;
  }
  const mOK = (STEPS.find(x=>x.id==="method").need || []).every(k => !!form[k]);
  const pay = out.find(x=>x.id==="payment");
  if (pay) pay.state = mOK ? "in_progress" : "locked";
  return out;
}
const pct = (g) =>
  Math.round((g.filter(s => s.id !== "done" && s.state === "completed").length / (STEPS.length - 1)) * 100);

/* ───────────────────────────── Typewriter hook ───────────────────────────── */
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

/* ───────────────────────── Background: Scholarly Studio ───────────────────────── */
function StudioBackdrop() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background:
            `radial-gradient(1200px 700px at 85% 30%, rgba(197,180,150,.16), transparent 60%),
             radial-gradient(900px 600px at 15% 75%, rgba(180,210,255,.14), transparent 60%),
             linear-gradient(180deg,#fff8e9 0%, #fef3d7 60%, #f9e8c1 100%)`,
        }}
      />
      <div
        className="absolute inset-0 mix-blend-multiply opacity-[.08]"
        style={{
          backgroundImage:
            "radial-gradient(#000 1px, transparent 1px), radial-gradient(#000 1px, transparent 1px)",
          backgroundSize: "6px 6px, 10px 10px",
          backgroundPosition: "0 0, 3px 3px",
        }}
      />
    </div>
  );
}

/* ─────────────────────────── Vertical “Water” Track ─────────────────────────── */
function WaterTrack({ gates, activeId, onClick }) {
  const visible = gates.filter(s => s.state !== "locked");
  const H = (visible.length + 1) * 140;

  const pathD =
    `M22 12 ` +
    Array.from({ length: visible.length })
      .map((_, i) => `C22 ${i*140+54}, 22 ${i*140+98}, 22 ${i*140+128}`)
      .join(" ");

  return (
    <div
      className="rounded-[26px] px-4 py-5 shadow-[0_30px_80px_rgba(120,90,40,.10)]"
      style={{ background: "#fff2da", border: `1px solid ${PALETTE.border}` }}
    >
      <div className="grid grid-cols-[48px_1fr] gap-4">
        <div className="relative">
          <svg width="48" height={H} viewBox={`0 0 48 ${H}`} className="block">
            <path d={pathD} stroke="#eadbb6" strokeWidth="11" strokeLinecap="round" />
            <defs>
              <linearGradient id="liq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7ed3ff" />
                <stop offset="100%" stopColor={PALETTE.blue} />
              </linearGradient>
            </defs>
            <path
              d={pathD}
              stroke="url(#liq)"
              strokeWidth="4.5"
              strokeLinecap="round"
              className="animate-dash"
              strokeDasharray="18 18"
            />
            {visible.map((_, i) => (
              <circle key={i} cx="22" cy={i*140+12} r="4.5" fill="#86dbff" className="animate-glisten" />
            ))}
            <circle cx="22" cy={visible.length*140+4} r="3.5" fill="#d8caa8" opacity=".6" />
          </svg>

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
                    "absolute -left-[22px] w-11 h-11 rounded-full grid place-items-center select-none",
                    active && "bg-white text-[#45b1ff] border-2 border-[#45b1ff] shadow-[0_0_26px_rgba(79,181,255,.45)]",
                    done && "bg-[#27cda2] text-white shadow-[0_0_0_12px_rgba(39,205,162,.18)]",
                    !active && !done && "bg-white text-[#45b1ff] border border-[#bfe3ff]",
                  ].join(" ")}
                >
                  <span className="animate-ripple text-[16px]">{STEPS.find(x=>x.id===s.id)?.icon}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative">
          {visible.slice(-1).map((s) => {
            const active = s.id === activeId;
            return (
              <div key={s.id} className="mb-[110px] last:mb-0">
                <div
                  className={[
                    "rounded-2xl px-4 py-3 shadow-sm",
                    active ? "ring-2 ring-[#45b1ff]/45" : "hover:shadow-md transition-shadow",
                  ].join(" ")}
                  style={{ background: "#fffaf0", border: `1px solid ${PALETTE.border}` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold" style={{ color: PALETTE.ink }}>
                      {STEPS.find(x=>x.id===s.id)?.icon} {STEPS.find(x=>x.id===s.id)?.label}
                    </div>
                    <span
                      className="text-[11px] rounded-full px-2 py-0.5 border"
                      style={{
                        background: active ? "#e9f4ff" : "#f6f0e4",
                        borderColor: active ? PALETTE.blueSoft : PALETTE.border,
                        color: active ? "#246aa8" : "#7b6b48",
                      }}
                    >
                      {active ? "In progress" : "Ready"}
                    </span>
                  </div>
                </div>

                <div className="pl-2 mt-6">
                  <div className="inline-flex items-center gap-2 text-[#8f8164] text-sm opacity-55">
                    <span className="h-2 w-2 rounded-full bg-[#d8caa8] animate-ping" />
                    <span>Next step ahead…</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes dash { to { stroke-dashoffset: -36; } }
        .animate-dash { animation: dash 1.15s linear infinite; stroke-dashoffset: 0; }
        @keyframes glisten { 0%,100% { opacity:.85; filter: drop-shadow(0 0 6px rgba(126,211,255,.9)); }
                              50% { opacity:1;  filter: drop-shadow(0 0 15px rgba(126,211,255,.95)); } }
        .animate-glisten { animation: glisten 2s ease-in-out infinite; }
        @keyframes ripple { 0%{box-shadow:0 0 0 0 rgba(79,181,255,.40);}
                            70%{box-shadow:0 0 0 14px rgba(79,181,255,0);}
                            100%{box-shadow:0 0 0 0 rgba(79,181,255,0);} }
        .animate-ripple { animation: ripple 2.6s ease-out infinite; }
      `}</style>
    </div>
  );
}

/* ───────────────────── Route Summary (Google-Maps-style) ───────────────────── */
function RouteSummary({ activeId, gates, onRecenter }) {
  const order = gates.map(g => g.id);
  const idx = order.indexOf(activeId);

  const completed = gates.filter(g => g.state === "completed");
  theconst nextSteps = gates.slice(idx + 1);

  const remainingMin = nextSteps.reduce((sum, s) => sum + (STEPS.find(x=>x.id===s.id)?.etaMin || 0), 0);
  const remainingCount = nextSteps.filter(s => s.id !== "done").length;

  const eta = new Date(Date.now() + remainingMin * 60 * 1000);
  const etaStr = eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-2xl p-4 shadow-sm space-y-3"
         style={{ background: PALETTE.paper, border: `1px solid ${PALETTE.border}` }}>
      <div className="flex items-center justify-between">
        <div className="font-semibold" style={{ color: PALETTE.ink }}>Route Summary</div>
        <div className="text-xs" style={{ color: PALETTE.inkSoft }}>{completed.length} done</div>
      </div>

      <div className="flex items-start gap-3">
        <div className="mt-1 text-lg">🧭</div>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: PALETTE.ink }}>Now</div>
          <div className="text-sm" style={{ color: PALETTE.inkSoft }}>
            {STEPS.find(s=>s.id===activeId)?.label}
          </div>
        </div>
        <button
          className="text-xs px-2 py-1 rounded border"
          style={{ borderColor: PALETTE.blueSoft, background: "#e9f4ff", color: "#246aa8" }}
          onClick={onRecenter}
        >
          Re-centre
        </button>
      </div>

      <div className="flex items-start gap-3 opacity-90">
        <div className="mt-1 text-lg">➡️</div>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: PALETTE.ink }}>Then</div>
          <div className="text-sm" style={{ color: PALETTE.inkSoft }}>
            {nextSteps[0]?.id ? STEPS.find(s=>s.id===nextSteps[0].id)?.label : "—"}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 opacity-70">
        <div className="mt-1 text-lg">🧭</div>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: PALETTE.ink }}>Later</div>
          <div className="text-sm" style={{ color: PALETTE.inkSoft }}>
            {nextSteps.slice(1).map(s => STEPS.find(x=>x.id===s.id)?.label).filter(Boolean).join(" → ") || "—"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs pt-1" style={{ color: PALETTE.inkSoft }}>
        <div className="px-2 py-1 rounded-full border" style={{ borderColor: PALETTE.border }}>
          {remainingMin || 1} min
        </div>
        <div className="px-2 py-1 rounded-full border" style={{ borderColor: PALETTE.border }}>
          {remainingCount} steps
        </div>
        <div className="px-2 py-1 rounded-full border" style={{ borderColor: PALETTE.border }}>
          ETA {etaStr}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Bottom Sticky Mini-Nav (like Google Maps drive pill) ───────────── */
function BottomPill({ activeId, gates, onRecenter }) {
  const order = gates.map(g => g.id);
  const idx = order.indexOf(activeId);
  const nextSteps = gates.slice(idx + 1);
  const remainingMin = nextSteps.reduce((sum, s) => sum + (STEPS.find(x=>x.id===s.id)?.etaMin || 0), 0);
  const remainingCount = nextSteps.filter(s => s.id !== "done").length;

  if (!gates.length) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-3 z-30">
      <div
        className="flex items-center gap-4 px-4 py-2 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,.18)] text-white"
        style={{ background: "#0f172a" }}
      >
        <div className="text-sm font-semibold flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#22c55e]" />
          {remainingMin || 1} min
        </div>
        <div className="text-xs opacity-80">· {remainingCount} steps to go</div>
        <button
          className="ml-2 text-xs px-2 py-1 rounded bg-white/10 border border-white/20"
          onClick={onRecenter}
          title="Jump to current step"
        >
          Re-centre
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────── Glass A4 Live Preview (flip + turn) ─────────────────────── */
function GlassA4({ front, back, turnSignal }) {
  const [flip, setFlip] = useState(false);
  const [turnFlash, setTurnFlash] = useState(0);

  useEffect(() => {
    if (!turnSignal) return;
    setTurnFlash(Date.now());
    const t = setTimeout(() => setTurnFlash(0), 750);
    return () => clearTimeout(t);
  }, [turnSignal]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative [perspective:1400px]">
        <div
          className={[
            "relative w-full max-w-[560px]",
            "aspect-[210/297]",
            "[transform-style:preserve-3d] transition-transform duration-700",
            flip ? "[transform:rotateY(180deg)]" : ""
          ].join(" ")}
        >
          {/* Front */}
          <div className="absolute inset-0 rounded-[18px] border backdrop-blur-xl shadow-[0_30px_70px_rgba(0,0,0,.10)] [backface-visibility:hidden] overflow-hidden"
               style={{ background: "rgba(255,255,255,.42)", borderColor: PALETTE.border }}>
            <div className="absolute inset-0 overflow-auto p-6 sm:p-8">
              {front}
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-gradient-to-br from-white/40 via-transparent to-white/10" />
          </div>

          {/* Back */}
          <div className="absolute inset-0 rounded-[18px] border backdrop-blur-xl shadow-[0_30px_70px_rgba(0,0,0,.10)] [transform:rotateY(180deg)] [backface-visibility:hidden] overflow-hidden"
               style={{ background: "rgba(255,255,255,.42)", borderColor: PALETTE.border }}>
            <div className="absolute inset-0 overflow-auto p-6 sm:p-8">
              {back}
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-gradient-to-br from-white/40 via-transparent to-white/10" />
          </div>

          {/* One-shot right→left turn overlay */}
          {turnFlash ? (
            <div className="absolute inset-0 pointer-events-none [transform-style:preserve-3d]">
              <div className="absolute inset-0 origin-right rounded-[18px] bg-white/80 shadow-[0_30px_70px_rgba(0,0,0,.15)] pageTurnR" />
              <style>{`
                @keyframes pageTurnR {
                  0%   { transform: rotateY(0deg);   opacity: .95; }
                  60%  { transform: rotateY(-140deg); opacity: .8; }
                  100% { transform: rotateY(-180deg); opacity: 0; }
                }
                .pageTurnR { animation: pageTurnR .7s ease-in forwards; }
              `}</style>
            </div>
          ) : null}
        </div>
      </div>
      <button
        className="mt-3 px-3 py-1.5 rounded-md text-white shadow"
        style={{ background: PALETTE.blue }}
        onClick={() => setFlip(v => !v)}
      >
        {flip ? "Turn to Front" : "Flip Page"}
      </button>
    </div>
  );
}

function LivePreview({ form, turnSignal }) {
  const text =
`Topic: ${form.title || "—"}
Literature: ${form.lit || "—"}
Method: ${form.method || "—"}
Timeline: ${form.start && form.end ? `${form.start} → ${form.end}` : "—"}`;
  const typed = useTypewriter(text, 14);

  const box = {
    fontFamily: `'ui-monospace', ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace`,
    textShadow: "0 1px 0 rgba(255,255,255,.25)",
    background: "linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.25))",
    border: `1px solid ${PALETTE.border}`,
  };

  const Front = (
    <div style={{ color: PALETTE.ink }}>
      <div className="text-lg font-semibold mb-3">Live Preview</div>
      <div className="rounded-[12px] p-3 sm:p-4 whitespace-pre-wrap text-[13.5px] leading-6" style={box}>
        {typed}
        <span className="inline-block w-3 h-4 align-baseline ml-1" style={{ background: PALETTE.ink }} />
      </div>
      <div className="mt-4 text-xs" style={{ color: PALETTE.inkSoft }}>Auto-writing simulates pen on glass.</div>
    </div>
  );

  const Back = (
    <div style={{ color: PALETTE.ink }}>
      <div className="text-lg font-semibold mb-3">Notes</div>
      <div className="text-sm" style={{ color: PALETTE.inkSoft, whiteSpace: "pre-wrap" }}>{form.notes || "—"}</div>
      <div className="mt-4 text-xs" style={{ color: PALETTE.inkSoft }}>Tools: {form.tools || "—"}</div>
    </div>
  );

  return <GlassA4 front={Front} back={Back} turnSignal={turnSignal} />;
}

/* ───────────────────────── Preview toggle wrapper (mobile) ───────────────────────── */
function PreviewPanel({ children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 xl:hidden">
        <h4 className="font-semibold" style={{ color: PALETTE.ink }}>Live Preview</h4>
        <button
          className="text-xs px-2 py-1 rounded border"
          style={{ borderColor: PALETTE.border, background: "#ffffffb3", color: PALETTE.ink }}
          onClick={() => setOpen(o => !o)}
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      <div className={`${open ? "block" : "hidden"} xl:block`}>{children}</div>
    </div>
  );
}

/* ───────────────────────── Step Editor (strict gating) ─────────────────────── */
function StepForm({ id, form, setForm, onSummary, onFinish }) {
  const need = useMemo(() => (STEPS.find(x => x.id === id)?.need) || [], [id]);
  const valid = need.every(k => !!form[k]);

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(form)); }, [form]);

  const Field = ({ label, name, type = "text", placeholder }) => {
    const props = {
      value: form[name] || "",
      onChange: e => setForm(f => ({ ...f, [name]: e.target.value })),
      className: "w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2",
      placeholder
    };
    const style = {
      borderColor: PALETTE.border,
      background: "#ffffffcc",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,.4)",
    };
    return (
      <label className="block">
        <div className="text-sm mb-1" style={{ color: PALETTE.inkSoft }}>{label}</div>
        {type === "textarea" ? <textarea rows={6} {...props} style={style} /> : <input type={type} {...props} style={style} />}
      </label>
    );
  };

  return (
    <div className="rounded-2xl shadow-sm p-6" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[18px] font-bold" style={{ color: PALETTE.ink }}>
          {STEPS.find(s=>s.id===id)?.icon} {STEPS.find(s=>s.id===id)?.label}
        </h3>
        <span className="text-sm" style={{ color: valid ? "#0b7a57" : "#b17a1a" }}>
          {valid ? "✓ Complete" : "Fill required fields"}
        </span>
      </div>

      {id === "idea" && (
        <div className="grid gap-4">
          <Field label="Enter your research idea" name="title" placeholder="e.g., Fairness in Constitutional AI" />
          <Field label="Notes (optional)" name="notes" type="textarea" placeholder="Problem statement / objectives…" />
        </div>
      )}
      {id === "review" && (
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
      {id === "payment" && (
        <div className="grid gap-4">
          <div className="rounded-xl p-4 backdrop-blur-lg shadow"
               style={{ background: "rgba(255,255,255,.55)", border: `1px solid ${PALETTE.border}` }}>
            <div className="text-base font-semibold mb-2" style={{ color: PALETTE.inkSoft }}>Payment</div>
            <div className="grid sm:grid-cols-[120px_1fr] gap-4 items-center">
              <div className="h-[120px] w-[120px] rounded-lg bg-white grid place-items-center"
                   style={{ border: `1px solid ${PALETTE.border}`, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.6)" }}>
                <div className="text-[10px]" style={{ color: PALETTE.inkSoft }}>QR</div>
              </div>
              <div>
                <div className="text-sm" style={{ color: PALETTE.ink }}>UPI</div>
                <div className="text-xs mb-2" style={{ color: PALETTE.inkSoft }}>Attach WhatsApp screenshot</div>
                <label
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer"
                  style={{ border: `1px solid ${PALETTE.border}`, background: "#ffffffcc" }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setForm(f => ({ ...f, paymentProofName: e.target.files?.[0]?.name || "" }))}
                  />
                  <span className="text-sm" style={{ color: PALETTE.ink }}>Upload Proof</span>
                  {form.paymentProofName && <span className="text-xs" style={{ color: PALETTE.inkSoft }}>({form.paymentProofName})</span>}
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <button className="px-4 py-2 rounded-lg text-white" style={{ background: PALETTE.mint }}
                      onClick={() => setForm(f => ({ ...f, paymentVerified: true }))}>
                Mark as Paid
              </button>
              <span className="text-sm" style={{ color: form.paymentVerified ? "#0b7a57" : PALETTE.inkSoft }}>
                {form.paymentVerified ? "Payment verified" : "Awaiting verification"}
              </span>
            </div>

            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-[#eee2c8] overflow-hidden">
                <div className="h-full transition-all" style={{ width: form.paymentVerified ? "100%" : "35%", background: PALETTE.blue }} />
              </div>
              <div className="text-[11px] mt-1" style={{ color: PALETTE.inkSoft }}>
                {form.paymentVerified ? "Draft ready to download on submission" : "Generating Draft PDF…"}
              </div>
            </div>
          </div>
        </div>
      )}
      {id === "done" && (
        <div className="text-sm" style={{ color: PALETTE.inkSoft }}>
          All steps complete. Submit to finish the journey.
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button
          className="px-4 py-2 rounded-lg"
          style={{ border: `1px solid ${PALETTE.border}`, background: "#ffffffb3" }}
          onClick={onSummary}
        >
          Stage Summary
        </button>
        {id === "done" ? (
          <button
            className="px-4 py-2 rounded-lg text-white"
            style={{ background: PALETTE.blue }}
            onClick={onFinish}
          >
            Submit → Finish
          </button>
        ) : (
          <button
            className="px-4 py-2 rounded-lg text-white disabled:opacity-60"
            style={{ background: PALETTE.blue }}
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

/* ─────────────────────── Stage Summary & End Ceremony ─────────────────────── */
/* UPDATED: close button, Esc-to-close, backdrop click to close, sticky header */
function SummaryPopup({ open, onClose, form, gates }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const list = gates.filter(s=>s.state==="completed").map(s=>s.label).join(", ") || "—";

  const handleBackdrop = (e) => {
    // Close only if the click is outside the modal content
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4"
      onMouseDown={handleBackdrop}
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: .96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: PALETTE.paper, border: `1px solid ${PALETTE.border}` }}
      >
        {/* Sticky header with title + close */}
        <div className="flex items-center justify-between px-5 py-3 sticky top-0 z-10"
             style={{ background: "#fff7e6f2", borderBottom: `1px solid ${PALETTE.border}` }}>
          <div>
            <h3 className="text-xl font-bold" style={{ color: PALETTE.ink }}>Stage Summary</h3>
            <div className="text-sm" style={{ color: PALETTE.inkSoft }}>
              Completed: <span className="font-medium" style={{ color: PALETTE.ink }}>{list}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 rounded-full grid place-items-center text-xl leading-none hover:bg-black/5"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="p-5 max-h-[70vh] overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl p-3" style={{ border: `1px solid ${PALETTE.border}`, background: "#ffffffb8" }}>
              <div className="font-semibold mb-1" style={{ color: PALETTE.inkSoft }}>Idea</div>
              <div className="font-medium whitespace-pre-wrap" style={{ color: PALETTE.ink }}>
                {form.title || "—"}
              </div>
              <div className="text-xs mt-2" style={{ color: PALETTE.inkSoft }}>
                {form.notes || "—"}
              </div>
            </div>

            <div className="rounded-xl p-3" style={{ border: `1px solid ${PALETTE.border}`, background: "#ffffffb8" }}>
              <div className="font-semibold mb-1" style={{ color: PALETTE.inkSoft }}>Method</div>
              <div className="font-medium whitespace-pre-wrap" style={{ color: PALETTE.ink }}>
                {form.method || "—"}
              </div>
              <div className="text-xs mt-2" style={{ color: PALETTE.inkSoft }}>
                Tools: {form.tools || "—"}
              </div>
            </div>

            <div className="rounded-xl p-3" style={{ border: `1px solid ${PALETTE.border}`, background: "#ffffffb8" }}>
              <div className="font-semibold mb-1" style={{ color: PALETTE.inkSoft }}>Timeline</div>
              <div className="font-medium" style={{ color: PALETTE.ink }}>
                {form.start && form.end ? `${form.start} → ${form.end}` : "—"}
              </div>
            </div>

            <div className="rounded-xl p-3" style={{ border: `1px solid ${PALETTE.border}`, background: "#ffffffb8" }}>
              <div className="font-semibold mb-1" style={{ color: PALETTE.inkSoft }}>Refs</div>
              <div className="font-mono whitespace-pre-wrap" style={{ color: PALETTE.ink }}>
                {form.lit || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: `1px solid ${PALETTE.border}` }}>
          <button
            className="px-4 py-2 rounded-lg"
            style={{ border: `1px solid ${PALETTE.border}`, background: "#ffffffb3" }}
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="px-4 py-2 rounded-lg text-white"
            style={{ background: PALETTE.blue }}
            onClick={onClose}
          >
            Continue →
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function EndCeremony({ open, onClose, paymentVerified, onVerifyPayment }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur grid place-items-center p-4">
      <motion.div
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-xl rounded-2xl shadow-2xl p-6 text-center"
        style={{ background: PALETTE.paper, border: `1px solid ${PALETTE.border}` }}
      >
        <div className="text-4xl">🎓</div>
        <h3 className="text-xl font-bold mt-2" style={{ color: PALETTE.ink }}>
          Congratulations! Your proposal is now with the Controller.
        </h3>
        <p className="mt-1" style={{ color: PALETTE.inkSoft }}>
          Preview is available; full PDF unlocks after payment verification.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
          <button
            className="px-4 py-2 rounded-lg"
            style={{ border: `1px solid ${PALETTE.border}`, background: "#ffffffb3" }}
          >
            Preview PDF (1 page)
          </button>
          <button
            disabled={!paymentVerified}
            className={`px-4 py-2 rounded-lg text-white ${!paymentVerified ? "opacity-60 cursor-not-allowed" : ""}`}
            style={{ background: PALETTE.mint }}
          >
            Download Full PDF
          </button>
          {!paymentVerified && (
            <button
              className="px-4 py-2 rounded-lg text-white"
              style={{ background: PALETTE.blue }}
              onClick={onVerifyPayment}
            >
              I’ve Paid → Verify
            </button>
          )}
        </div>
        <button onClick={onClose} className="underline text-sm mt-3" style={{ color: PALETTE.inkSoft }}>
          Close
        </button>
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
  const gates = useMemo(() => gate(form), [form]);
  const [active, setActive] = useState("idea");
  const [showSummary, setShowSummary] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [turnSignal, setTurnSignal] = useState(0);

  const progress = pct(gates);
  const order = STEPS.map(s => s.id);
  const current = gates.find(s => s.id === active);

  const jump = (id) => {
    const visible = gates.filter(s => s.state !== "locked").map(s => s.id);
    if (!visible.includes(id)) return;
    setActive(id);
  };

  const next = () => {
    const need = (STEPS.find(s=>s.id===active)?.need)||[];
    const ok = need.every(k => !!form[k]);
    if (!ok) { setShowSummary(true); return; }
    const idx = order.indexOf(active);
    const nxt = order[Math.min(idx+1, order.length-1)];
    setActive(nxt);
    setTurnSignal((n) => n + 1);
  };

  const recenter = () => setActive(prev => prev);

  return (
    <div className="min-h-screen">
      <StudioBackdrop />

      <header className="sticky top-0 z-20 bg-white/65 backdrop-blur border-b" style={{ borderColor: PALETTE.border }}>
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold" style={{ color: PALETTE.ink }}>Research Navigation</div>
            <div className="text-sm" style={{ color: PALETTE.inkSoft }}>{progress}% complete</div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-4 grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-3">
          <WaterTrack gates={gates} activeId={active} onClick={jump} />
          <div className="mt-4">
            <div className="grid gap-3">
              <div className="rounded-xl p-3 text-sm shadow-sm"
                   style={{ background: "#f2ffe7", border: `1px solid ${PALETTE.border}` }}>
                <div className="font-semibold mb-1" style={{ color: PALETTE.ink }}>Tip from Mentor</div>
                <div style={{ color: PALETTE.inkSoft }}>Choose a topic that genuinely interests you.</div>
              </div>
              <div className="rounded-xl p-3 text-sm shadow-sm"
                   style={{ background: "#f1f8e9", border: `1px solid ${PALETTE.border}` }}>
                <div className="font-semibold mb-1" style={{ color: PALETTE.ink }}>Recommended Reading</div>
                <div className="flex items-center gap-2" style={{ color: PALETTE.inkSoft }}>
                  <span>Research article</span> <span>▶</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5">
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
                onSummary={() => { setShowSummary(true); if (current?.id !== "done") next(); }}
                onFinish={() => setShowEnd(true)}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sticky, scrollable right side */}
        <div className="xl:col-span-4 space-y-4 xl:sticky xl:top-20 h-auto xl:h-[calc(100vh-120px)] xl:overflow-auto">
          <PreviewPanel>
            <LivePreview form={form} turnSignal={turnSignal} />
          </PreviewPanel>
          <RouteSummary activeId={active} gates={gates} onRecenter={recenter} />
        </div>
      </main>

      <SummaryPopup open={showSummary} onClose={() => setShowSummary(false)} form={form} gates={gates} />
      <EndCeremony
        open={showEnd}
        onClose={() => setShowEnd(false)}
        paymentVerified={!!form.paymentVerified}
        onVerifyPayment={() => setForm(f => ({ ...f, paymentVerified: true }))}
      />

      <BottomPill activeId={active} gates={gates} onRecenter={recenter} />
    </div>
  );
}
