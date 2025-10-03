// src/components/podcasts/Podcast.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, getJSON, authHeaders, absUrl } from "../../utils/api";
import IfOwnerOnly from "../common/IfOwnerOnly";
import QROverlay from "../common/QROverlay";
import AccessTimer from "../common/AccessTimer";
import { loadAccess } from "../../utils/access";
import useAccessSync from "../../hooks/useAccessSync";
import useSubmissionStream from "../../hooks/useSubmissionStream";

const PREVIEW_SECONDS = 10;

/** Always proxy the audio through your API to avoid R2 CORS problems */
function toPlayable(url) {
  if (!url) return "";
  return `${API_BASE}/podcasts/stream?src=${encodeURIComponent(absUrl(url))}`;
}

export default function Podcast() {
  /* ---------------- data ---------------- */
  const [playlists, setPlaylists] = useState([]);
  const [pid, setPid] = useState(null);
  const [track, setTrack] = useState(null);

  /* ---------------- access ---------------- */
  const [accessMap, setAccessMap] = useState({});
  const [accessLoading, setAccessLoading] = useState(false);
  const [grantToast, setGrantToast] = useState(null);
  const [overlayPl, setOverlayPl] = useState(null);

  const email = useMemo(() => localStorage.getItem("userEmail") || "", []);
  useSubmissionStream(email);

  const audioRef = useRef(null);
  const barRef = useRef(null);
  const panelRef = useRef(null);

  /** IMPORTANT: “previewUsed” is false when you can still listen for 10s.
   * Becomes true the moment you hit 10s (or try to seek/skip to/after 10s).
   * While false, locked users can play normally; once true, they are blocked
   * until they actually unlock. */
  const previewUsedRef = useRef(false);

  const currentPlaylist = useMemo(
    () => playlists.find((p) => p.id === pid) || null,
    [pid, playlists]
  );

  const plAccess = currentPlaylist ? accessMap[currentPlaylist.id] : null;
  const isUnlocked = !!plAccess?.expiry && plAccess.expiry > Date.now();

  /* ---------------- load ---------------- */
  const getAccessForPlaylist = async (pl) => {
    const tries = [
      await loadAccess("podcast", pl.id, email),
      pl.name ? await loadAccess("podcast", pl.name, email) : null,
      pl.slug ? await loadAccess("podcast", pl.slug, email) : null,
    ].filter(Boolean);
    const valid = tries.filter((x) => x?.expiry && x.expiry > Date.now());
    if (!valid.length) return null;
    return valid.reduce((a, b) => (a.expiry > b.expiry ? a : b));
  };

  const loadAll = async () => {
    setAccessLoading(true);
    const r = await getJSON("/podcasts");
    const pls = r.playlists || [];
    setPlaylists(pls);
    if (!pid && pls[0]) setPid(pls[0].id);

    const next = {};
    for (const pl of pls) next[pl.id] = await getAccessForPlaylist(pl);
    setAccessMap(next);
    setAccessLoading(false);
  };

  useEffect(() => { loadAll(); }, []); // mount

  useEffect(() => {
    if (!pid) return;
    const pl = playlists.find((p) => p.id === pid);
    if (pl?.items?.[0]) setTrack(pl.items[0]);
  }, [pid, playlists]);

  const refreshAccess = async () => {
    if (!playlists.length) return;
    const next = {};
    for (const pl of playlists) next[pl.id] = await getAccessForPlaylist(pl);
    setAccessMap(next);
  };

  // When any access expires soon, refresh at expiry
  useEffect(() => {
    const now = Date.now();
    const expiries = Object.values(accessMap)
      .map((x) => x?.expiry)
      .filter((t) => t && t > now);
    if (!expiries.length) return;
    const t = setTimeout(() => refreshAccess(), Math.min(...expiries) - now + 500);
    return () => clearTimeout(t);
  }, [accessMap]);

  // Soft refresh & window focus refreshes access
  useEffect(() => {
    const f = () => refreshAccess();
    window.addEventListener("focus", f);
    const sr = () => refreshAccess();
    window.addEventListener("softRefresh", sr);
    return () => {
      window.removeEventListener("focus", f);
      window.removeEventListener("softRefresh", sr);
    };
  }, [playlists.length]);

  /* ---------------- live access sync (events / overlay flow) ---------------- */
  const resolvePlaylistId = (featureId) => {
    const fid = String(featureId || "").toLowerCase();
    return (
      playlists.find((p) => String(p.id).toLowerCase() === fid)?.id ||
      playlists.find((p) => String(p.name || "").toLowerCase() === fid)?.id ||
      playlists.find((p) => String(p.slug || "").toLowerCase() === fid)?.id ||
      null
    );
  };

  const persistLocalAccess = (playlistId, expiry) => {
    try {
      const key = `podcast:${playlistId}:${email}`;
      const store = JSON.parse(localStorage.getItem("access") || "{}");
      store[key] = { expiry };
      localStorage.setItem("access", JSON.stringify(store));
    } catch {}
  };

  const clearLocalAccess = (playlistId) => {
    try {
      const key = `podcast:${playlistId}:${email}`;
      const store = JSON.parse(localStorage.getItem("access") || "{}");
      if (store[key]) {
        delete store[key];
        localStorage.setItem("access", JSON.stringify(store));
      }
    } catch {}
  };

  const applyGrant = async ({ featureId, expiry, message }) => {
    const id = resolvePlaylistId(featureId);
    if (!id) return; // ignore if not visible yet

    persistLocalAccess(id, expiry);
    setAccessMap((prev) => ({ ...prev, [id]: { expiry, source: "event" } }));
    setOverlayPl(null);
    previewUsedRef.current = false; // resume allowed

    const nm = localStorage.getItem("userName") || (email ? email.split("@")[0] : "User");
    setGrantToast(message || `🎉 Congratulations ${nm}! Your access has been unlocked.`);
    setTimeout(() => setGrantToast(null), 4500);

    if (String(pid) === String(id)) {
      try { await audioRef.current?.play?.(); } catch {}
    }
  };

  const applyRevoke = ({ featureId }) => {
    const id = resolvePlaylistId(featureId);
    if (!id) return;
    clearLocalAccess(id);
    setAccessMap((prev) => ({ ...prev, [id]: null }));
    if (String(pid) === String(id)) {
      previewUsedRef.current = true;
      setOverlayPl(playlists.find((p) => p.id === id) || null);
      try {
        const el = audioRef.current;
        if (el) {
          el.pause();
          if (!Number.isNaN(el.duration)) el.currentTime = 0;
        }
      } catch {}
    }
  };

  useAccessSync(async (detail) => {
    if (!detail || detail.email !== email || detail.feature !== "podcast") return;
    if (detail.expiry && detail.expiry > Date.now()) {
      return applyGrant(detail);
    }
    if (detail.revoked === true) {
      return applyRevoke(detail);
    }
    // fallback hard refresh
    await refreshAccess();
  });

  /* ---------------- player state ---------------- */
  const [isPlaying, setIsPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);
  const [seeking, setSeeking] = useState(false);

  const mmss = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  /** If locked & preview is already used => open overlay & block */
  const requireUnlockIfPreviewUsed = (origin) => {
    if (isUnlocked) return false;
    if (!previewUsedRef.current) return false; // still allowed (within 10s)
    // Block & show overlay
    try {
      const el = audioRef.current;
      if (el) {
        el.pause();
        if (!Number.isNaN(el.duration)) el.currentTime = 0;
      }
    } catch {}
    setIsPlaying(false);
    if (currentPlaylist) setOverlayPl(currentPlaylist);
    return true;
  };

  /** clamp target time for locked users inside preview window;
   * if the attempt goes beyond preview, consume preview & block. */
  const applyLockedSeekGuard = (targetSeconds) => {
    if (isUnlocked) return { ok: true, time: targetSeconds };

    if (previewUsedRef.current) {
      // Already spent → block
      requireUnlockIfPreviewUsed("seek");
      return { ok: false, time: 0 };
    }

    if (targetSeconds >= PREVIEW_SECONDS - 0.02) {
      // Trying to jump to/beyond edge → spend preview, block
      previewUsedRef.current = true;
      requireUnlockIfPreviewUsed("seek-end");
      return { ok: false, time: 0 };
    }

    // within preview window
    return { ok: true, time: Math.max(0, targetSeconds) };
  };

  /** Wire audio on track change */
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track) return;

    // reset preview allowance for new track
    previewUsedRef.current = false;

    el.src = toPlayable(track.url || "");
    el.load();
    setIsPlaying(false);
    setCur(0);
    setDur(0);

    const onLoaded = () => {
      setDur(isFinite(el.duration) ? el.duration : 0);
      setVol(el.volume);
    };

    const onTime = () => {
      if (!seeking) setCur(el.currentTime || 0);
      // Enforce 10s preview
      if (!isUnlocked && !previewUsedRef.current && el.currentTime >= PREVIEW_SECONDS) {
        previewUsedRef.current = true;
        el.pause();
        setIsPlaying(false);
        if (currentPlaylist) setOverlayPl(currentPlaylist);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVol = () => setVol(el.volume);
    const onEnded = () => setIsPlaying(false);
    const onError = () => setIsPlaying(false);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("volumechange", onVol);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);

    if (el.readyState >= 1) {
      setDur(isFinite(el.duration) ? el.duration : 0);
      setVol(el.volume);
    }

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("volumechange", onVol);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, pid, isUnlocked]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;

    // Only block if preview already spent AND still locked
    if (requireUnlockIfPreviewUsed("toggle")) return;

    try {
      if (isPlaying) el.pause();
      else await el.play();
    } catch {
      el.pause();
      setIsPlaying(false);
    }
  };

  const skip = (sec) => {
    const el = audioRef.current;
    if (!el) return;
    const target = (el.currentTime || 0) + sec;
    const guard = applyLockedSeekGuard(target);
    if (!guard.ok) return;
    el.currentTime = Math.min(guard.time, dur || el.duration || guard.time);
  };

  const onBarClick = (e) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const target = Math.max(0, Math.min(1, pct)) * (dur || 0);
    const guard = applyLockedSeekGuard(target);
    if (!guard.ok) return;
    audioRef.current.currentTime = guard.time;
    setCur(guard.time);
  };

  const startDrag = (e) => {
    // If preview already used and locked → block dragging entirely
    if (requireUnlockIfPreviewUsed("drag")) return;

    e.preventDefault();
    setSeeking(true);

    const move = (ev) => {
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const rect = barRef.current.getBoundingClientRect();
      const pct = (clientX - rect.left) / rect.width;
      const t = Math.max(0, Math.min(1, pct)) * (dur || 0);
      setCur(t);
    };

    const up = (ev) => {
      const clientX = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
      const rect = barRef.current.getBoundingClientRect();
      const pct = (clientX - rect.left) / rect.width;
      const t = Math.max(0, Math.min(1, pct)) * (dur || 0);
      const guard = applyLockedSeekGuard(t);
      if (guard.ok) {
        audioRef.current.currentTime = guard.time;
        setCur(guard.time);
      }
      setSeeking(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", up);
  };

  const setVolume = (v) => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, v));
    setVol(el.volume);
  };

  /* ---------------- admin bits (unchanged behaviour) ---------------- */
  const [newPlName, setNewPlName] = useState("");
  const [form, setForm] = useState({ title: "", artist: "", audio: null, url: "", locked: true });

  const createPlaylist = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/podcasts/playlists`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name: (newPlName || "").trim() || "New Playlist" }),
    });
    setNewPlName("");
    await loadAll();
  };

  const uploadAudio = async (e) => {
    e.preventDefault();
    if (!pid || (!form.audio && !form.url)) return;
    const fd = new FormData();
    fd.append("title", form.title || "Untitled");
    fd.append("artist", form.artist || "");
    fd.append("locked", String(form.locked));
    if (form.audio) fd.append("audio", form.audio);
    if (form.url) fd.append("url", form.url);
    await fetch(`${API_BASE}/podcasts/playlists/${pid}/items`, {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    setForm({ title: "", artist: "", audio: null, url: "", locked: true });
    await loadAll();
  };

  const delItem = async (iid) => {
    await fetch(`${API_BASE}/podcasts/playlists/${pid}/items/${iid}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await loadAll();
  };

  const toggleLock = async (iid, newState) => {
    await fetch(`${API_BASE}/podcasts/playlists/${pid}/items/${iid}/lock`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ locked: newState }),
    });
    await loadAll();
  };

  /* ---------------- render ---------------- */
  return (
    <section className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* sidebar */}
      <aside className="md:col-span-1 border rounded-2xl bg-white">
        <div className="p-3 border-b font-semibold">Podcasts</div>
        <div className="p-3 space-y-3 max-h-[60vh] overflow-auto">
          {playlists.map((p) => {
            const acc = accessMap[p.id];
            const unlocked = acc?.expiry && acc.expiry > Date.now();
            return (
              <div key={p.id} className={`border rounded-xl ${pid === p.id ? "ring-2 ring-blue-500" : ""}`}>
                <div className="flex items-center justify-between px-3 py-2">
                  <button className="text-left font-medium flex-1" onClick={() => { setPid(p.id); setOverlayPl(null); }}>
                    {p.name}
                  </button>
                  {unlocked ? (
                    <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                      ✅ Unlocked <AccessTimer timeLeftMs={acc.expiry - Date.now()} />
                      {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full" />}
                    </div>
                  ) : (
                    <button className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-1 rounded"
                            onClick={() => setOverlayPl(p)}>
                      Preview / Unlock
                      {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-white/80 border-t-transparent rounded-full" />}
                    </button>
                  )}
                </div>

                {pid === p.id && (
                  <div className="px-2 pb-2 space-y-1">
                    {(p.items || []).map((it) => (
                      <div key={it.id}
                           className={`px-2 py-2 rounded cursor-pointer hover:bg-gray-50 flex items-center justify-between ${track?.id === it.id ? "bg-gray-50" : ""}`}
                           onClick={() => setTrack(it)}>
                        <div className="truncate">
                          <div className="text-sm font-medium truncate">{it.title}</div>
                          <div className="text-xs text-gray-500 truncate">{it.artist}</div>
                        </div>
                        {unlocked ? (
                          <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                            ✅ Unlocked <AccessTimer timeLeftMs={acc.expiry - Date.now()} />
                            {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full" />}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Locked</div>
                        )}
                      </div>
                    ))}
                    {(p.items || []).length === 0 && (
                      <div className="text-xs text-gray-500 px-2 pb-2">No items</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {playlists.length === 0 && <div className="text-gray-500 text-sm">No playlists yet</div>}
        </div>

        {/* admin: add playlist */}
        <IfOwnerOnly className="p-3 border-t">
          <form onSubmit={createPlaylist} className="grid grid-cols-[1fr_auto] gap-2">
            <input className="border rounded p-2" placeholder="New playlist name"
                   value={newPlName} onChange={(e) => setNewPlName(e.target.value)} />
            <button className="bg-black text-white px-3 rounded">Add</button>
          </form>
        </IfOwnerOnly>
      </aside>

      {/* main player */}
      <div ref={panelRef}
           className={`md:col-span-2 border rounded-2xl bg-white p-5 relative ${overlayPl ? "blur-sm opacity-80 pointer-events-none" : ""}`}>
        {grantToast && (
          <div className="absolute top-3 right-3 z-20 bg-green-600 text-white text-sm px-3 py-2 rounded-lg shadow">
            {grantToast}
          </div>
        )}

        {track ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold truncate">{track.title}</div>
                <div className="text-sm text-gray-500 truncate">{track.artist}</div>
              </div>
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isUnlocked ? "bg-green-100 text-green-700 animate-pulse" : "bg-red-100 text-red-700"}`}>
                {isUnlocked ? (
                  <>✅ Unlocked <AccessTimer timeLeftMs={plAccess.expiry - Date.now()} /></>
                ) : (
                  `Locked (${PREVIEW_SECONDS}s preview)`
                )}
                {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />}
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-[#121212] text-white shadow-lg">
              <audio ref={audioRef} preload="metadata" controls={false}
                     controlsList="nodownload noplaybackrate"
                     className="sr-only"
                     onContextMenu={(e) => e.preventDefault()} />

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-md bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                  <span className="text-xs uppercase tracking-wider opacity-80">
                    {track?.title?.slice(0, 3) || "Pod"}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                            onClick={() => skip(-15)} aria-label="Back 15 seconds">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v2a5 5 0 1 0 5 5h2A7 7 0 1 1 12 5Z" fill="currentColor"/>
                        <path d="M11 8v8l-5-4 5-4Z" fill="currentColor"/>
                      </svg>
                    </button>

                    <button className={`p-3 rounded-full ${isPlaying ? "bg-white/90 text-black" : "bg-[#1DB954] text-black"} hover:brightness-95 shadow`}
                            onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                      {isPlaying ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7L8 5Z" />
                        </svg>
                      )}
                    </button>

                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                            onClick={() => skip(15)} aria-label="Forward 15 seconds">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v2a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z" fill="currentColor"/>
                        <path d="M13 8v8l5-4-5-4Z" fill="currentColor"/>
                      </svg>
                    </button>

                    <div className="ml-2 hidden sm:flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 10v4h3l4 3V7L8 10H5z" />
                      </svg>
                      <input type="range" min={0} max={1} step={0.01}
                             value={vol} onChange={(e) => setVolume(parseFloat(e.target.value))}
                             className="w-28 accent-[#1DB954]" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 select-none">
                    <span className="text-xs tabular-nums text-white/70 w-10 text-right">{mmss(cur)}</span>
                    <div ref={barRef} className="relative h-2 rounded-full bg-white/15 flex-1 cursor-pointer"
                         onClick={onBarClick}>
                      <div className="absolute inset-y-0 left-0 rounded-full bg-[#1DB954]"
                           style={{ width: `${(dur ? cur / dur : 0) * 100}%` }} />
                      <div className="absolute -top-1.5 h-5 w-5 rounded-full bg-white shadow -translate-x-1/2"
                           style={{ left: `${(dur ? cur / dur : 0) * 100}%` }}
                           onMouseDown={startDrag}
                           onTouchStart={startDrag}
                           role="slider"
                           aria-valuemin={0}
                           aria-valuemax={dur || 0}
                           aria-valuenow={cur || 0}
                           tabIndex={0} />
                    </div>
                    <span className="text-xs tabular-nums text-white/70 w-10">{mmss(dur)}</span>
                  </div>

                  {!isUnlocked && (
                    <div className="text-[11px] text-white/60 mt-2">
                      Preview will auto-stop at {PREVIEW_SECONDS}s. Subscribe to continue.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin controls for current item */}
            <IfOwnerOnly>
              <div className="mt-3 flex gap-2">
                <button className="text-xs px-3 py-1 rounded border"
                        onClick={() => toggleLock(track.id, !track.locked)}>
                  {track.locked ? "Unlock" : "Lock"}
                </button>
                <button className="text-xs px-3 py-1 rounded border text-red-600"
                        onClick={() => delItem(track.id)}>
                  Delete
                </button>
              </div>
            </IfOwnerOnly>
          </>
        ) : (
          <div className="text-gray-500">Select a playlist item</div>
        )}

        {/* Admin: upload to current playlist */}
        <IfOwnerOnly className="mt-6 block">
          <form onSubmit={uploadAudio} className="grid gap-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input className="border p-2 rounded" placeholder="Title"
                     value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              <input className="border p-2 rounded" placeholder="Speaker (optional)"
                     value={form.artist} onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))} />
            </div>
            <input className="border p-2 rounded" placeholder="External audio URL (optional)"
                   value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
            <input type="file" accept="audio/*"
                   onChange={(e) => setForm((f) => ({ ...f, audio: e.target.files?.[0] || null }))} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.locked}
                     onChange={(e) => setForm((f) => ({ ...f, locked: e.target.checked }))} />
              Locked (requires access)
            </label>
            <button className="bg-blue-600 text-white px-3 py-2 rounded w-fit">
              Upload
            </button>
          </form>
        </IfOwnerOnly>
      </div>

      {/* Overlay lives OUTSIDE the blurred panel */}
      {overlayPl && (
        <QROverlay
          open={!!overlayPl}
          onClose={() => {
            // If still locked, keep playback blocked after closing
            if (!isUnlocked) {
              previewUsedRef.current = true; // preview has been spent
              try {
                const el = audioRef.current;
                if (el) {
                  el.pause();
                  if (!Number.isNaN(el.duration)) el.currentTime = 0;
                }
              } catch {}
            }
            setOverlayPl(null);
          }}
          title={overlayPl.name}
          subjectLabel="Podcast"
          inline
          focusRef={panelRef}
          feature="podcast"
          featureId={overlayPl.id}
        />
      )}
    </section>
  );
}
