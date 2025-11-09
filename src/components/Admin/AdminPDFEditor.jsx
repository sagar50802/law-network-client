import { useEffect, useMemo, useRef, useState } from "react";
import {
  getJSON,
  postJSON,
  upload,
  deleteJSON,
  absUrl,
  authHeaders,
} from "../../utils/api";

// Safely append ?owner=... or &owner=... based on whether the URL already has a query string
function addOwner(url) {
  const h = authHeaders() || {};
  const headerKey = h["X-Owner-Key"] || h["x-owner-key"] || "";
  const bearer =
    typeof h.Authorization === "string" && h.Authorization.startsWith("Bearer ")
      ? h.Authorization.slice(7)
      : "";
  const key = headerKey || bearer || "";
  if (!key) return url;
  return url + (url.includes("?") ? `&owner=${encodeURIComponent(key)}` : `?owner=${encodeURIComponent(key)}`);
}

export default function AdminPDFEditor() {
  const [subjects, setSubjects] = useState([]);
  const [sel, setSel] = useState(""); // selected subject id
  const [newName, setNewName] = useState("");

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [locked, setLocked] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const log = (...a) => console.log("[AdminPDF]", ...a);
  const warn = (...a) => console.warn("[AdminPDF]", ...a);

  // normalizer (API may return slightly different shapes)
  const normalize = (r) => {
    if (Array.isArray(r)) return r;
    if (Array.isArray(r?.subjects)) return r.subjects;
    if (Array.isArray(r?.data)) return r.data;
    return [];
  };

  async function load() {
    try {
      setError("");
      const r = await getJSON("/pdfs", { headers: authHeaders() });
      const arr = normalize(r);
      setSubjects(arr);
      if (!sel && arr[0]) setSel(arr[0].id);
    } catch (e) {
      warn("load failed:", e);
      setError("Failed to load PDF subjects");
      setSubjects([]);
      setSel("");
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => subjects.find((s) => (s._id || s.id) === sel),
    [subjects, sel]
  );

  // Create subject
  async function addSubject() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const qs = new URLSearchParams({ name }).toString();
      await postJSON(
        addOwner(`/pdfs/subjects?${qs}`),
        { name, subjectName: name },
        { headers: { ...authHeaders(), "Content-Type": "application/json" } }
      );
      setNewName("");
      await load();
    } catch (e) {
      warn("create subject failed:", e);
      alert("Create subject failed");
    } finally {
      setBusy(false);
    }
  }

  // Delete subject
  async function deleteSubject(id) {
    if (!id) return;
    if (!confirm("Delete subject and all chapters?")) return;
    setBusy(true);
    try {
      await deleteJSON(addOwner(`/pdfs/subjects/${encodeURIComponent(id)}`), {
        headers: authHeaders(),
      });
      if (sel === id) setSel("");
    } catch (e) {
      warn("delete subject failed:", e);
      alert("Delete subject failed");
    } finally {
      setBusy(false);
      await load();
    }
  }

  // Upload chapter (file or external URL)
  async function uploadChapter(e) {
    e?.preventDefault?.();
    const sid = selected?._id || selected?.id || sel;
    if (!sid) return alert("Select a subject first");
    if (!file && !url.trim())
      return alert("Choose a PDF file or paste a direct PDF URL");

    const fd = new FormData();
    fd.append("title", title || "Untitled");
    fd.append("locked", locked ? "true" : "false");
    if (file) fd.append("pdf", file); // backend expects "pdf"
    if (url.trim()) fd.append("url", url.trim());

    setBusy(true);
    try {
      await upload(
        addOwner(`/pdfs/subjects/${encodeURIComponent(sid)}/chapters`),
        fd,
        { headers: authHeaders() }
      );
      // reset
      setTitle("");
      setUrl("");
      setFile(null);
      setLocked(true);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      warn("upload failed:", err);
      alert("Upload failed. Check server logs for details.");
    } finally {
      setBusy(false);
    }
  }

  // Delete one chapter
  async function removeChapter(cid) {
    const sid = selected?._id || selected?.id || sel;
    if (!sid || !cid) return;
    if (!confirm("Delete this chapter?")) return;
    setBusy(true);
    try {
      await deleteJSON(
        addOwner(
          `/pdfs/subjects/${encodeURIComponent(sid)}/chapters/${encodeURIComponent(
            cid
          )}`
        ),
        { headers: authHeaders() }
      );
    } catch (e) {
      warn("delete chapter failed:", e);
    } finally {
      setBusy(false);
      await load();
    }
  }

  return (
    <div className="space-y-4">
      {/* Create subject */}
      <div className="flex gap-2 items-center">
        <input
          className="border p-2 rounded flex-1"
          placeholder="New subject name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={busy}
        />
        <button
          className="bg-black text-white px-3 rounded disabled:opacity-60"
          onClick={addSubject}
          disabled={busy || !newName.trim()}
        >
          Add
        </button>
      </div>

      {/* Select subject */}
      <select
        className="border p-2 rounded w-full"
        value={sel}
        onChange={(e) => setSel(e.target.value)}
        disabled={busy}
      >
        <option value="">Select subject…</option>
        {subjects.map((s) => (
          <option key={s._id || s.id} value={s._id || s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Upload chapter */}
      <form onSubmit={uploadChapter} className="grid gap-2">
        <input
          className="border p-2 rounded"
          placeholder="Chapter title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
        <input
          className="border p-2 rounded"
          placeholder="External PDF URL (optional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
        />
        <div className="text-sm">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={busy}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={locked}
            onChange={(e) => setLocked(e.target.checked)}
            disabled={busy}
          />
          Locked (requires access)
        </label>
        <button
          className="bg-blue-600 text-white px-3 py-2 rounded w-fit disabled:opacity-60"
          disabled={busy || !sel || (!file && !url.trim())}
        >
          {busy ? "Uploading..." : "Upload"}
        </button>
      </form>

      {/* Subject list + chapters */}
      {subjects.map((s) => (
        <div key={s._id || s.id} className="space-y-2 border rounded p-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{s.name}</div>
            <button
              className="text-red-600 text-sm"
              onClick={() => deleteSubject(s._id || s.id)}
              disabled={busy}
            >
              Delete Subject
            </button>
          </div>
          <ul className="space-y-2">
            {(s.chapters || []).map((ch) => (
              <li key={ch._id || ch.id} className="border rounded p-2">
                <div className="font-medium">{ch.title}</div>
                <div className="text-xs text-gray-500 break-all">
                  {absUrl(ch.url)}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    className="px-2 py-1 border rounded text-xs text-red-600"
                    onClick={() => removeChapter(ch._id || ch.id)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {(s.chapters?.length ?? 0) === 0 && (
              <li className="text-gray-400">No chapters yet</li>
            )}
          </ul>
        </div>
      ))}

      {error && (
        <div className="text-sm whitespace-pre-wrap text-red-600">{error}</div>
      )}
    </div>
  );
}
