// client/src/pages/testseries/AdminTestImporter.jsx
import { useEffect, useState } from "react";

export default function AdminTestImporter() {
  const [paper, setPaper] = useState("");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" }); // "ok" | "err"
  const [paperList, setPaperList] = useState([]);

  // ✅ Hard-fixed API base (no env / api.js / server edit)
  const FIXED_API = "https://lawnetwork-api.onrender.com/api";

  // ✅ Fetch all papers for datalist (absolute URL as requested)
  useEffect(() => {
    fetch(`${FIXED_API}/testseries/papers`)
      .then(async (r) => {
        try {
          const data = await r.json();
          // Support multiple shapes: {papers:[...]}, or [...] directly
          const arr = Array.isArray(data) ? data : (data?.papers || data?.data || []);
          setPaperList(Array.isArray(arr) ? arr : []);
        } catch {
          setPaperList([]);
        }
      })
      .catch(() => setPaperList([]));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!file && !rawText.trim()) {
      setMsg({
        type: "err",
        text: "Upload a file (.txt/.json/.docx) OR paste the test text.",
      });
      return;
    }

    setLoading(true);
    const fd = new FormData();
    fd.append("paper", paper);
    fd.append("title", title);
    fd.append("code", code);
    if (file) fd.append("file", file);
    if (rawText.trim()) fd.append("rawText", rawText.trim());

    try {
      const ownerKey = localStorage.getItem("ownerKey") || "";
      const res = await fetch(`${FIXED_API}/testseries/import`, {
        method: "POST",
        headers: { "X-Owner-Key": ownerKey },
        body: fd,
        // credentials not required for owner-key header, keep it simple
      });

      // Safely parse
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch {}

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || `Import failed (${res.status})`);
      }

      setMsg({ type: "ok", text: "✅ Test imported successfully!" });
      setPreview(data.test);
      setPaper("");
      setTitle("");
      setCode("");
      setRawText("");
      setFile(null);
    } catch (err) {
      console.error("Import error:", err);
      setMsg({ type: "err", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  // Helper to render paper options for various API shapes
  const renderPaperOption = (p, idx) => {
    // Shapes supported:
    // 1) { paper: "UPJS Paper 1", count: 5 }
    // 2) { paper: "UPJS Paper 1", tests: [...] }
    // 3) "UPJS Paper 1"
    const name =
      typeof p === "string" ? p :
      p?.paper ?? "";
    const count =
      typeof p === "string" ? undefined :
      (typeof p?.count === "number" ? p.count : (Array.isArray(p?.tests) ? p.tests.length : undefined));
    const label = count != null ? `${name} (${count})` : name;
    return (
      <option key={`${name}-${idx}`} value={name}>
        {label}
      </option>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-8 text-center text-[#0b1220]">
        🧩 Test Series Importer (Admin)
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-md p-6 space-y-6 border border-gray-200"
      >
        {msg.text && (
          <div
            className={`p-3 rounded ${
              msg.type === "ok"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* ✅ Paper Name input with datalist */}
        <div>
          <label className="block font-semibold mb-1">Paper Name</label>
          <input
            list="papers-datalist"
            type="text"
            value={paper}
            onChange={(e) => setPaper(e.target.value)}
            placeholder="e.g. UTTAR PRADESH PROSECUTION OFFICER TEST SERIES"
            required
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <datalist id="papers-datalist">
            {paperList.map(renderPaperOption)}
          </datalist>
          <p className="text-xs text-gray-500 mt-1">
            Pick an existing paper or type a new name.
          </p>
        </div>

        <div>
          <label className="block font-semibold mb-1">Test Title</label>
          <input
            className="w-full p-3 border rounded-lg"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Mock Test 1"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">
            Test Code (optional)
          </label>
          <input
            className="w-full p-3 border rounded-lg"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. LAWMOCK101"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">
            Paste Test Text (optional)
          </label>
          <textarea
            rows={10}
            className="w-full p-3 border rounded-lg font-mono"
            placeholder={`1. Question text
(a) Option A
(b) Option B
(c) Option C
(d) Option D
Ans: (b)`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <div className="text-xs text-gray-500 mt-1">
            If you paste text here, uploading a file is optional.
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-1">
            Upload File (.txt, .json, .docx)
          </label>
          <input
            type="file"
            accept=".txt,.json,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm border rounded-lg p-2 bg-gray-50"
          />
          <div className="text-xs text-gray-500 mt-1">
            <span>.json may contain </span>
            <code className="px-1 py-0.5 rounded bg-gray-100">
              {`{ "questions": [{ "qno": 1, "text": "...", "options": ["(a) ...","(b) ..."], "correct": "B" }] }`}
            </code>
            <span>; .docx is auto-converted to text.</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg text-white font-semibold transition ${
            loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading ? "Importing..." : "📤 Import Test"}
        </button>
      </form>

      {preview && (
        <div className="mt-10 bg-white rounded-xl shadow p-6 border border-gray-200">
          <h2 className="text-2xl font-bold mb-3 text-green-700">
            ✅ Import Summary
          </h2>
          <p>
            <strong>Paper:</strong> {preview.paper}
          </p>
          <p>
            <strong>Title:</strong> {preview.title}
          </p>
          <p>
            <strong>Code:</strong> {preview.code}
          </p>
          <p>
            <strong>Total Questions:</strong> {preview.totalQuestions}
          </p>
          <p className="mt-3 text-gray-600 text-sm">
            Created at {new Date(preview.createdAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
