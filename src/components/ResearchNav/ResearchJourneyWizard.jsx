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
      i += 2;
      if (i > targetText.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [targetText, speed]);
  return out;
}

/* -------------------------- PUBLIC DATA HELPERS ----------------------- */
async function wikiSummary(term) {
  if (!term) return null;
  try {
    const slug = encodeURIComponent(term.trim().replace(/\s+/g, "_"));
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
      { headers: { accept: "application/json" } }
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
  return { type: "Doctrinal", rationale: "Defaulted based on subject hints; refine as needed." };
}

function deriveGoalsFrom(title = "", subject = "", dept = "") {
  const base = [
    `Outline key concepts related to "${title}".`,
    `Contextualize the topic within ${subject || "the chosen discipline"}.`,
    `Summarize foundational sources (e.g., reference articles and textbooks).`,
    `Identify gaps or clarifications needed for ${dept || "the domain"}.`,
  ];
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
  return chosen.map((t, i) => (i === 0 && title ? `${t}: Context of “${title}”` : t));
}

/* ---------------------------- MAIN COMPONENT -------------------------- */
export default function ResearchJourneyWizard() {
  const proposal = readLS("proposal:data", null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(proposal?.title || "");
  const [abstract, setAbstract] = useState("");
  const [literature, setLiterature] = useState([]);
  const [method, setMethod] = useState({ type: "", rationale: "" });
  const [goals, setGoals] = useState([]);
  const [chapterCount, setChapterCount] = useState(5);
  const [chapters, setChapters] = useState([]);
  const [conclusion, setConclusion] = useState("");

  const twAbstract = useTypewriter(abstract || "", 8);

  useEffect(() => {
    setSaving(true);
    const id = setTimeout(() => {
      writeLS("journey:data", { title, abstract, literature, method, goals, chapterCount, chapters, conclusion });
      setSaving(false);
    }, 300);
    return () => clearTimeout(id);
  }, [title, abstract, literature, method, goals, chapterCount, chapters, conclusion]);

  useEffect(() => {
    if (!proposal) return;
    if (!title) setTitle(proposal.title || "");
    if (!goals.length) setGoals(deriveGoalsFrom(proposal.title, proposal.researchAreaSubject, proposal.researchAreaDept));
    if (!method.type) setMethod(inferMethod(proposal.researchAreaSubject, proposal.researchAreaDept, proposal.title));
    if (!chapters.length) setChapters(defaultChapters(chapterCount, proposal.title));
  }, []); // eslint-disable-line

  /* ------------------------ STEP ACTIONS (NEXT ONLY) ----------------------- */
  const next = async () => {
    if (step === 0 && !title.trim()) return;

    // ✅ Move immediately to next step
    setStep((s) => Math.min(s + 1, STEPS.length - 1));

    // ⚙️ Background async work (fetch, save)
    setTimeout(async () => {
      try {
        if (step === 1 && !abstract.trim()) {
          const fromTitle = await wikiSummary(title);
          if (fromTitle?.summary) {
            let txt = fromTitle.summary;
            const words = txt.split(/\s+/);
            if (words.length > 450) txt = words.slice(0, 450).join(" ") + " …";
            setAbstract(txt);
          } else setAbstract(`(No public summary available; please provide a brief abstract for “${title}”.)`);
        }

        if (step === 2) {
          const want = [];
          if (proposal?.title) want.push(proposal.title);
          if (proposal?.researchAreaSubject) want.push(proposal.researchAreaSubject);
          if (proposal?.researchAreaDept) want.push(proposal.researchAreaDept);
          const fetched = [];
          for (const term of want) {
            const s = await wikiSummary(term);
            if (s) fetched.push(s);
          }
          const map = new Map([...(literature || []), ...fetched].map((x) => [x.url, x]));
          setLiterature(Array.from(map.values()).slice(0, 5));
        }

        if (step === 3 && !method.type)
          setMethod(inferMethod(proposal?.researchAreaSubject, proposal?.researchAreaDept, title));

        if (step === 5 && (!chapters.length || chapters.length !== chapterCount))
          setChapters(defaultChapters(chapterCount, title));

        if (step === 6) {
          const refs = (literature || []).map((l) => l.title).filter(Boolean).slice(0, 3);
          const base = `This outline gathers public reference summaries (e.g., ${refs.join(
            ", "
          )}) and your provided details to frame “${title}”. It is meant as a neutral, non-final scaffold you can refine.`;
          setConclusion(base);
        }

        await fetch("/api/labwizard/journey/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: proposal?.email || "anon@user",
            module: "proposal",
            journeyData: {
              title, abstract, literature, method, goals, chapterCount, chapters, conclusion,
            },
          }),
        });
      } catch (err) {
        console.warn("Background fetch/save failed", err);
      }
    }, 300);
  };

  /* ------------------------------ UI HELPERS ------------------------------ */
  const card = (children) => (
    <div className="rounded-2xl p-5 shadow-lg border" style={{ background: THEME.card, borderColor: THEME.border, color: THEME.ink }}>
      {children}
    </div>
  );

  /* ------------------------------ RENDER ---------------------------------- */
  return (
    <div className="min-h-screen relative">
      <PeacockBackdrop />

      {/* HEADER */}
      <header className="sticky top-0 z-30 backdrop-blur border-b flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(2,39,36,.7)", borderColor: THEME.border, color: THEME.aqua }}>
        <div className="font-semibold">Auto Research Journey</div>
        <div className="flex items-center gap-3 text-xs" style={{ color: THEME.inkSoft }}>
          <span className={`${saving ? "opacity-100" : "opacity-60"}`}>Auto-saved</span>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="rounded-2xl border p-4"
          style={{ borderColor: THEME.border, background: THEME.paper, color: THEME.ink }}>
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm" style={{ color: THEME.inkSoft }}>{STEPS[step]}</div>
            <div className="w-72"><ProgressStrip total={STEPS.length} current={step} /></div>
          </div>
        </div>

        {/* 👇 KEEP ALL YOUR EXISTING AnimatePresence STEP CONTENT (unchanged) */}
        {/* Your current Step 0–7 JSX remains exactly as it is */}

        <div className="flex items-center justify-end">
          {step < STEPS.length - 1 ? (
            <button onClick={next}
              disabled={step === 0 && !title.trim()}
              className="px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
              style={{ background: THEME.aqua, color: "#022724" }}>
              Continue →
            </button>
          ) : (
            <div className="text-sm px-3 py-1 rounded-full"
              style={{ background: "#033532", border: `1px solid ${THEME.border}`, color: THEME.ink }}>
              Journey complete ✓
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
