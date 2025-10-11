// client/src/pages/testseries/AdminTestImporter.jsx
import { useEffect, useState } from "react";

/** ✅ Correct API base (your server that exposes /api/testseries/*) */
const API = "https://law-network.onrender.com/api";

export default function AdminTestImporter() {
  const [papers, setPapers] = useState([]);
  const [paper, setPaper] = useState("");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const ownerKey = localStorage.getItem("ownerKey") || "";

  const fetchJSON = async (url, opts) => {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  };

  /** Load available papers for the datalist (optional convenience) */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetchJSON(`${API}/testseries/papers`);
        setPapers(Array.isArray(r?.papers) ? r.papers : []);
      } catch {
        setPapers([]);
      }
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!ownerKey) {
      alert(
        "Missing owner key. Run this once in DevTools:\nlocalStorage.setItem('ownerKey','LAWWOWNER2025');\nThen refresh."
      );
      return;
    }
    if (!paper || !title) {
      setMsg("Please enter at least Paper name and Test Title.");
      return;
    }
    if (!file && !rawText.trim()) {
      setMsg("Upload a file (.txt/.json/.docx) OR paste the test text.");
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("paper", paper);
      fd.append("title", title);
      if (code) fd.append("code", code);
      if (rawText.trim()) fd.append("rawText", rawText.trim());
      if (file) fd.append("file", file);

      const res = await fetch(`${API}/testseries/import`, {
        method: "POST",
        headers: { "X-Owner-Key": ownerKey },
        body: fd,
      });

      const dataText = await res.text();
      let data = {};
      try {
        data = JSON.parse(dataText);
      } catch {
        // leave as {}
      }
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || `Import failed (HTTP ${res.status})`);
      }

      setMsg(
        `✅ Imported "${data?.test?.title || "Test"}" (code: ${data?.test?.code}) with ${data?.test?.totalQuestions ?? 0
        } questions.`
      );
      // light reset
      setTitle("");
      setCode("");
      setRawText("");
      setFile(null);
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">🌿 Test Series Importer (Admin)</h1>

      {msg && (
        <div
          className={`mb-4 px-3 py-2 rounded border ${msg.startsWith("✅")
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
        >
          {msg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Paper name (free text + quick pick) */}
        <div>
          <label className="block text-sm mb-1 font-medium">Paper Name</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. UTTAR PRADESH PROSECUTION OFFICER TEST SERIES"
            value={paper}
            onChange={(e) => setPaper(e.target.value)}
            list="known-papers"
            required
          />
          {papers.length > 0 && (
            <datalist id="known-papers">
              {papers.map((p) => (
                <option key={p.paper} value={p.paper}>
                  {p.paper} {typeof p.count === "number" ? `(${p.count})` : ""}
                </option>
              ))}
            </datalist>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Pick an existing paper or type a new name.
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm mb-1 font-medium">Test Title</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. Mock Test 1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Code (optional) */}
        <div>
          <label className="block text-sm mb-1 font-medium">Test Code (optional)</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. LAWMOCK101"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave blank to auto-generate (T&lt;timestamp&gt;).
          </p>
        </div>

        {/* Raw text (optional) */}
        <div>
          <label className="block text-sm mb-1 font-medium">Paste Test Text (optional)</label>
          <textarea
            className="w-full border rounded px-3 py-2 h-40 font-mono"
            placeholder={`1. Question text
(a) Option A
(b) Option B
(c) Option C
(d) Option D
Ans: (b)`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Supported: numbered Qs, options (a–d), and a line like “Ans: (b)”.
            If you don’t paste text, upload a .txt / .json / .docx below.
          </p>
        </div>

        {/* File (optional) */}
        <div>
          <label className="block text-sm mb-1 font-medium">Upload File (.txt, .json, .docx)</label>
          <input
            type="file"
            accept=".txt,.json,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-gray-500 mt-1">
            JSON may contain <code>{"{ questions: [...] }"}</code> with fields
            <code> qno, text, options, correct, marks, negative</code>. .docx is auto-read.
          </p>
        </div>

        <button
          type="submit"
          disabled={busy}
          className={`px-4 py-2 rounded text-white ${busy ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
        >
          {busy ? "Importing…" : "Import Test"}
        </button>
      </form>

      <div className="text-xs text-gray-500 mt-6">
        Admin tip: ensure your <span className="font-mono">ownerKey</span> is set in localStorage.
      </div>
    </div>
  );
}
