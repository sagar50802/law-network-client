// src/components/pdfs/PDFViewer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { API_BASE, fetchJSON, authHeaders } from "../../utils/api";
import usePreviewLock from "../../hooks/usePreviewLock";
import IfOwnerOnly from "../common/IfOwnerOnly";
import QROverlay from "../common/QROverlay";
import { loadAccess } from "../../utils/access";
import AccessTimer from "../common/AccessTimer";
import useAccessSync from "../../hooks/useAccessSync";
import useSubmissionStream from "../../hooks/useSubmissionStream";

// Worker for react-pdf (Vite-safe)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PDFViewer() {
  const [subjects, setSubjects] = useState([]);
  const [sid, setSid] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [numPages, setNumPages] = useState(1);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);

  const [accessMap, setAccessMap] = useState({});
  const [accessLoading, setAccessLoading] = useState(false);
  const [grantToast, setGrantToast] = useState(null);

  const panelRef = useRef(null);
  const [subjectOverlay, setSubjectOverlay] = useState(null);
  const [forceBlur, setForceBlur] = useState(false);

  const [email] = useState(() => localStorage.getItem("userEmail") || "");
  useSubmissionStream(email);
  const pendingEventsRef = useRef([]);

  // ---------- helpers ----------
  const resolveSubjectId = (featureId) => {
    if (!featureId) return null;
    const fid = String(featureId).trim().toLowerCase();
    const byId = subjects.find((s) => String(s.id).toLowerCase() === fid);
    if (byId) return byId.id;
    const byName = subjects.find(
      (s) => String(s.name || s.title || "").toLowerCase() === fid
    );
    if (byName) return byName.id;
    const bySlug = subjects.find((s) => String(s.slug || "").toLowerCase() === fid);
    if (bySlug) return bySlug.id;
    return null;
  };

  const persistLocalAccess = (subjectId, expiry) => {
    try {
      const key = `pdf:${subjectId}:${email}`;
      const store = JSON.parse(localStorage.getItem("access") || "{}");
      store[key] = { expiry };
      localStorage.setItem("access", JSON.stringify(store));
    } catch {}
  };

  const clearLocalAccess = (subjectId) => {
    try {
      const key = `pdf:${subjectId}:${email}`;
      const store = JSON.parse(localStorage.getItem("access") || "{}");
      if (store[key]) {
        delete store[key];
        localStorage.setItem("access", JSON.stringify(store));
      }
    } catch {}
  };

  const getAccessForSubject = async (subj) => {
    const candidates = [];
    candidates.push(await loadAccess("pdf", subj.id, email));
    if (subj.name) candidates.push(await loadAccess("pdf", subj.name, email));
    if (subj.slug) candidates.push(await loadAccess("pdf", subj.slug, email));
    const valid = candidates.filter((x) => x?.expiry && x.expiry > Date.now());
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => (a.expiry > b.expiry ? a : b));
  };

  const applyGrant = async ({ featureId, expiry, message }) => {
    const normalizedId = resolveSubjectId(featureId);
    if (!normalizedId) {
      pendingEventsRef.current.push({ type: "grant", featureId, expiry, message });
      return;
    }

    persistLocalAccess(normalizedId, expiry);
    setAccessMap((prev) => ({ ...prev, [normalizedId]: { expiry, source: "event" } }));
    setSubjectOverlay(null);
    setForceBlur(false);

    const savedName = localStorage.getItem("userName");
    const fallbackName = email ? email.split("@")[0] : "User";
    const name = savedName || fallbackName || "User";
    setGrantToast(message || `🎉 Congratulations ${name}! Your access has been unlocked.`);
    setTimeout(() => setGrantToast(null), 4500);

    const fresh = await loadAccess("pdf", normalizedId, email);
    setAccessMap((prev) => ({ ...prev, [normalizedId]: fresh }));
  };

  const applyRevoke = ({ featureId }) => {
    const normalizedId = resolveSubjectId(featureId);
    if (!normalizedId) {
      pendingEventsRef.current.push({ type: "revoke", featureId });
      return;
    }
    clearLocalAccess(normalizedId);
    setAccessMap((prev) => ({ ...prev, [normalizedId]: null }));
    const target = subjects.find((s) => String(s.id) === String(normalizedId));
    if (target) setSubjectOverlay(target);
    setForceBlur(true);
  };

  // ---------- data load ----------
  const load = async () => {
    setAccessLoading(true);
    const r = await fetchJSON(`${API_BASE}/api/pdfs`);
    const subs = r.subjects || [];
    setSubjects(subs);
    if (!sid && subs[0]) setSid(subs[0].id);

    const newAccess = {};
    for (const s of subs) {
      newAccess[s.id] = await getAccessForSubject(s);
    }
    setAccessMap(newAccess);
    setAccessLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // 2s preview lock
  const lock = usePreviewLock({
    type: "notebook",
    id: chapter?.id || "none",
    previewSeconds: 2,
  });

  const onDocLoad = ({ numPages }) => {
    setNumPages(numPages || 1);
    setPage(1);
  };

  // ---- Admin actions ----
  const [newSubject, setNewSubject] = useState("");
  const [form, setForm] = useState({ title: "", file: null, locked: true });

  const createSubject = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/api/pdfs/subjects`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSubject || "New Subject" }),
    });
    setNewSubject("");
    await load();
  };

  // ✅ UPDATED: Upload to GridFS
  const uploadPDF = async (e) => {
    e.preventDefault();
    if (!sid || !form.file) return;
    const fd = new FormData();
    fd.append("file", form.file);

    // 1) Upload file to GridFS
    const res = await fetch(`${API_BASE}/api/gridfs/upload`, {
      method: "POST",
      body: fd,
    });
    const json = await res.json();

    // 2) Save chapter in normal pdfs collection, but with GridFS filename
    await fetch(`${API_BASE}/api/pdfs/subjects/${sid}/chapters`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title || "Untitled",
        locked: form.locked,
        url: `/api/gridfs/file/${json.filename}`, // 🔥 stream directly from GridFS
      }),
    });

    setForm({ title: "", file: null, locked: true });
    await load();
  };

  const delChapter = async (cid) => {
    await fetch(`${API_BASE}/api/pdfs/subjects/${sid}/chapters/${cid}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await load();
  };

  const toggleLock = async (cid, newState) => {
    await fetch(`${API_BASE}/api/pdfs/subjects/${sid}/chapters/${cid}/lock`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ locked: newState }),
    });
    await load();
  };

  const s = subjects.find((x) => x.id === sid);
  const unlocked = accessMap[sid]?.expiry && accessMap[sid].expiry > Date.now();

  return (
    <section className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Sidebar */}
      <aside className="md:col-span-1 border rounded-2xl bg-white">
        <div className="p-3 border-b font-semibold">PDF Notebook</div>
        <div className="p-3 space-y-3 max-h-[60vh] overflow-auto">
          {subjects.map((sub) => (
            <div key={sub.id} className="border rounded-xl">
              <div className="flex items-center justify-between px-3 py-2">
                <button onClick={() => setSid(sub.id)}>{sub.name}</button>
              </div>
            </div>
          ))}
        </div>
        <IfOwnerOnly className="p-3 border-t">
          <form onSubmit={createSubject} className="grid grid-cols-[1fr_auto] gap-2">
            <input
              className="border rounded p-2"
              placeholder="New subject name"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
            />
            <button className="bg-black text-white px-3 rounded">Add</button>
          </form>
        </IfOwnerOnly>
      </aside>

      {/* Viewer */}
      <div
        ref={panelRef}
        className={`md:col-span-2 border rounded-2xl bg-white p-5 relative ${
          (subjectOverlay || (forceBlur && !unlocked))
            ? "blur-sm opacity-80 pointer-events-none"
            : ""
        }`}
      >
        {chapter ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{chapter.title}</div>
            </div>
            <div
              className="bg-white shadow-lg p-3 max-h-[70vh] overflow-auto rounded-xl"
              onContextMenu={(e) => e.preventDefault()}
            >
              <Document
                file={`${API_BASE}${chapter.url}`} // ✅ will now point to /api/gridfs/file/:filename
                onLoadSuccess={onDocLoad}
              >
                <Page
                  pageNumber={page}
                  scale={scale}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </Document>
            </div>
          </>
        ) : (
          <div className="text-gray-500">Select a chapter</div>
        )}
      </div>

      {/* Admin upload */}
      {chapter && (
        <IfOwnerOnly>
          <form onSubmit={uploadPDF} className="md:col-span-3 mt-6 border-t pt-4 grid gap-2">
            <div className="font-semibold">Upload chapter (PDF) to subject</div>
            <div className="grid md:grid-cols-3 gap-2">
              <input
                className="border rounded p-2"
                placeholder="Chapter title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.locked}
                  onChange={(e) => setForm({ ...form, locked: e.target.checked })}
                />
                Locked by default
              </label>
            </div>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) =>
                setForm({ ...form, file: e.target.files?.[0] || null })
              }
            />
            <div className="text-xs text-gray-500">Subject: {s?.name || "—"}</div>
            <button
              className="bg-black text-white px-4 py-2 rounded w-fit"
              disabled={!sid || !form.file}
            >
              Upload
            </button>
          </form>
        </IfOwnerOnly>
      )}
    </section>
  );
}
