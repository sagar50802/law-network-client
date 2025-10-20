// src/components/ResearchNav/ResearchJourneyWizard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------- THEME -------------------------------- */
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

const LS_PREFIX = "labwizard:v1:";
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

/* ------------------------------ BACKDROP ------------------------------ */
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

/* ----------------------------- PROGRESS UI ---------------------------- */
const STEPS = [
  "Title",
  "Abstract",
  "Literature",
  "Methodology",
  "Goals",
  "Chapterization",
  "Conclusion",
  "Notebook / Payment",
];

function ProgressStrip({ total, current }) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div>
      <div className="h-2 rounded-full overflow-hidden w-full" style={{ background: "#0a4d47" }}>
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

/* -------------------------- TYPEWRITER EFFECT ------------------------- */
function useTypewriter(targetText, speed = 12) {
  const [out, setOut] = useState("");
  useEffect(() => {
    let i = 0;
    setOut("");
    const id = setInterval(() => {
      setOut(targetText.slice(0, i));
      i += 2; // a little faster
      if (i > targetText.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [targetText, speed]);
  return out;
}

/* -------------------------- PUBLIC DATA HELPERS ----------------------- */
// Live Wikipedia fetch (no paid APIs). Graceful fallback if CORS/network fails.
async function wikiSummary(term) {
  if (!term) return null;
  try {
    const slug = encodeURIComponent(term.trim().replace(/\s+/g, "_"));
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
      { headers: { "accept": "application/json" } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.extract) {
      return {
        title: json.title || term,
        url: json.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${slug}`,
        summary: json.extract,
      };
    }
  } catch {}
  return null;
}

/* ---------------------------- HEURISTIC LOGIC ------------------------- */
function inferMethod(subject = "", dept = "", title = "") {
  const txt = `${subject} ${dept} ${title}`.toLowerCase();
  const doctrinalHints = ["law", "jurisprudence", "constitution", "legal", "philosophy"];
  const empiricalHints = ["survey", "experiment", "data", "statistics", "field", "engineering", "biology", "economics", "management", "computer"];
  const isDoctrinal = doctrinalHints.some((k) => txt.includes(k));
  const isEmpirical = empiricalHints.some((k) => txt.includes(k));
  if (isDoctrinal && !isEmpirical) return { type: "Doctrinal", rationale: "Topic falls under legal/Conceptual analysis domains." };
  if (isEmpirical && !isDoctrinal) return { type: "Empirical", rationale: "Topic suggests data collection, survey or measurement." };
  // default: decide by stream
  return { type: "Doctrinal", rationale: "Defaulted based on subject hints; refine as needed." };
}

function deriveGoalsFrom(title = "", subject = "", dept = "") {
  const base = [
    `Outline key concepts related to "${title}".`,
    `Contextualize the topic within ${subject || "the chosen discipline"}.`,
    `Summarize foundational sources (e.g., reference articles and textbooks).`,
    `Identify gaps or clarifications needed for ${dept || "the domain"}.`,
  ];
  // de-duplicate and trim
  return Array.from(new Set(base)).slice(0, 5);
}

function defaultChapters(n = 5, title = "") {
  const presets = [
    "Introduction",
    "Literature Review",
    "Research Methodology",
    "Analysis / Discussion",
    "Findings & Results",
    "Implications / Recommendations",
    "Conclusion",
    "References / Bibliography",
  ];
  const chosen = presets.slice(0, Math.max(3, Math.min(8, n)));
  // Title hint in intro
  return chosen.map((t, i) =>
    i === 0 && title
      ? `${t}: Context of “${title}”`
      : t
  );
}

/* ---------------------------- MAIN COMPONENT -------------------------- */
export default function ResearchJourneyWizard() {
  // Proposal data from LabWizard Step-1 (student form)
  const proposal = readLS("proposal:data", null);

  // if missing, we still allow user to type title inline
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Master journey state
  const [title, setTitle] = useState(proposal?.title || "");
  const [abstract, setAbstract] = useState("");
  const [literature, setLiterature] = useState([]); // [{title, url, summary}]
  const [method, setMethod] = useState({ type: "", rationale: "" });
  const [goals, setGoals] = useState([]);
  const [chapterCount, setChapterCount] = useState(5);
  const [chapters, setChapters] = useState([]);
  const [conclusion, setConclusion] = useState("");

  // For typewriter abstract preview (handwritten-ish)
  const twAbstract = useTypewriter(abstract || "", 8);

  // Persist on change
  useEffect(() => {
    setSaving(true);
    const id = setTimeout(() => {
      writeLS("journey:data", {
        title, abstract, literature, method, goals, chapterCount, chapters, conclusion,
      });
      setSaving(false);
    }, 300);
    return () => clearTimeout(id);
  }, [title, abstract, literature, method, goals, chapterCount, chapters, conclusion]);

  // Pre-fill from proposal at first render
  useEffect(() => {
    if (!proposal) return;
    if (!title) setTitle(proposal.title || "");
    if (!goals.length) setGoals(deriveGoalsFrom(proposal.title, proposal.researchAreaSubject, proposal.researchAreaDept));
    if (!method.type) setMethod(inferMethod(proposal.researchAreaSubject, proposal.researchAreaDept, proposal.title));
    if (!chapters.length) setChapters(defaultChapters(chapterCount, proposal.title));
  }, []); // eslint-disable-line

  /* ------------------------ STEP ACTIONS (NEXT ONLY) ----------------------- */
  const next = async () => {
    // Gate behaviors by step
    if (step === 0) {
      if (!title.trim()) return; // need a title
    }

    if (step === 1) {
      // Abstract: if empty, try to fetch a short neutral paragraph from wikipedia
      if (!abstract.trim()) {
        const fromTitle = await wikiSummary(title);
        if (fromTitle?.summary) {
          // Keep it ~250-450 words by truncation (Wikipedia often shorter anyway)
          let txt = fromTitle.summary;
          const words = txt.split(/\s+/);
          if (words.length > 450) txt = words.slice(0, 450).join(" ") + " …";
          setAbstract(txt);
        } else {
          setAbstract(`(No public summary available; please provide a brief abstract for “${title}”.)`);
        }
      }
    }

    if (step === 2) {
      // Literature: fetch using a few signals (title, subject, dept)
      const want = [];
      if (proposal?.title) want.push(proposal.title);
      if (proposal?.researchAreaSubject) want.push(proposal.researchAreaSubject);
      if (proposal?.researchAreaDept) want.push(proposal.researchAreaDept);

      const fetched = [];
      for (const term of want) {
        const s = await wikiSummary(term);
        if (s) fetched.push(s);
      }
      // merge unique by url
      const map = new Map([...(literature || []), ...fetched].map((x) => [x.url, x]));
      setLiterature(Array.from(map.values()).slice(0, 5));
    }

    if (step === 3) {
      // Method already inferred; nothing to fetch
      if (!method.type) setMethod(inferMethod(proposal?.researchAreaSubject, proposal?.researchAreaDept, title));
    }

    if (step === 5) {
      // Ensure chapters exist according to chosen count
      if (!chapters.length || chapters.length !== chapterCount) {
        setChapters(defaultChapters(chapterCount, title));
      }
    }

    if (step === 6) {
      // Conclusion: summarize neutrally based on what we have (no made-up facts)
      const refs = (literature || []).map((l) => l.title).filter(Boolean).slice(0, 3);
      const base =
        `This outline gathers public reference summaries (e.g., ${refs.join(
          ", "
        )}) and your provided details to frame “${title}”. It is meant as a neutral, non-final scaffold you can refine.`;
      setConclusion(base);
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  /* ------------------------------ UI HELPERS ------------------------------ */
  const card = (children) => (
    <div
      className="rounded-2xl p-5 shadow-lg border"
      style={{ background: THEME.card, borderColor: THEME.border, color: THEME.ink }}
    >
      {children}
    </div>
  );

  /* ------------------------------ RENDER ---------------------------------- */
  return (
    <div className="min-h-screen relative">
      <PeacockBackdrop />

      {/* Top Bar (no back button per requirement) */}
      <header
        className="sticky top-0 z-30 backdrop-blur border-b flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(2,39,36,.7)", borderColor: THEME.border, color: THEME.aqua }}
      >
        <div className="font-semibold">Auto Research Journey</div>
        <div className="flex items-center gap-3 text-xs" style={{ color: THEME.inkSoft }}>
          <span className={`${saving ? "opacity-100" : "opacity-60"}`}>Auto-saved</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="rounded-2xl border p-4" style={{ borderColor: THEME.border, background: THEME.paper, color: THEME.ink }}>
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm" style={{ color: THEME.inkSoft }}>{STEPS[step]}</div>
            <div className="w-72"><ProgressStrip total={STEPS.length} current={step} /></div>
          </div>
        </div>

        {/* STEP CONTENT */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {card(
                <div className="space-y-3">
                  <label className="block">
                    <div className="text-sm mb-1" style={{ color: THEME.inkSoft }}>Choose your Title</div>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ background: THEME.paper, color: THEME.ink, borderColor: THEME.border }}
                      placeholder="e.g., Constitutional Law Journey"
                    />
                  </label>
                  <div className="text-xs" style={{ color: THEME.inkSoft }}>
                    Tip: use clear nouns (topic, jurisdiction, timeframe) for better public summaries.
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {card(
                <div className="space-y-3">
                  <div className="text-sm" style={{ color: THEME.inkSoft }}>Abstract (auto-suggested from public sources)</div>
                  <div
                    className="rounded-xl p-4 border"
                    style={{
                      background: "#033532",
                      borderColor: THEME.border,
                      fontFamily: "ui-rounded, cursive",
                      lineHeight: 1.5,
                    }}
                  >
                    <div className="whitespace-pre-wrap">{twAbstract || "(…preparing summary—click Continue to fetch if empty…)"}</div>
                  </div>

                  <label className="block">
                    <div className="text-sm mb-1" style={{ color: THEME.inkSoft }}>
                      Edit Abstract (250–450 words recommended)
                    </div>
                    <textarea
                      rows={8}
                      value={abstract}
                      onChange={(e) => setAbstract(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ background: THEME.paper, color: THEME.ink, borderColor: THEME.border }}
                    />
                  </label>
                </div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {card(
                <div className="space-y-3">
                  <div className="text-sm" style={{ color: THEME.inkSoft }}>
                    Literature (neutral summaries from Wikipedia where available)
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {(literature || []).map((it) => (
                      <a
                        key={it.url}
                        href={it.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg p-3 border hover:opacity-90"
                        style={{ background: "#033532", borderColor: THEME.border }}
                      >
                        <div className="font-semibold mb-1">{it.title}</div>
                        <div className="text-sm opacity-90">{it.summary}</div>
                        <div className="text-xs mt-2 opacity-70">{it.url}</div>
                      </a>
                    ))}
                    {!literature?.length && (
                      <div className="text-sm" style={{ color: THEME.inkSoft }}>
                        Click “Continue” to attempt fetching neutral summaries for your title/subject/department.
                      </div>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: THEME.inkSoft }}>
                    More sources: search Google (public) —{" "}
                    <a
                      className="underline"
                      href={`https://www.google.com/search?q=${encodeURIComponent(title || proposal?.researchAreaSubject || "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      open search
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {card(
                <div className="space-y-3">
                  <div className="text-sm" style={{ color: THEME.inkSoft }}>Methodology (heuristic suggestion)</div>
                  <div className="rounded-xl p-4 border" style={{ background: "#033532", borderColor: THEME.border }}>
                    <div className="text-lg font-semibold">{method.type || "—"}</div>
                    <div className="text-sm opacity-90 mt-1">{method.rationale || "—"}</div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {card(
                <div className="space-y-3">
                  <div className="text-sm" style={{ color: THEME.inkSoft }}>Research Goals (derived from your inputs)</div>
                  <div className="space-y-2">
                    {goals.map((g, i) => (
                      <div key={i} className="rounded-lg p-2 border" style={{ background: "#033532", borderColor: THEME.border }}>
                        • {g}
                      </div>
                    ))}
                    {!goals.length && (
                      <div className="text-sm" style={{ color: THEME.inkSoft }}>
                        No goals yet. Add a title first, then click Continue to derive goals.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {card(
                <div className="space-y-3">
                  <div className="text-sm" style={{ color: THEME.inkSoft }}>Chapterization</div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm" style={{ color: THEME.inkSoft }}>Chapters:</label>
                    <select
                      value={chapterCount}
                      onChange={(e) => setChapterCount(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border"
                      style={{ background: THEME.paper, color: THEME.ink, borderColor: THEME.border }}
                    >
                      {[3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {(chapters || []).map((c, i) => (
                      <div key={i} className="rounded-lg p-3 border" style={{ background: "#033532", borderColor: THEME.border }}>
                        <div className="font-semibold">{i + 1}. {c}</div>
                        {/* Light notes: stitch from abstract/literature snippets without inventing */}
                        <div className="text-xs opacity-80 mt-2">
                          Notes: {abstract ? abstract.slice(0, 140) + "…" : "—"}{" "}
                          {(literature?.[i]?.title) ? `(ref: ${literature[i].title})` : ""}
                        </div>
                      </div>
                    ))}
                    {!chapters?.length && (
                      <div className="text-sm" style={{ color: THEME.inkSoft }}>
                        Click Continue to auto-fill standard chapter headings based on your count.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 6 && (
            <motion.div key="s6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {card(
                <div className="space-y-3">
                  <div className="text-sm" style={{ color: THEME.inkSoft }}>Conclusion (neutral)</div>
                  <div className="rounded-xl p-4 border" style={{ background: "#033532", borderColor: THEME.border }}>
                    <div className="whitespace-pre-wrap">{conclusion || "Click Continue to finalize a neutral wrap-up."}</div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 7 && (
            <motion.div key="s7" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {card(
                <div className="space-y-4">
                  <div className="text-sm" style={{ color: THEME.inkSoft }}>
                    Notebook view (selection/printing disabled)
                  </div>

                  {/* Anti-copy UX (not foolproof against screenshots) */}
                  <div
                    className="rounded-xl p-4 border overflow-y-auto max-h-[60vh]"
                    style={{ background: "#001f1d", borderColor: THEME.border, color: THEME.ink, userSelect: "none" }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <style>{`
                      .no-print * { -webkit-user-select: none; -ms-user-select: none; user-select: none; }
                      @media print { body { display: none; } }
                    `}</style>

                    <div className="space-y-4 no-print">
                      <h2 className="text-xl font-bold">{title || "—"}</h2>
                      {abstract && (
                        <section>
                          <h3 className="font-semibold">Abstract</h3>
                          <p className="opacity-90">{abstract}</p>
                        </section>
                      )}
                      {!!literature.length && (
                        <section>
                          <h3 className="font-semibold">Literature (public sources)</h3>
                          <ul className="list-disc pl-5 space-y-2">
                            {literature.map((l) => (
                              <li key={l.url}>
                                <span className="font-medium">{l.title}</span>{" "}
                                <span className="opacity-80">— {l.summary}</span>{" "}
                                <span className="opacity-60">[{l.url}]</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                      {method?.type && (
                        <section>
                          <h3 className="font-semibold">Methodology</h3>
                          <p className="opacity-90">
                            <b>Type:</b> {method.type}. <b>Rationale:</b> {method.rationale}
                          </p>
                        </section>
                      )}
                      {!!goals.length && (
                        <section>
                          <h3 className="font-semibold">Goals</h3>
                          <ul className="list-disc pl-5">
                            {goals.map((g, i) => <li key={i}>{g}</li>)}
                          </ul>
                        </section>
                      )}
                      {!!chapters.length && (
                        <section>
                          <h3 className="font-semibold">Chapters</h3>
                          <ol className="list-decimal pl-5 space-y-1">
                            {chapters.map((c, i) => <li key={i}>{c}</li>)}
                          </ol>
                        </section>
                      )}
                      {conclusion && (
                        <section>
                          <h3 className="font-semibold">Conclusion</h3>
                          <p className="opacity-90">{conclusion}</p>
                        </section>
                      )}
                    </div>
                  </div>

                  {/* Payment actions */}
                  <div className="rounded-xl p-4 border" style={{ background: THEME.paper, borderColor: THEME.border }}>
                    <div className="font-semibold mb-2">Payment</div>
                    <div className="flex flex-wrap items-center gap-3">
                      {/* UPI Intent */}
                      <a
                        className="px-4 py-2 rounded-lg font-semibold"
                        style={{ background: THEME.aqua, color: "#022724" }}
                        href={
                          // Set your defaults via window.__PAY = { vpa, amount, name }
                          `upi://pay?pa=${encodeURIComponent((window.__PAY?.vpa)||"demo@upi")}&pn=${encodeURIComponent((window.__PAY?.name)||"Research Service")}&am=${encodeURIComponent((window.__PAY?.amount)||"499")}&cu=INR`
                        }
                      >
                        Pay via UPI
                      </a>

                      {/* WhatsApp proof link */}
                      <a
                        className="px-4 py-2 rounded-lg font-semibold border"
                        style={{ borderColor: THEME.border }}
                        target="_blank" rel="noreferrer"
                        href={`https://wa.me/${encodeURIComponent((window.__PAY?.whatsapp)||"919999999999")}?text=${encodeURIComponent(
                          `Payment proof for "${title}". Name: ${(proposal?.name)||""}, Email: ${(proposal?.email)||""}`
                        )}`}
                      >
                        Send Proof on WhatsApp
                      </a>
                    </div>

                    <div className="text-xs mt-2" style={{ color: THEME.inkSoft }}>
                      Admin can configure UPI ID / Amount / WhatsApp via <code>window.__PAY</code>.
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer: NEXT only (no back) */}
        <div className="flex items-center justify-end">
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              disabled={step === 0 && !title.trim()}
              className="px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
              style={{ background: THEME.aqua, color: "#022724" }}
            >
              Continue →
            </button>
          ) : (
            <div className="text-sm px-3 py-1 rounded-full" style={{ background: "#033532", border: `1px solid ${THEME.border}`, color: THEME.ink }}>
              Journey complete ✓
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
