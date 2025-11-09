import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/**
 * PHASE 1 — Offline “AI-like” Plagiarism & Grammar Analyzer
 * - No external APIs, no DB required.
 * - Heuristic grammar checks + duplication/snippet similarity.
 * - Heuristic AI-likeness score (based on repetition/length/diversity).
 * - Rich color-coded highlights and summary stats.
 *
 * Colors:
 *  - plagiarized:  bg-red-100 text-red-800
 *  - grammar:      bg-yellow-100 text-yellow-800
 *  - ai-suspect:   bg-purple-100 text-purple-800
 *  - unique:       bg-green-100 text-green-800
 */

// Small internal legal phrase corpus to compare against (purely local, expands realism)
const LEGAL_PHRASES = [
  "freedom of speech",
  "equality before law",
  "natural justice",
  "due process of law",
  "burden of proof lies on the prosecution",
  "beyond reasonable doubt",
  "principles of natural justice",
  "rule of law",
  "fundamental rights are enforceable",
  "separation of powers",
  "presumption of innocence",
  "writ of habeas corpus",
  "stare decisis",
  "actus reus and mens rea",
  "reasonable restrictions in the interests of public order",
  "basic structure doctrine",
  "procedural fairness",
  "audi alteram partem",
  "res judicata",
  "locus standi",
];

// ---------------------------- helpers ----------------------------

const splitSentences = (text) =>
  text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/g)
    .map((s) => s.trim())
    .filter(Boolean);

const tokenize = (s) => s.toLowerCase().match(/[a-zA-Z]+/g) || [];

const unique = (arr) => Array.from(new Set(arr));

const jaccard = (a, b) => {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (!A.size && !B.size) return 0;
  let inter = 0;
  A.forEach((w) => {
    if (B.has(w)) inter++;
  });
  return inter / (A.size + B.size - inter);
};

// grammar rules per-sentence
function grammarIssuesForSentence(s) {
  const issues = [];

  // capitalization
  if (/^[a-z]/.test(s)) {
    issues.push("Start sentence with a capital letter.");
  }
  // end punctuation
  if (!/[.!?]$/.test(s)) {
    issues.push("Add proper ending punctuation.");
  }
  // double spaces
  if (/\s{2,}/.test(s)) {
    issues.push("Remove extra spaces.");
  }
  // repeated words (the the)
  if (/\b(\w+)\s+\1\b/i.test(s)) {
    issues.push("Avoid repeated words.");
  }
  // simple verb misuse heuristic: singular/plural are/is with plural/singular noun (very rough)
  if (/\bpeople is\b/i.test(s)) issues.push("Use 'are' with plural subjects.");
  if (/\beveryone are\b/i.test(s)) issues.push("Use 'is' with singular subjects.");

  // very long sentence
  const words = tokenize(s);
  if (words.length > 28) issues.push("Sentence too long; try splitting.");

  return issues;
}

// check against internal phrase list
function phraseSimilarityScore(sentence) {
  let max = 0;
  for (const p of LEGAL_PHRASES) {
    const sim = jaccard(sentence, p);
    if (sim > max) max = sim;
  }
  return max; // 0..1
}

// self-duplication within text
function isNearDuplicate(target, others) {
  let max = 0;
  for (const o of others) {
    const sim = jaccard(target, o);
    if (sim > max) max = sim;
    if (max >= 0.6) break;
  }
  return max >= 0.6;
}

// AI-likeness heuristic (0..100)
function aiLikelihood(text) {
  const sentences = splitSentences(text);
  const tokens = tokenize(text);
  const total = tokens.length || 1;

  const typeTokenRatio = unique(tokens).length / total; // lower => more repetitive
  const avgLen =
    sentences.reduce((acc, s) => acc + tokenize(s).length, 0) /
    Math.max(sentences.length, 1);
  const repeats =
    tokens.filter((w, i) => i && w === tokens[i - 1]).length / total; // immediate repeats

  // weights tuned for a “reasonable” feel
  let score = 0;
  // long avg sentences → higher AI feel
  score += Math.min(Math.max((avgLen - 18) / 20, 0), 1) * 40;
  // low vocabulary diversity → higher AI feel
  score += Math.min(Math.max((0.55 - typeTokenRatio) / 0.55, 0), 1) * 35;
  // local repetition → higher AI feel
  score += Math.min(repeats * 8, 1) * 25;

  return Math.round(Math.max(0, Math.min(100, score)));
}

