import { useState } from "react";
import { absUrl } from "../../utils/api";   // ← no "@/..."
import toast from "react-hot-toast";

export default function AdminTestImporter() {
  const [paper, setPaper] = useState("");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!file && !rawText.trim()) {
      toast.error("Upload a file (.txt, .json, .docx) OR paste the test text.");
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
      const res = await fetch(absUrl("/api/testseries/import"), {
        method: "POST",
        headers: { "X-Owner-Key": ownerKey },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Import failed");

      toast.success("✅ Test imported successfully!");
      setPreview(data.test);
      setPaper("");
      setTitle("");
      setCode("");
      setRawText("");
      setFile(null);
    } catch (err) {
      console.error("Import error:", err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-8 text-center text-[#0b1220]">
        🧩 Test Series Importer (Admin)
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-md p-6 space-y-6 border border-gray-200"
      >
        <div>
          <label className="block font-semibold mb-1">Paper Name</label>
          <input
            className="w-full p-3 border rounded-lg"
            required
            value={paper}
            onChange={(e) => setPaper(e.target.value)}
            placeholder="e.g. Paper 1"
          />
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
          <label className="block font-semibold mb-1">Test Code (optional)</label>
          <input
            className="w-full p-3 border rounded-lg"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. LAWMOCK101"
          />
        </div>

        {/* Paste text (optional) */}
        <div>
          <label className="block font-semibold mb-1">Paste Test Text (optional)</label>
          <textarea
            rows={10}
            className="w-full p-3 border rounded-lg font-mono"
            placeholder={`1. Question text
(a) Option A
(b) Option B
(c) Option C
(d) Option D
Ans: (b)

2. Next question...
(a) ...
(b) ...
(c) ...
(d) ...
Ans: (a)`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <div className="text-xs text-gray-500 mt-1">
            If you paste text here, uploading a file is optional.
          </div>
        </div>

        {/* Or upload .txt / .json / .docx */}
        <div>
          <label className="block font-semibold mb-1">Upload File (.txt, .json, .docx)</label>
          <input
            type="file"
            accept=".txt,.json,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm border rounded-lg p-2 bg-gray-50"
          />
          <div className="text-xs text-gray-500 mt-1">
            <span>.json may contain </span>
            <code className="px-1 py-0.5 rounded bg-gray-100">
              {`{ "questions": [{ "qno": 1, "text": "...", "options": ["(a) ...","(b) ...","(c) ...","(d) ..."], "correct": "B" }] }`}
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
          <h2 className="text-2xl font-bold mb-3 text-green-700">✅ Import Summary</h2>
          <p><strong>Paper:</strong> {preview.paper}</p>
          <p><strong>Title:</strong> {preview.title}</p>
          <p><strong>Code:</strong> {preview.code}</p>
          <p><strong>Total Questions:</strong> {preview.totalQuestions}</p>
          <p className="mt-3 text-gray-600 text-sm">
            Created at {new Date(preview.createdAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
