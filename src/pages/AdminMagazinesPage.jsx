import { useEffect, useState } from "react";
import MagazineAdminEditor from "../components/Magazine/MagazineAdminEditor.jsx";

const API_BASE = import.meta.env.VITE_BACKEND_URL;
function api(path) {
  return `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
}

async function safeFetchJSON(path, options = {}) {
  const res = await fetch(api(path), {
    ...options,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });

  const text = await res.text();
  if (!text || text.startsWith("<")) {
    throw new Error("Invalid JSON from server");
  }

  return JSON.parse(text);
}

export default function AdminMagazinesPage() {
  const [issues, setIssues] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await safeFetchJSON("/magazines");
        if (data.ok) setIssues(data.issues);
        else throw new Error(data.error);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }
    load();
  }, []);

  function handleSaved(issue) {
    if (!issue) {
      setIssues((prev) =>
        prev.filter((m) => m._id !== (selected && selected._id))
      );
      setSelected(null);
      return;
    }

    setIssues((prev) => {
      const idx = prev.findIndex((x) => x._id === issue._id);
      if (idx === -1) return [issue, ...prev];
      const copy = [...prev];
      copy[idx] = issue;
      return copy;
    });

    setSelected(issue);
  }

  function startNew() {
    setSelected({
      _id: null,
      title: "",
      subtitle: "",
      slug: "",
      slides: [{ id: "s1", backgroundUrl: "", rawText: "", highlight: "" }],
    });
  }

  if (!selected) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Magazine Manager</h1>

        {error && (
          <div className="text-red-600 bg-red-50 border p-2 rounded mb-3">
            {error}
          </div>
        )}

        <button
          onClick={startNew}
          className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded"
        >
          + Create New Magazine
        </button>

        {loading ? (
          <div>Loading…</div>
        ) : issues.length === 0 ? (
          <div>No magazines created yet.</div>
        ) : (
          <div className="space-y-2">
            {issues.map((m) => (
              <button
                key={m._id}
                onClick={() => setSelected(m)}
                className="w-full border p-3 rounded hover:bg-gray-50 text-left flex justify-between"
              >
                <div>
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-xs text-gray-500">
                    /magazine/{m.slug}
                  </div>
                </div>
                <div className="text-xs">
                  {new Date(m.createdAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <MagazineAdminEditor
      existingIssue={selected._id ? selected : null}
      onSaved={handleSaved}
    />
  );
}