function analyzeLocally(text) {
  const sentences = splitSentences(text);

  // prepare duplicates check reference
  const othersByIndex = (idx) => sentences.filter((_, i) => i !== idx);

  const detailed = sentences.map((s, idx) => {
    const gIssues = grammarIssuesForSentence(s);
    const phraseSim = phraseSimilarityScore(s); // vs internal corpus
    const nearDup = isNearDuplicate(s, othersByIndex(idx)); // vs other sentences in this doc

    // decide label priority: plagiarized > grammar > ai-suspect > unique
    let type = "unique";
    if (phraseSim >= 0.55 || nearDup) type = "plagiarized";
    else if (gIssues.length) type = "grammar";
    else if (aiLikelihood(s) >= 70) type = "ai-suspect";

    return {
      sentence: s,
      type,
      grammar: gIssues,
      phraseSim: Number(phraseSim.toFixed(2)),
      dup: nearDup,
    };
  });

  const total = sentences.length || 1;
  const counts = {
    plagiarized: detailed.filter((d) => d.type === "plagiarized").length,
    grammar: detailed.filter((d) => d.type === "grammar").length,
    ai: detailed.filter((d) => d.type === "ai-suspect").length,
    unique: detailed.filter((d) => d.type === "unique").length,
  };

  const originality = Math.round(100 * (1 - counts.plagiarized / total));
  const grammarScore = Math.max(0, Math.round(100 - (counts.grammar * 100) / total));
  const clarity = Math.max(
    0,
    Math.round(
      100 -
        (detailed.filter((d) => tokenize(d.sentence).length > 28).length * 100) /
          total
    )
  );
  const aiScore = aiLikelihood(text);

  return {
    originality,
    grammarScore,
    clarity,
    aiScore,
    detailed,
    counts,
    total,
  };
}

// ---------------------------- component ----------------------------

