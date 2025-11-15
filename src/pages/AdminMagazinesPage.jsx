import { useEffect, useState } from "react";
import MagazineAdminEditor from "../components/Magazine/MagazineAdminEditor.jsx";

/* -----------------------------------------------------------
   Helper: build API URL (supports VITE_BACKEND_URL in prod)
----------------------------------------------------------- */
const API_BASE = import.meta.env.VITE_BACKEND_URL || "";
function apiUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

/* -----------------------------------------------------------
   Helper: safe JSON fetch (no SyntaxError, no "<!doctype" crash)
----------------------------------------------------------- */
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

  // If server sent HTML (Render error page, SPA index, etc.)
  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
    // Don’t throw SyntaxError, just a normal error with message
    throw new Error("Server returned HTML instead of JSON for " + path);
  }

  if (!text) {
    // empty 204/404 etc.
    throw new Error("Empty response from server for " + path);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON from server for " + path);
  }
}

/* ===========================================================
   MAIN PAGE: /admin/magazines
=========================================================== */
export default function AdminMagazinesPage() {
  const [issues, setIssues] = useState([]);
  const [selected, setSelected] = useState(null); // null = list mode, object = edit mode
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* --------------------- LOAD LIST ----------------------- */
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await safeFetchJSON("/api/magazines");
        if (!data.ok) {
          throw new Error(data.error || "Failed to load magazines");
        }
        setIssues(data.issues || []);
      } catch (err) {
        // Only show in UI, no JSON SyntaxError in console
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
    // If editor calls onSaved(null) after delete -> go back to list
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
        // new
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
    // Minimal shape expected by MagazineAdminEditor
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
