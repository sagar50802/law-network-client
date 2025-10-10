import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/**
 * LawNetwork Plagiarism Checker (Rich UI)
 * Fake data preview — backend will integrate later.
 */

export default function Plagiarism() {
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const fakeResult = {
    originality: 78,
    grammar: 82,
    clarity: 75,
    matches: [
      { sentence: "The Constitution guarantees freedom of speech.", type: "plagiarized" },
      { sentence: "Every citizen has the right to equality before law.", type: "unique" },
      { sentence: "This principle is derived from ancient British law.", type: "grammar" },
    ],
  };

  function analyze() {
    setLoading(true);
    setTimeout(() => {
      setAnalysis(fakeResult);
      setLoading(false);
    }, 1500);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold text-center mb-8 text-purple-700"
        >
          🔍 Plagiarism & Grammar Checker
        </motion.h1>

        <Tabs defaultValue="checker" className="w-full">
          <TabsList className="grid grid-cols-2 bg-white shadow-md rounded-lg mb-6">
            <TabsTrigger value="checker">Plagiarism Checker</TabsTrigger>
            <TabsTrigger value="reports">My Reports</TabsTrigger>
          </TabsList>

          {/* ---------------- CHECKER TAB ---------------- */}
          <TabsContent value="checker">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Input Card */}
              <Card className="shadow-lg border border-purple-200 bg-white/80 backdrop-blur-md">
                <CardHeader>
                  <CardTitle>Paste your text or upload a document</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={12}
                    placeholder="Write or paste your article, answer, or essay here..."
                    className="w-full border border-purple-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-purple-500"
                  ></textarea>

                  <div className="flex justify-between items-center mt-3">
                    <span className="text-sm text-gray-500">{text.length} characters</span>
                    <Button
                      onClick={analyze}
                      disabled={!text || loading}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                    >
                      {loading ? "Analyzing..." : "Check Plagiarism"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Right: Result Card */}
              <Card className="shadow-lg border border-purple-200 bg-white/80 backdrop-blur-md">
                <CardHeader>
                  <CardTitle>Analysis Result</CardTitle>
                </CardHeader>
                <CardContent>
                  {!analysis ? (
                    <p className="text-gray-500 text-center mt-8">
                      ✳️ Result will appear here after analysis.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Score Rings */}
                      <div className="grid grid-cols-3 gap-3 text-center mb-4">
                        <ScoreCard title="Originality" value={analysis.originality} color="bg-green-500" />
                        <ScoreCard title="Grammar" value={analysis.grammar} color="bg-purple-500" />
                        <ScoreCard title="Clarity" value={analysis.clarity} color="bg-blue-500" />
                      </div>

                      {/* Highlighted Text */}
                      <div className="border rounded-lg p-3 h-64 overflow-y-auto text-sm leading-relaxed">
                        {analysis.matches.map((m, i) => (
                          <span
                            key={i}
                            className={`block p-1 rounded ${
                              m.type === "plagiarized"
                                ? "bg-red-100 text-red-800"
                                : m.type === "grammar"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {m.sentence}
                          </span>
                        ))}
                      </div>

                      {/* Summary */}
                      <div className="mt-4 text-sm">
                        <p className="font-semibold text-gray-600">
                          Suggestions:
                        </p>
                        <ul className="list-disc ml-5 text-gray-700">
                          <li>Rephrase plagiarized lines for better originality.</li>
                          <li>Fix highlighted grammar errors.</li>
                          <li>Keep sentence length concise for clarity.</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ---------------- REPORTS TAB ---------------- */}
          <TabsContent value="reports">
            <Card className="shadow-lg border border-purple-200 bg-white/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle>My Previous Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-purple-50 text-purple-700">
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Title</th>
                      <th className="p-2 text-center">Originality</th>
                      <th className="p-2 text-center">Grammar</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t hover:bg-purple-50">
                      <td className="p-2">10 Oct 2025</td>
                      <td className="p-2">Law of Evidence Essay</td>
                      <td className="p-2 text-center text-green-600">82%</td>
                      <td className="p-2 text-center text-purple-600">76%</td>
                      <td className="p-2 text-center">
                        <Button variant="outline" size="sm">View</Button>
                      </td>
                    </tr>
                    <tr className="border-t hover:bg-purple-50">
                      <td className="p-2">07 Oct 2025</td>
                      <td className="p-2">IPC Section 302 Summary</td>
                      <td className="p-2 text-center text-red-600">58%</td>
                      <td className="p-2 text-center text-purple-600">80%</td>
                      <td className="p-2 text-center">
                        <Button variant="outline" size="sm">View</Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ---------- Mini Component ---------- */
function ScoreCard({ title, value, color }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <Progress
          value={value}
          className="h-2 mt-2 rounded-full bg-gray-200"
        />
        <span className={`absolute inset-0 flex items-center justify-center font-semibold ${color} bg-opacity-10 rounded-full`}>
          {value}%
        </span>
      </div>
      <p className="mt-2 text-xs font-medium text-gray-700">{title}</p>
    </div>
  );
}
