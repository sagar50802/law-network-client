// client/src/components/Admin/AdminPDFEditor.jsx
import { useEffect, useRef, useState } from "react";
import {
  getJSON,
  postJSON,
  upload,
  deleteJSON,
  absUrl,
  authHeaders,
} from "../../utils/api";

export default function AdminPDFEditor() {
  const [subjects, setSubjects] = useState([]);
  const [sel, setSel] = useState("");
  const [newName, setNewName] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function load() {
    try {
      setError("");
      const r = await getJSON("/pdfs", { headers: authHeaders() });
      setSubjects(r.subjects || []);
      if (!sel && r.subjects?.[0]) setSel(r.subjects[0].id);
    } catch (e) {
      console.error(e);
      setError("Failed to load PDF subjects");
      setSubjects([]);
      setSel("");
    }
  }
  useEffect(() => {
    load();
  }, []);

  // create subject
  async function addSubject() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await postJSON(
        "/pdfs/subjects",
        { name: newName },
        { headers: authHeaders() }
      );
      setNewName("");
      await load();
    } catch (err) {
      alert("Create subject failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  // delete subject
  async function deleteSubject(id) {
    if (!confirm("Delete subject and all chapters?")) return;
    setBusy(true);
    try {
      await deleteJSON(`/pdfs/subjects/${id}`, { headers: authHeaders() });
      if (sel === id) setSel("");
      await load();
    } catch (err) {
      alert("Delete subject failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  // add chapter
  async function addChapter(e) {
    e.preventDefault();
    if (!sel || !file) return;
    const fd = new FormData();
    fd.append("title", title || "Untitled");
    fd.append("locked", "true");
    fd.append("pdf", file);

    try {
      setBusy(true);
      await upload(`/pdfs/subjects/${sel}/chapters`, fd, {
        headers: authHeaders(),
      });
      setTitle("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      alert("Upload chapter failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  // delete chapter
  async function delChapter(cid) {
    if (!confirm("Delete this chapter?")) return;
    try {
      setBusy(true);
      await deleteJSON(`/pdfs/subjects/${sel}/chapters/${cid}`, {
        headers: authHeaders(),
      });
      await load();
    } catch (err) {
      alert("Delete chapter failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  const selected = subjects.find((s) => s.id === sel);

  return (
    <div className="space-y-4">
      {/* Create subject */}
      <div className="flex gap-2">
        <input
          className="border p-2 rounded flex-1"
          placeholder="New subject name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={busy}
        />
        <button
          onClick={addSubject}
          className="bg-black text-white px-3 rounded disabled:opacity-60"
          disabled={busy || !newName.trim()}
        >
          Add
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Subjects */}
        <div className="space-y-2">
          {subjects.map((s) => (
            <div
              key={s.id}
              className={`border rounded p-2 flex items-center justify-between cursor-pointer ${
                sel === s.id ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => setSel(s.id)}
            >
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-gray-500">
                  {s.chapters?.length || 0} chapters
                </div>
              </div>
              <button
                className="text-red-600 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSubject(s.id);
                }}
                disabled={busy}
              >
                Delete
              </button>
            </div>
          ))}
          {subjects.length === 0 && (
            <div className="text-gray-400">No subjects yet</div>
          )}
        </div>

        {/* Upload chapter */}
        <form onSubmit={addChapter} className="space-y-2">
          <input
            className="border p-2 rounded w-full"
            placeholder="Chapter title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={busy}
          />
          {selected && (
            <div className="text-xs text-gray-500">Subject: {selected.name}</div>
          )}
          <button
            type="submit"
            className="bg-black text-white px-3 rounded disabled:opacity-60"
            disabled={!sel || !file || busy}
          >
            Upload
          </button>
        </form>
      </div>

      {/* Chapters in selected */}
      {selected && (
        <div className="space-y-2">
          <h4 className="font-semibold">Chapters in “{selected.name}”</h4>
          <ul className="space-y-2">
            {(selected.chapters || []).map((ch) => (
              <li
                key={ch.id}
                className="border rounded p-2 flex items-center justify-between"
              >
                <div className="truncate">
                  <div className="font-medium">{ch.title}</div>
                  <a
                    href={absUrl(ch.url)} // ✅ ensure absolute URL
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline text-blue-600"
                  >
                    Open
                  </a>
                </div>
                <button
                  className="text-red-600 text-sm"
                  onClick={() => delChapter(ch.id)}
                  disabled={busy}
                >
                  Delete
                </button>
              </li>
            ))}
            {(selected.chapters?.length ?? 0) === 0 && (
              <li className="text-gray-400">No chapters yet</li>
            )}
          </ul>
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
