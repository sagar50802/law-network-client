// src/components/videos/VideoGallery.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { API_BASE, getJSON, authHeaders, absUrl } from "../../utils/api";
import IfOwnerOnly from "../common/IfOwnerOnly";
// import usePreviewLock from "../../hooks/usePreviewLock"; // removed
import QROverlay from "../common/QROverlay";
import { loadAccess } from "../../utils/access";
import AccessTimer from "../common/AccessTimer";
import useAccessSync from "../../hooks/useAccessSync";
import useSubmissionStream from "../../hooks/useSubmissionStream";

const PREVIEW_SECONDS = 10;

export default function VideoGallery() {
  const [playlists, setPlaylists] = useState([]);
  const [pid, setPid] = useState(null);
  const [clip, setClip] = useState(null);

  const [accessMap, setAccessMap] = useState({});
  const [accessLoading, setAccessLoading] = useState(false);
  const [grantToast, setGrantToast] = useState(null);

  const panelRef = useRef(null);
  const videoRef = useRef(null);
  const [playlistOverlay, setPlaylistOverlay] = useState(null);
  const overlayGuardRef = useRef(false);

  const [email] = useState(() => localStorage.getItem("userEmail") || "");
  useSubmissionStream(email);

  // ---------- helpers ----------
  const resolvePlaylistId = (featureId) => {
    if (!featureId) return null;
    const fid = String(featureId).trim().toLowerCase();
    const byId = playlists.find((pl) => String(pl.id).toLowerCase() === fid)?.id;
    if (byId) return byId;
    const byName = playlists.find((pl) => String(pl.name || pl.title || "").toLowerCase() === fid)?.id;
    if (byName) return byName;
    const bySlug = playlists.find((pl) => String(pl.slug || "").toLowerCase() === fid)?.id;
    if (bySlug) return bySlug;
    return null;
  };

  const getAccessForPlaylist = async (pl) => {
    const candidates = [];
    candidates.push(await loadAccess("playlist", pl.id, email));
    if (pl.name) candidates.push(await loadAccess("playlist", pl.name, email));
    if (pl.slug) candidates.push(await loadAccess("playlist", pl.slug, email));
    const valid = candidates.filter((x) => x?.expiry && x.expiry > Date.now());
    if (!valid.length) return null;
    return valid.reduce((a, b) => (a.expiry > b.expiry ? a : b));
  };

  const persistLocalAccess = (playlistId, expiry) => {
    try {
      const key = `playlist:${playlistId}:${email}`;
      const store = JSON.parse(localStorage.getItem("access") || "{}");
      store[key] = { expiry };
      localStorage.setItem("access", JSON.stringify(store));
    } catch {}
  };

  const clearLocalAccess = (playlistId) => {
    try {
      const key = `playlist:${playlistId}:${email}`;
      const store = JSON.parse(localStorage.getItem("access") || "{}");
      if (store[key]) {
        delete store[key];
        localStorage.setItem("access", JSON.stringify(store));
      }
    } catch {}
  };

  // ---------- grants / revokes ----------
  const applyGrant = async ({ featureId, expiry, message }) => {
    const normalizedId = resolvePlaylistId(featureId);
    if (!normalizedId) return;
    persistLocalAccess(normalizedId, expiry);
    setAccessMap((prev) => ({ ...prev, [normalizedId]: { expiry, source: "event" } }));
    setPlaylistOverlay(null);
    overlayGuardRef.current = false;

    const savedName = localStorage.getItem("userName");
    const name = savedName || (email ? email.split("@")[0] : "User");
    setGrantToast(message || `🎉 Congratulations ${name}! Your access has been unlocked.`);
    setTimeout(() => setGrantToast(null), 4500);

    if (pid && String(pid) === String(normalizedId)) {
      try { await videoRef.current?.play?.(); } catch {}
    }

    const fresh = await loadAccess("playlist", normalizedId, email);
    setAccessMap((prev) => ({ ...prev, [normalizedId]: fresh }));
  };

  const applyRevoke = ({ featureId }) => {
    const normalizedId = resolvePlaylistId(featureId);
    if (!normalizedId) return;
    clearLocalAccess(normalizedId);
    setAccessMap((prev) => ({ ...prev, [normalizedId]: null }));
    const targetPl = playlists.find((pl) => String(pl.id) === String(normalizedId));
    if (targetPl) setPlaylistOverlay(targetPl);
    overlayGuardRef.current = true;
  };

  // ---------- data load ----------
  const load = async () => {
    setAccessLoading(true);
    const r = await getJSON(`${API_BASE}/api/videos`);
    const pls = r.playlists || [];
    setPlaylists(pls);
    if (!pid && pls[0]) setPid(pls[0].id);
    const newAccess = {};
    for (const pl of pls) newAccess[pl.id] = await getAccessForPlaylist(pl);
    setAccessMap(newAccess);
    setAccessLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!pid) return;
    const p = playlists.find((x) => x.id === pid);
    if (p?.items?.[0]) setClip(p.items[0]);
  }, [pid, playlists]);

  // refresh all access when window regains focus
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [playlists, email]);

  // auto refresh near expiries
  useEffect(() => {
    const now = Date.now();
    let nextExpiry = Infinity;
    for (const v of Object.values(accessMap)) {
      if (v?.expiry && v.expiry > now) nextExpiry = Math.min(nextExpiry, v.expiry);
    }
    if (!isFinite(nextExpiry)) return;
    const t = setTimeout(() => load(), Math.max(0, nextExpiry - now + 500));
    return () => clearTimeout(t);
  }, [accessMap]);

  // ---------- live sync from server ----------
  useAccessSync(async (detail) => {
    if (!detail || detail.email !== email || detail.feature !== "playlist") return;
    if (detail.expiry && detail.expiry > Date.now()) {
      return applyGrant({ featureId: detail.featureId, expiry: detail.expiry, message: detail.message });
    }
    if (detail.revoked === true) {
      return applyRevoke({ featureId: detail.featureId });
    }
    // refresh specific playlist access
    const normalizedId = resolvePlaylistId(detail.featureId) || detail.featureId;
    const stillHas = await loadAccess("playlist", normalizedId, email);
    setAccessMap((prev) => ({ ...prev, [normalizedId]: stillHas }));
    if (!stillHas) {
      const targetPl = playlists.find((pl) => String(pl.id) === String(normalizedId));
      if (targetPl) setPlaylistOverlay(targetPl);
      overlayGuardRef.current = true;
    } else {
      setPlaylistOverlay(null);
      overlayGuardRef.current = false;
    }
  });

  // ---------- video preview enforcement (native controls) ----------
  const plAccess = accessMap[pid];
  const unlocked = !!(plAccess?.expiry && plAccess.expiry > Date.now());

  // Reset guard and position when clip changes
  useEffect(() => {
    overlayGuardRef.current = false;
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  }, [clip?.id, pid]);

  // Build safe src (keep your original raw URL; switch to a proxy if you add one later)
  const videoSrc = clip?.url ? absUrl(clip.url) : "";

  // For UI badges
  const pMemo = useMemo(() => playlists.find((x) => x.id === pid), [playlists, pid]);

  return (
    <section id="video" className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Sidebar */}
      <aside className="md:col-span-1 border rounded-2xl bg-white">
        <div className="p-3 border-b font-semibold">Video Gallery</div>

        <div className="p-3 space-y-3 max-h-[60vh] overflow-auto">
          {playlists.map((pl) => {
            const plAcc = accessMap[pl.id];
            const unlockedPl = !!(plAcc?.expiry && plAcc.expiry > Date.now());
            return (
              <div key={pl.id} className={`border rounded-xl ${pid === pl.id ? "ring-2 ring-blue-500" : ""}`}>
                <div className="flex justify-between items-center px-3 py-2">
                  <button onClick={() => setPid(pl.id)} className="text-left font-medium flex-1">
                    {pl.name}
                  </button>

                  {unlockedPl ? (
                    <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                      <span>✅ Unlocked</span>
                      <AccessTimer timeLeftMs={plAcc.expiry - Date.now()} />
                      {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full" />}
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-1 rounded"
                      onClick={() => { setPlaylistOverlay(pl); overlayGuardRef.current = true; }}
                    >
                      <span>Unlock</span>
                      {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-white/80 border-t-transparent rounded-full" />}
                    </button>
                  )}
                </div>

                {pid === pl.id && (
                  <div className="px-2 pb-2 space-y-1">
                    {(pl.items || []).map((it) => {
                      const isActive = clip?.id === it.id;
                      return (
                        <div
                          key={it.id}
                          onClick={() => setClip(it)}
                          className={`px-2 py-2 rounded cursor-pointer hover:bg-gray-50 flex items-center justify-between ${isActive ? "bg-gray-50" : ""}`}
                        >
                          <div className="truncate">
                            <div className="text-sm font-medium truncate">{it.title}</div>
                            <div className="text-xs text-gray-500 truncate">{it.author}</div>
                          </div>
                          {unlockedPl ? (
                            <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                              <span>✅ Unlocked</span>
                              <AccessTimer timeLeftMs={plAcc.expiry - Date.now()} />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              <span>Locked</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {(pl.items || []).length === 0 && <div className="text-xs text-gray-500 px-2 pb-2">No videos</div>}
                  </div>
                )}
              </div>
            );
          })}
          {playlists.length === 0 && <div className="text-gray-500 text-sm">No playlists yet</div>}
        </div>

        {/* Admin: create playlist */}
        <IfOwnerOnly className="p-3 border-t">
          <form onSubmit={async (e) => {
            e.preventDefault();
            await fetch(`${API_BASE}/api/videos/playlists`, {
              method: "POST",
              headers: { ...authHeaders(), "Content-Type": "application/json" },
              body: JSON.stringify({ name: newPlName || "New Playlist" }),
            });
            setNewPlName("");
            await load();
          }} className="grid grid-cols-[1fr_auto] gap-2">
            <input className="border rounded p-2" placeholder="New playlist name" value={newPlName} onChange={(e) => setNewPlName(e.target.value)} />
            <button className="bg-black text-white px-3 rounded">Add</button>
          </form>
        </IfOwnerOnly>
      </aside>

      {/* Main Player */}
      <div
        ref={panelRef}
        className={`md:col-span-2 border rounded-2xl bg-white p-5 relative ${playlistOverlay ? "blur-sm opacity-80 pointer-events-none" : ""}`}
      >
        {grantToast && (
          <div className="absolute top-3 right-3 z-20 bg-green-600 text-white text-sm px-3 py-2 rounded-lg shadow">
            {grantToast}
          </div>
        )}

        {clip ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-lg font-semibold">{clip.title}</div>
                <div className="text-sm text-gray-500">{clip.author}</div>
              </div>
              {unlocked ? (
                <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full animate-pulse">
                  ✅ Unlocked <AccessTimer timeLeftMs={plAccess.expiry - Date.now()} />
                </div>
              ) : (
                <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Locked</div>
              )}
            </div>

            <div className="rounded-xl border p-3 bg-black">
              {/* ✅ native browser controls for smooth UX; preview enforced via events */}
              <video
                ref={videoRef}
                src={videoSrc}
                controls
                preload="metadata"
                className="w-full rounded-lg"
                controlsList="nodownload noplaybackrate noremoteplayback"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                onLoadedMetadata={(e) => {
                  // Some formats report Infinity until metadata loads
                  const d = Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0;
                  // no need to store, native UI shows duration, but could keep if wanted
                }}
                onPlay={(e) => {
                  const el = e.currentTarget;
                  if (!unlocked && el.currentTime >= PREVIEW_SECONDS) {
                    // already at/over limit → stop and show overlay
                    el.pause();
                    el.currentTime = PREVIEW_SECONDS - 0.1;
                    if (!overlayGuardRef.current) {
                      const currentPl = playlists.find((x) => x.id === pid);
                      if (currentPl) setPlaylistOverlay(currentPl);
                      overlayGuardRef.current = true;
                    }
                  }
                }}
                onTimeUpdate={(e) => {
                  const el = e.currentTarget;
                  if (!unlocked && el.currentTime >= PREVIEW_SECONDS) {
                    el.pause();
                    el.currentTime = PREVIEW_SECONDS - 0.1; // back off a bit to avoid instant retrigger
                    if (!overlayGuardRef.current) {
                      const currentPl = playlists.find((x) => x.id === pid);
                      if (currentPl) setPlaylistOverlay(currentPl);
                      overlayGuardRef.current = true;
                    }
                  }
                }}
                onSeeking={(e) => {
                  const el = e.currentTarget;
                  if (!unlocked && el.currentTime > PREVIEW_SECONDS) {
                    el.currentTime = PREVIEW_SECONDS - 0.1;
                    if (!overlayGuardRef.current) {
                      const currentPl = playlists.find((x) => x.id === pid);
                      if (currentPl) setPlaylistOverlay(currentPl);
                      overlayGuardRef.current = true;
                    }
                  }
                }}
              />
            </div>
          </>
        ) : (
          <div className="text-gray-500">Select a video</div>
        )}

        {/* Admin: upload */}
        <IfOwnerOnly>
          <UploadForm pid={pid} pMemo={pMemo} load={load} />
        </IfOwnerOnly>
      </div>

      {/* Overlay (outside blur) */}
      {playlistOverlay && (
        <QROverlay
          open={!!playlistOverlay}
          onClose={() => {
            // Pause + rewind slightly so it won’t instantly re-trigger
            const el = videoRef.current;
            if (el) {
              el.pause();
              el.currentTime = Math.min(PREVIEW_SECONDS - 0.2, el.currentTime || 0);
            }
            setPlaylistOverlay(null);
            overlayGuardRef.current = false;
          }}
          title={playlistOverlay.name}
          subjectLabel="Playlist"
          inline
          focusRef={panelRef}
          feature="playlist"
          featureId={playlistOverlay.id}
        />
      )}
    </section>
  );
}

/* --------- small uploader subcomponent (same behaviour as your original) --------- */
function UploadForm({ pid, pMemo, load }) {
  const [form, setForm] = useState({ title: "", author: "", file: null, locked: true });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!pid || !form.file) return;
    const fd = new FormData();
    fd.append("title", form.title || "Untitled");
    fd.append("author", form.author || "");
    fd.append("locked", String(form.locked));
    fd.append("video", form.file);
    await fetch(`${API_BASE}/api/videos/playlists/${pid}/items`, {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    setForm({ title: "", author: "", file: null, locked: true });
    await load();
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 border-t pt-4 grid gap-2">
      <div className="font-semibold">Upload video to playlist</div>
      <div className="grid md:grid-cols-3 gap-2">
        <input className="border rounded p-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="border rounded p-2" placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.locked} onChange={(e) => setForm({ ...form, locked: e.target.checked })} />
          Locked by default
        </label>
      </div>
      <input type="file" accept="video/mp4,video/webm,video/ogg" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
      <div className="text-xs text-gray-500">Playlist: {pMemo?.name || "—"}</div>
      <button className="bg-black text-white px-4 py-2 rounded w-fit" disabled={!pid || !form.file}>Upload</button>
    </form>
  );
}
