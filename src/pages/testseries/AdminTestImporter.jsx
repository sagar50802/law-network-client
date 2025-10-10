import { useState } from "react";
import { absUrl } from "@/utils/api"; // your global helper
import toast from "react-hot-toast";

export default function AdminTestImporter() {
  const [paper, setPaper] = useState("");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      toast.error("Please choose a .txt or .json file");
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append("paper", paper);
    formData.append("title", title);
    formData.append("code", code);
    formData.append("file", file);

    const ownerKey = localStorage.getItem("ownerKey") || "";
    try {
      const res = await fetch(absUrl("/api/testseries/import"), {
        method: "POST",
        headers: { "X-Owner-Key": ownerKey },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      toast.success("✅ Test imported successfully!");
      setPreview(data.test);
      setFile(null);
      setPaper("");
      setTitle("");
      setCode("");
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
            type="text"
            value={paper}
            onChange={(e) => setPaper(e.target.value)}
            placeholder="e.g. Paper 1"
            required
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Test Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Mock Test 1"
            required
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Test Code (optional)</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. LAWMOCK101"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Upload File (.txt or .json)</label>
          <input
            type="file"
            accept=".txt,.json"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-gray-800 border border-gray-300 rounded-lg cursor-pointer p-2 bg-gray-50 hover:bg-gray-100"
          />
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
