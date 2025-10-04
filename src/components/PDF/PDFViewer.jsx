import React, { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { API_BASE, getJSON, authHeaders, absUrl } from "../../utils/api";
import usePreviewLock from "../../hooks/usePreviewLock";
import IfOwnerOnly from "../common/IfOwnerOnly";
import QROverlay from "../common/QROverlay";
import { loadAccess } from "../../utils/access";
import AccessTimer from "../common/AccessTimer";
import useAccessSync from "../../hooks/useAccessSync";
import useSubmissionStream from "../../hooks/useSubmissionStream";

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
  const [subjectOverlay, setSubjectOverlay] = useState(null);
  const [forceBlur, setForceBlur] = useState(false);

  const [pdfErr, setPdfErr] = useState(""); // ⬅️ show real PDF load errors

  const panelRef = useRef(null);
  const [email] = useState(() => localStorage.getItem("userEmail") || "");
  useSubmissionStream(email);
  const pendingEventsRef = useRef([]);

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
    } else {
      setAccessMap((prev) => ({ ...prev, [normalizedId]: { expiry, source: "event" } }));
      setSubjectOverlay(null);
      setForceBlur(false);
      const savedName = localStorage.getItem("userName");
      const name = savedName || (email ? email.split("@")[0] : "User") || "User";
      setGrantToast(message || `🎉 Congratulations ${name}! Your access has been unlocked.`);
      setTimeout(() => setGrantToast(null), 4500);
      const fresh = await loadAccess("pdf", normalizedId, email);
      setAccessMap((prev) => ({ ...prev, [normalizedId]: fresh }));
    }
  };

  const applyRevoke = ({ featureId }) => {
    const normalizedId = resolveSubjectId(featureId);
    if (!normalizedId) {
      pendingEventsRef.current.push({ type: "revoke", featureId });
    } else {
      setAccessMap((prev) => ({ ...prev, [normalizedId]: null }));
      const target = subjects.find((s) => String(s.id) === String(normalizedId));
      if (target) setSubjectOverlay(target);
      setForceBlur(true);
    }
  };

  const load = async () => {
    setAccessLoading(true);
    setPdfErr("");
    const r = await getJSON("/pdfs");
    const subs = r.subjects || [];
    setSubjects(subs);
    if (!sid && subs[0]) setSid(subs[0].id);
    const next = {};
    for (const s of subs) next[s.id] = await getAccessForSubject(s);
    setAccessMap(next);
    setAccessLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (!subjects.length || pendingEventsRef.current.length === 0) return;
    const queue = pendingEventsRef.current.splice(0, pendingEventsRef.current.length);
    for (const ev of queue) {
      if (ev.type === "grant") applyGrant(ev);
      if (ev.type === "revoke") applyRevoke(ev);
    }
  }, [subjects.length]); // eslint-disable-line

  useEffect(() => {
    if (!sid) return;
    const s = subjects.find((x) => x.id === sid);
    if (s && s.chapters?.[0]) {
      setChapter(s.chapters[0]);
      setPage(1);
      setScale(1);
      setSubjectOverlay(null);
    } else {
      setChapter(null);
    }
  }, [sid, subjects]);

  useEffect(() => {
    const a = accessMap[sid];
    if (a?.expiry && a.expiry > Date.now()) setForceBlur(false);
  }, [accessMap, sid]);

  // 2s preview
  const lock = usePreviewLock({
    type: "notebook",
    id: chapter?.id || "none",
    previewSeconds: 2,
  });

  useEffect(() => {
    if (!chapter) return;
    const currentAccess = accessMap[sid];
    if (currentAccess?.expiry && currentAccess.expiry > Date.now()) return;
    if (lock.unlocked) return;
    const t = setTimeout(() => {
      const subj = subjects.find((x) => x.id === sid);
      if (subj) setSubjectOverlay(subj);
    }, 2000);
    return () => clearTimeout(t);
  }, [chapter?.id, sid, subjects, lock.unlocked, accessMap]);

  const refreshAllAccess = async () => {
    if (subjects.length === 0) return;
    setAccessLoading(true);
    const next = {};
    for (const s of subjects) next[s.id] = await getAccessForSubject(s);
    setAccessMap(next);
    setAccessLoading(false);
  };

  useAccessSync(async (detail) => {
    if (!detail || detail.email !== email || detail.feature !== "pdf") return;
    if (detail.expiry && detail.expiry > Date.now()) return applyGrant(detail);
    if (detail.revoked === true) return applyRevoke(detail);

    const normalizedId = resolveSubjectId(detail.featureId) || detail.featureId;
    const stillHas = await loadAccess("pdf", normalizedId, email);
    setAccessMap((prev) => ({ ...prev, [normalizedId]: stillHas }));
    if (!stillHas) {
      const target = subjects.find((s) => String(s.id) === String(normalizedId));
      if (target) setSubjectOverlay(target);
      setForceBlur(true);
    } else {
      setSubjectOverlay(null);
      setForceBlur(false);
    }
  });

  useEffect(() => {
    const onFocus = () => refreshAllAccess();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [subjects, email]); // eslint-disable-line

  useEffect(() => {
    const doRefresh = () => refreshAllAccess();
    window.addEventListener("softRefresh", doRefresh);
    return () => window.removeEventListener("softRefresh", doRefresh);
  }, []);

  useEffect(() => {
    const now = Date.now();
    let nextExpiry = Infinity;
    for (const v of Object.values(accessMap)) {
      if (v?.expiry && v.expiry > now) nextExpiry = Math.min(nextExpiry, v.expiry);
    }
    if (!isFinite(nextExpiry)) return;
    const delay = Math.max(0, nextExpiry - now + 500);
    const t = setTimeout(() => refreshAllAccess(), delay);
    return () => clearTimeout(t);
  }, [accessMap]);

  // ALWAYS go through the proxy to avoid CORS/ORB/port-origin issues
  const rawUrl = chapter?.url ? absUrl(chapter.url) : "";
  const safeSrc = rawUrl
    ? `${API_BASE}/pdfs/stream?src=${encodeURIComponent(rawUrl)}`
    : "";

  const s = subjects.find((x) => x.id === sid);
  const unlocked = accessMap[sid]?.expiry && accessMap[sid].expiry > Date.now();

  return (
    <section className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Sidebar */}
      <aside className="md:col-span-1 border rounded-2xl bg-white">
        <div className="p-3 border-b font-semibold">PDF Notebook</div>
        <div className="p-3 space-y-3 max-h-[60vh] overflow-auto">
          {subjects.map((sub) => {
            const subjAccess = accessMap[sub.id];
            return (
              <div key={sub.id} className={`border rounded-xl ${sid === sub.id ? "ring-2 ring-blue-500" : ""}`}>
                <div className="flex items-center justify-between px-3 py-2">
                  <button className="text-left font-medium flex-1" onClick={() => setSid(sub.id)}>
                    {sub.name}
                  </button>
                  {subjAccess?.expiry && subjAccess.expiry > Date.now() ? (
                    <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                      <span>✅ Unlocked</span>
                      <AccessTimer timeLeftMs={subjAccess.expiry - Date.now()} />
                      {accessLoading && (
                        <span className="animate-spin inline-block w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full" />
                      )}
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-1 rounded"
                      onClick={() => { setSubjectOverlay(sub); setForceBlur(false); }}
                    >
                      Unlock
                    </button>
                  )}
                </div>

                {sid === sub.id && (
                  <div className="px-2 pb-2 space-y-1">
                    {(sub.chapters || []).map((ch) => (
                      <div
                        key={ch.id}
                        className={`px-2 py-2 rounded cursor-pointer hover:bg-gray-50 flex items-center justify-between ${chapter?.id === ch.id ? "bg-gray-50" : ""}`}
                        onClick={() => { setChapter(ch); setPage(1); setScale(1); setPdfErr(""); }}
                      >
                        <div className="truncate">
                          <div className="text-sm font-medium truncate">{ch.title}</div>
                        </div>
                        {subjAccess?.expiry && subjAccess.expiry > Date.now() ? (
                          <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                            <span>✅ Unlocked</span>
                            <AccessTimer timeLeftMs={subjAccess.expiry - Date.now()} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Locked</div>
                        )}
                      </div>
                    ))}
                    {(sub.chapters || []).length === 0 && (
                      <div className="text-xs text-gray-500 px-2 pb-2">No chapters</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {subjects.length === 0 && <div className="text-gray-500 text-sm">No subjects yet</div>}
        </div>

        {/* Admin: create subject */}
        <IfOwnerOnly className="p-3 border-t">
          <AdminCreateSubject />
        </IfOwnerOnly>
      </aside>

      {/* Viewer (blurred while overlay active or forceBlur) */}
      <div
        ref={panelRef}
        className={`md:col-span-2 border rounded-2xl bg-white p-5 relative ${
          (subjectOverlay || (forceBlur && !unlocked)) ? "blur-sm opacity-80 pointer-events-none" : ""
        }`}
      >
        {grantToast && (
          <div className="absolute top-3 right-3 z-20 bg-green-600 text-white text-sm px-3 py-2 rounded-lg shadow">
            {grantToast}
          </div>
        )}

        {chapter ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{chapter.title}</div>
              {(() => {
                const subjAccess = accessMap[sid];
                return (
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    subjAccess?.expiry && subjAccess.expiry > Date.now()
                      ? "bg-green-100 text-green-700 animate-pulse"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {subjAccess?.expiry && subjAccess.expiry > Date.now()
                      ? <>✅ Unlocked <AccessTimer timeLeftMs={subjAccess.expiry - Date.now()} /></>
                      : `Locked (${Math.max(0, 2 - Math.floor((lock.spentMs || 0) / 1000))}s preview)`}
                    {accessLoading && (
                      <span className="ml-1 align-middle animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full"></span>
                    )}
                  </div>
                );
              })()}
            </div>

            <Toolbar
              page={page}
              numPages={numPages}
              scale={scale}
              setPage={setPage}
              setScale={setScale}
            />

            <div
              className={`bg-white shadow-lg p-3 max-h-[70vh] overflow-auto rounded-xl ${unlocked ? "" : "select-none"}`}
              onContextMenu={(e) => e.preventDefault()}
            >
              <Document
                key={safeSrc} // force reload if source changes
                file={safeSrc}
                onLoadSuccess={({ numPages }) => { setPdfErr(""); setNumPages(numPages || 1); setPage(1); }}
                onLoadError={(e) => { console.error("PDF load error:", e); setPdfErr(String(e?.message || "Failed to load PDF")); }}
                onSourceError={(e) => { console.error("PDF source error:", e); setPdfErr(String(e?.message || "Invalid PDF source")); }}
                renderMode="canvas"
                loading={<div className="p-6 text-gray-500">Loading PDF…</div>}
              >
                <Page
                  pageNumber={page}
                  scale={scale}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </Document>

              {pdfErr && (
                <div className="mt-3 text-xs text-red-600 break-all">
                  {pdfErr}
                </div>
              )}
            </div>

            {/* Admin actions for current chapter */}
            <IfOwnerOnly>
              <AdminChapterActions sid={sid} chapter={chapter} reload={load} />
            </IfOwnerOnly>
          </>
        ) : (
          <div className="text-gray-500">Select a chapter</div>
        )}
      </div>

      {/* Overlay (outside panel) */}
      {subjectOverlay && (
        <QROverlay
          open
          onClose={() => { setSubjectOverlay(null); setForceBlur(true); }}
          title={subjectOverlay.name}
          subjectLabel="PDF Notebook"
          inline
          focusRef={panelRef}
          feature="pdf"
          featureId={subjectOverlay.id}
        />
      )}
    </section>
  );
}

/* ---- tiny in-file helpers ---- */

function AdminCreateSubject() {
  const [name, setName] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    await fetch(`/pdfs/subjects`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || "New Subject" }),
    });
    setName("");
    window.dispatchEvent(new Event("softRefresh"));
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-[1fr_auto] gap-2">
      <input
        className="border rounded p-2"
        placeholder="New subject name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button className="bg-black text-white px-3 rounded">Add</button>
    </form>
  );
}

function Toolbar({ page, numPages, scale, setPage, setScale }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") setPage((p) => Math.min(numPages, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(2, +(s + 0.1).toFixed(2)));
      if (e.key === "-") setScale((s) => Math.max(0.6, +(s - 0.1).toFixed(2)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [numPages, setPage, setScale]);

  return (
    <div className="flex justify-center gap-3 mb-3 text-sm">
      <button onClick={() => setScale((s) => Math.max(0.6, +(s - 0.1).toFixed(2)))} className="px-3 py-1 rounded border">-</button>
      <span>{Math.round(scale * 100)}%</span>
      <button onClick={() => setScale((s) => Math.min(2, +(s + 0.1).toFixed(2)))} className="px-3 py-1 rounded border">+</button>
      <button onClick={() => setScale(1)} className="px-3 py-1 rounded border">Reset</button>
      <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className={`px-3 py-1 rounded border ${page <= 1 ? "opacity-50 cursor-not-allowed" : ""}`}>Prev</button>
      <span>Page {page} / {numPages}</span>
      <button disabled={page >= numPages} onClick={() => setPage((p) => Math.min(numPages, p + 1))} className={`px-3 py-1 rounded border ${page >= numPages ? "opacity-50 cursor-not-allowed" : ""}`}>Next</button>
    </div>
  );
}

function AdminChapterActions({ sid, chapter, reload }) {
  const del = async () => {
    if (!confirm("Delete this chapter?")) return;
    await fetch(`/pdfs/subjects/${sid}/chapters/${chapter.id}`, { method: "DELETE", headers: authHeaders() });
    await reload();
  };
  const toggle = async () => {
    await fetch(`/pdfs/subjects/${sid}/chapters/${chapter.id}/lock`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ locked: !chapter.locked }),
    });
    await reload();
  };
  return (
    <div className="mt-3 flex gap-2">
      <button className="text-xs px-3 py-1 rounded border" onClick={toggle}>
        {chapter.locked ? "Unlock" : "Lock"}
      </button>
      <button className="text-xs px-3 py-1 rounded border text-red-600" onClick={del}>
        Delete
      </button>
    </div>
  );
}
