import { useEffect, useState } from "react";
import MagazineAdminEditor from "../components/Magazine/MagazineAdminEditor.jsx";

/* -----------------------------------------------------------
   API helpers
----------------------------------------------------------- */
const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

// Build full URL. In production: https://law-network.onrender.com/api/...
function apiUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

// Safe JSON fetch: never uses res.json(), never throws SyntaxError from HTML
async function safeFetchJSON(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error(`Empty response from ${path}`);
  }

  // If backend is mis-routed and returns the SPA index.html
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    throw new Error(`Server returned HTML instead of JSON for ${path}`);
  }

  let data;
  try {
    data = JSON.parse(trimmed);
  } catch {
    throw new Error(`Invalid JSON from server for ${path}`);
  }

  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

/* ===========================================================
   MAIN PAGE: /admin/magazines
=========================================================== */
export default function AdminMagazinesPage() {
  const [issues, setIssues] = useState([]);
  const [selected, setSelected] = useState(null); // null = list, object = edit
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* --------------------- LOAD LIST ----------------------- */
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        // ✅ Call backend: GET /api/magazines
        const data = await safeFetchJSON("/api/magazines");
        setIssues(data.issues || []);
      } catch (err) {
        console.error("Magazine list load error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /* --------------------- CALLBACK FROM EDITOR ------------ */
  function handleSaved(issue) {
    // onSaved(null) after delete
    if (!issue) {
      setIssues((prev) =>
        prev.filter((x) => x._id !== (selected && selected._id))
      );
      setSelected(null);
      return;
    }

    setIssues((prev) => {
      const idx = prev.findIndex((x) => x._id === issue._id);
      if (idx === -1) {
        // new issue
        return [issue, ...prev];
      }
      const copy = [...prev];
      copy[idx] = issue;
      return copy;
    });

    setSelected(issue);
  }

  /* --------------------- NEW MAGAZINE -------------------- */
  function startNewMagazine() {
    setSelected({
      _id: null,
      title: "",
      subtitle: "",
      slug: "",
      slides: [
        {
          id: "s1",
          backgroundUrl: "",
          rawText: "",
          highlight: "",
        },
      ],
    });
  }

  /* --------------------- LIST MODE ----------------------- */
  if (!selected) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4">Magazine Manager</h1>

        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
            {error}
          </div>
        )}

        <button
          onClick={startNewMagazine}
          className="mb-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
        >
          + Create New Magazine
        </button>

        {loading ? (
          <div className="text-sm text-gray-500">Loading magazines...</div>
        ) : issues.length === 0 ? (
          <div className="text-sm text-gray-500">
            No magazines created yet.
          </div>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => (
              <button
                key={issue._id}
                onClick={() => setSelected(issue)}
                className="w-full text-left px-3 py-2 rounded border hover:bg-gray-50 text-sm flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold">{issue.title}</div>
                  <div className="text-xs text-gray-500">
                    /magazine/{issue.slug}
                  </div>
                </div>
                <div className="text-[11px] text-gray-500">
                  {issue.createdAt
                    ? new Date(issue.createdAt).toLocaleDateString()
                    : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* --------------------- EDIT MODE ----------------------- */
  return (
    <MagazineAdminEditor
      existingIssue={selected._id ? selected : null}
      onSaved={handleSaved}
    />
  );
}