export default function Plagiarism() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // for sentence detail

  // computed preview character count
  const charCount = useMemo(() => text.length, [text]);

  const onAnalyze = () => {
    if (!text || text.trim().length < 30) {
      setResult({
        error: "Please paste at least 30 characters to analyze.",
      });
      return;
    }
    setLoading(true);
    // simulate brief processing time for UX
    setTimeout(() => {
      const r = analyzeLocally(text);
      setResult(r);
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-6 relative">
      <div className="max-w-6xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold text-center mb-8 text-purple-700"
        >
          🔍 Plagiarism & Grammar Checker
        </motion.h1>

        <Tabs defaultValue="checker" className="w-full">
          <TabsList className="grid grid-cols-2 bg-white shadow-md rounded-lg mb-6 p-1">
            <TabsTrigger value="checker">Plagiarism Checker</TabsTrigger>
            <TabsTrigger value="reports">My Reports</TabsTrigger>
          </TabsList>

          {/* ------------- CHECKER ------------- */}
          <TabsContent value="checker">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Input */}
              <Card className="shadow-lg border border-purple-200 bg-white/80 backdrop-blur-md">
                <CardHeader>
                  <CardTitle>Paste your text or upload a document</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={14}
                    placeholder="Paste your article, answer, or essay here..."
                    className="w-full border border-purple-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-gray-500">{charCount} characters</span>
                    <Button
                      onClick={onAnalyze}
                      disabled={loading || !text.trim()}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                    >
                      {loading ? "Analyzing..." : "Check Plagiarism"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Results */}
              <Card className="shadow-lg border border-purple-200 bg-white/80 backdrop-blur-md">
                <CardHeader>
                  <CardTitle>Analysis Result</CardTitle>
                </CardHeader>
                <CardContent>
                  {!result ? (
                    <p className="text-gray-500 text-center mt-10">
                      ✳️ Results will appear here after analysis.
                    </p>
                  ) : result.error ? (
                    <p className="text-red-600 text-center">{result.error}</p>
                  ) : (
                    <>
                      {/* meters */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-4">
                        <ScoreCard title="Originality" value={result.originality} color="bg-green-500" />
                        <ScoreCard title="Grammar" value={result.grammarScore} color="bg-yellow-500" />
                        <ScoreCard title="Clarity" value={result.clarity} color="bg-blue-500" />
                        <ScoreCard title="AI Probability" value={result.aiScore} color="bg-purple-500" />
                      </div>

                      {/* stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-medium text-gray-700 mb-3">
                        <Stat label="Total" value={result.total} />
                        <Stat label="Plagiarized" value={result.counts.plagiarized} />
                        <Stat label="Grammar Issues" value={result.counts.grammar} />
                        <Stat label="AI Suspect" value={result.counts.ai} />
                      </div>

                      {/* highlighted text */}
                      <div className="border rounded-lg p-3 h-64 overflow-y-auto text-sm leading-relaxed">
                        {result.detailed.map((m, i) => (
                          <button
                            key={i}
                            onClick={() => setModal(m)}
                            className={`block w-full text-left p-1 rounded mb-1 ${
                              m.type === "plagiarized"
                                ? "bg-red-100 text-red-800"
                                : m.type === "grammar"
                                ? "bg-yellow-100 text-yellow-800"
                                : m.type === "ai-suspect"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-green-100 text-green-800"
                            }`}
                            title="Click to view suggestions"
                          >
                            {m.sentence}
                          </button>
                        ))}
                      </div>

                      {/* quick tips */}
                      <div className="mt-4 text-sm">
                        <p className="font-semibold text-gray-700">Suggestions:</p>
                        <ul className="list-disc ml-5 text-gray-700 space-y-1">
                          <li>Rephrase red sentences; avoid copying common legal phrases verbatim.</li>
                          <li>Fix yellow grammar warnings (capitalization, punctuation, repeats).</li>
                          <li>Split very long sentences for clarity.</li>
                          <li>Vary vocabulary to reduce AI-like patterns.</li>
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ------------- REPORTS (placeholder for later) ------------- */}
          <TabsContent value="reports">
            <Card className="shadow-lg border border-purple-200 bg-white/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle>My Previous Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">
                  History view coming soon — we’ll list saved reports here with download & preview.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* sentence detail modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModal(null)}
          >
            <motion.div
              className="bg-white rounded-xl shadow-2xl w-[92%] md:w-[60%] max-h-[85vh] overflow-y-auto p-6"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-purple-700 mb-2">Sentence Details</h3>
              <p
                className={`p-2 rounded mb-3 ${
                  modal.type === "plagiarized"
                    ? "bg-red-100 text-red-800"
                    : modal.type === "grammar"
                    ? "bg-yellow-100 text-yellow-800"
                    : modal.type === "ai-suspect"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {modal.sentence}
              </p>

              <div className="text-sm text-gray-700 space-y-2">
                <p>
                  <strong>Classification:</strong> {modal.type.replace("-", " ")}
                </p>
                {modal.type === "plagiarized" && (
                  <p>
                    <strong>Reason:</strong>{" "}
                    {modal.dup
                      ? "Very similar to another sentence in this document."
                      : `Matches common legal phrase patterns (similarity ~ ${Math.round(
                          modal.phraseSim * 100
                        )}%).`}
                  </p>
                )}
                {modal.grammar?.length > 0 && (
                  <div>
                    <strong>Grammar tips:</strong>
                    <ul className="list-disc ml-5">
                      {modal.grammar.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="text-right mt-5">
                <Button onClick={() => setModal(null)} className="bg-purple-600 text-white">
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------- UI bits ---------------------------- */

function ScoreCard({ title, value, color }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24">
        <Progress value={value} className="h-2 rounded-full bg-gray-200" />
        <span
          className={`mt-2 inline-flex items-center justify-center w-24 h-8 text-sm font-semibold ${color} bg-opacity-10 rounded-full`}
        >
          {value}%
        </span>
      </div>
      <p className="mt-1 text-xs font-medium text-gray-700">{title}</p>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white/70 rounded-md border border-purple-200 px-3 py-2 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-800">{value}</div>
    </div>
  );
}
