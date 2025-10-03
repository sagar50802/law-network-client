// src/components/podcasts/Podcast.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, getJSON, authHeaders, absUrl } from "../../utils/api";
import IfOwnerOnly from "../common/IfOwnerOnly";
import usePreviewLock from "../../hooks/usePreviewLock";
import QROverlay from "../common/QROverlay";
import { loadAccess } from "../../utils/access";
import AccessTimer from "../common/AccessTimer";
import useAccessSync from "../../hooks/useAccessSync";
import useSubmissionStream from "../../hooks/useSubmissionStream";

const PREVIEW_SECONDS = 10;
const PREVIEW_MS = PREVIEW_SECONDS * 1000;

export default function Podcast() {
  /* ---------- data ---------- */
  const [playlists, setPlaylists] = useState([]);
  const [pid, setPid] = useState(null);
  const [track, setTrack] = useState(null);

  /* ---------- access ---------- */
  const [accessMap, setAccessMap] = useState({});
  const [accessLoading, setAccessLoading] = useState(false);
  const [grantToast, setGrantToast] = useState(null);
  const [playlistOverlay, setPlaylistOverlay] = useState(null);

  const panelRef = useRef(null);
  const audioRef = useRef(null);
  const barRef = useRef(null);

  const [email] = useState(() => localStorage.getItem("userEmail") || "");
  useSubmissionStream(email);

  // overlay duplicate guard
  const gateRef = useRef({ overlayShown: false });

  // autoplay helper
  const shouldAutoPlayNextRef = useRef(false);

  // preview tracking
  const [previewUsed, setPreviewUsed] = useState(0);
  const previewStartRef = useRef(null);

  // player UI state
  const [isPlaying, setIsPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(() => {
    const saved = Number(localStorage.getItem("pod_vol"));
    return Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 1;
  });
  const [seeking, setSeeking] = useState(false);

  const isiOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);

  /* ---------- helpers ---------- */
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

  const getAccessForPlaylist = async (pl) => {
    const candidates = [];
    candidates.push(await loadAccess("podcast", pl.id, email));
    if (pl.name) candidates.push(await loadAccess("podcast", pl.name, email));
    if (pl.slug) candidates.push(await loadAccess("podcast", pl.slug, email));
    const valid = candidates.filter((x) => x?.expiry && x.expiry > Date.now());
    if (!valid.length) return null;
    return valid.reduce((a, b) => (a.expiry > b.expiry ? a : b));
  };

  /* ---------- load ---------- */
  const load = async () => {
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

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!pid) return;
    const pl = playlists.find((p) => p.id === pid);
    if (pl?.items?.[0]) setTrack(pl.items[0]);
  }, [pid, playlists]);

  /* ---------- access sync ---------- */
  const pendingEventsRef = useRef([]);
  useEffect(() => {
    if (!playlists.length || pendingEventsRef.current.length === 0) return;
    const queue = pendingEventsRef.current.splice(0);
    for (const ev of queue) {
      if (ev.type === "grant") applyGrant(ev);
      if (ev.type === "revoke") applyRevoke(ev);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlists.length]);

  useAccessSync(async (detail) => {
    if (!detail || detail.email !== email || detail.feature !== "podcast") return;

    if (detail.expiry && detail.expiry > Date.now()) {
      return applyGrant({
        featureId: detail.featureId,
        expiry: detail.expiry,
        message: detail.message,
      });
    }
    if (detail.revoked === true) {
      return applyRevoke({ featureId: detail.featureId });
    }

    const normalizedId = resolvePlaylistId(detail.featureId) || detail.featureId;
    const stillHas = await loadAccess("podcast", normalizedId, email);
    setAccessMap((prev) => ({ ...prev, [normalizedId]: stillHas }));
    if (!stillHas) {
      const targetPl = playlists.find((pl) => String(pl.id) === String(normalizedId));
      if (targetPl) setPlaylistOverlay(targetPl);
      gateRef.current.overlayShown = true;
    } else {
      setPlaylistOverlay(null);
      gateRef.current.overlayShown = false;
    }
  });

  const applyGrant = async ({ featureId, expiry, message }) => {
    const normalizedId = resolvePlaylistId(featureId);
    if (!normalizedId) {
      pendingEventsRef.current.push({ type: "grant", featureId, expiry, message });
      return;
    }
    persistLocalAccess(normalizedId, expiry);
    setAccessMap((prev) => ({ ...prev, [normalizedId]: { expiry, source: "event" } }));
    setPlaylistOverlay(null);
    gateRef.current.overlayShown = false;

    const name = localStorage.getItem("userName") || (email ? email.split("@")[0] : "User");
    setGrantToast(message || `🎉 Congratulations ${name}! Your access has been unlocked.`);
    setTimeout(() => setGrantToast(null), 4500);

    if (pid && String(pid) === String(normalizedId)) {
      try { await audioRef.current?.play?.(); } catch {}
    }

    const fresh = await loadAccess("podcast", normalizedId, email);
    setAccessMap((prev) => ({ ...prev, [normalizedId]: fresh }));
  };

  const applyRevoke = ({ featureId }) => {
    const normalizedId = resolvePlaylistId(featureId);
    if (!normalizedId) {
      pendingEventsRef.current.push({ type: "revoke", featureId });
      return;
    }
    clearLocalAccess(normalizedId);
    setAccessMap((prev) => ({ ...prev, [normalizedId]: null }));
    const targetPl = playlists.find((pl) => String(pl.id) === String(normalizedId));
    if (targetPl) setPlaylistOverlay(targetPl);
    gateRef.current.overlayShown = true;
  };

  // refresh access on focus + when nearing expiry
  useEffect(() => {
    const onFocus = () => refreshAllAccess();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlists, email]);

  const refreshAllAccess = async () => {
    if (!playlists.length) return;
    setAccessLoading(true);
    const next = {};
    for (const pl of playlists) next[pl.id] = await getAccessForPlaylist(pl);
    setAccessMap(next);
    setAccessLoading(false);
  };

  useEffect(() => {
    const now = Date.now();
    let nextExpiry = Infinity;
    for (const v of Object.values(accessMap)) {
      if (v?.expiry && v.expiry > now) nextExpiry = Math.min(nextExpiry, v.expiry);
    }
    if (!isFinite(nextExpiry)) return;
    const t = setTimeout(() => refreshAllAccess(), Math.max(0, nextExpiry - now + 500));
    return () => clearTimeout(t);
  }, [accessMap]);

  // badge-only helper (hard enforcement is below)
  usePreviewLock({ type: "podcast", id: track?.id || "none", previewSeconds: PREVIEW_SECONDS });

  /* ---------- build source with robust fallback ---------- */
  const buildUrls = (u) => {
    const raw = absUrl(u || "");
    const proxy = `${API_BASE}/podcasts/stream?src=${encodeURIComponent(raw)}`;
    return { raw, proxy };
  };

  const headOk = async (url, ms = 3000) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      const r = await fetch(url, { method: "HEAD", signal: ctrl.signal });
      clearTimeout(t);
      return r.ok;
    } catch {
      return false;
    }
  };

  /* ---------- when track/playlist changes ---------- */
  useEffect(() => {
    gateRef.current.overlayShown = false;
    setPreviewUsed(0);
    previewStartRef.current = null;

    const el = audioRef.current;
    if (!el) return;
    el.pause();
    setIsPlaying(false);
    setCur(0);
    setDur(0);

    const setSrc = async () => {
      if (!track?.url) {
        el.removeAttribute("src");
        return;
      }
      const { raw, proxy } = buildUrls(track.url);

      // Prefer proxy; if it rejects (e.g., Blocked src), fall back to raw.
      const canProxy = await headOk(proxy, 2500);
      el.src = canProxy ? proxy : raw;
      el.load();
    };

    const tryAutoPlay = async () => {
      if (!shouldAutoPlayNextRef.current) return;
      try { await el.play(); } catch {}
      shouldAutoPlayNextRef.current = false;
    };

    const onCanPlay = () => tryAutoPlay();
    el.addEventListener("canplay", onCanPlay);

    setSrc().then(() => {
      if (el.readyState >= 3) tryAutoPlay();
    });

    return () => el.removeEventListener("canplay", onCanPlay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, pid]);

  /* ---------- audio events: keep UI perfectly in sync ---------- */
  const plAccess = accessMap[pid];
  const unlocked = !!(plAccess?.expiry && plAccess.expiry > Date.now());

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (!isiOS) el.volume = vol;
    localStorage.setItem("pod_vol", String(isiOS ? vol : el.volume));

    const openOverlay = () => {
      if (gateRef.current.overlayShown) return;
      const currentPl = playlists.find((x) => x.id === pid);
      if (currentPl) setPlaylistOverlay(currentPl);
      gateRef.current.overlayShown = true;
    };

    const commitPreviewDelta = () => {
      if (previewStartRef.current != null) {
        const delta = performance.now() - previewStartRef.current;
        previewStartRef.current = null;
        setPreviewUsed((u) => Math.min(PREVIEW_MS, u + delta));
      }
    };

    const onLoaded = () => setDur(el.duration || 0);
    const onTime = () => {
      if (!seeking) setCur(el.currentTime || 0);

      if (!unlocked) {
        // If preview hits 10s, stop and show overlay
        if ((el.currentTime || 0) >= PREVIEW_SECONDS) {
          if (!el.paused) el.pause();
          setIsPlaying(false);
          // Clamp cursor to 10s for consistent UI
          const clampTo = Math.min(PREVIEW_SECONDS, el.duration || PREVIEW_SECONDS);
          if (!Number.isNaN(clampTo)) el.currentTime = clampTo;
          commitPreviewDelta();
          openOverlay();
        }
      }
    };

    const onPlay = () => {
      if (!unlocked && previewUsed >= PREVIEW_MS) {
        el.pause();
        setIsPlaying(false);
        openOverlay();
        return;
      }
      if (previewStartRef.current == null) previewStartRef.current = performance.now();
      setIsPlaying(true);
    };

    const onPause = () => { commitPreviewDelta(); setIsPlaying(false); };
    const onEnded = () => { commitPreviewDelta(); setIsPlaying(false); };
    const onVol = () => { setVol(el.volume); localStorage.setItem("pod_vol", String(el.volume)); };
    const onSeeking = () => {
      if (!unlocked) {
        const t = Math.min(el.currentTime || 0, PREVIEW_SECONDS);
        if (Math.abs(t - (el.currentTime || 0)) > 0.001) {
          el.currentTime = t;
          openOverlay();
        }
      }
    };
    const onError = () => setIsPlaying(false);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("seeking", onSeeking);
    el.addEventListener("volumechange", onVol);
    el.addEventListener("error", onError);

    // snapshot
    setIsPlaying(!el.paused && !el.ended);
    if (el.readyState >= 1) {
      setDur(el.duration || 0);
      setVol(isiOS ? vol : el.volume);
    }

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("seeking", onSeeking);
      el.removeEventListener("volumechange", onVol);
      el.removeEventListener("error", onError);
    };
  }, [unlocked, previewUsed, seeking, vol, playlists, pid, isiOS]);

  /* ---------- UI helpers ---------- */
  const mmss = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const openOverlay = () => {
    if (gateRef.current.overlayShown) return;
    const currentPl = playlists.find((x) => x.id === pid);
    if (currentPl) setPlaylistOverlay(currentPl);
    gateRef.current.overlayShown = true;
  };

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) return el.pause();
    if (!unlocked && previewUsed >= PREVIEW_MS) {
      openOverlay();
      return;
    }
    try { await el.play(); } catch {}
  };

  const seekWithinBounds = (t) => {
    const el = audioRef.current;
    if (!el) return;
    let target = Math.max(0, Math.min(t, dur || el.duration || 0));
    if (!unlocked) target = Math.min(target, PREVIEW_SECONDS);
    el.currentTime = target;
    setCur(target);
    if (!unlocked && target >= PREVIEW_SECONDS) openOverlay();
  };

  const onBarClick = (e) => {
    const rect = barRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const t = Math.max(0, Math.min(1, pct)) * (dur || 0);
    seekWithinBounds(t);
  };

  const startDrag = (e) => {
    e.preventDefault();
    setSeeking(true);
    const move = (ev) => {
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const rect = barRef.current.getBoundingClientRect();
      const pct = (clientX - rect.left) / rect.width;
      const total = dur || audioRef.current?.duration || 0;
      let target = Math.max(0, Math.min(1, pct)) * (total || 0);
      if (!unlocked) target = Math.min(target, PREVIEW_SECONDS);
      setCur(target);
    };
    const up = (ev) => {
      const clientX = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
      const rect = barRef.current.getBoundingClientRect();
      const pct = (clientX - rect.left) / rect.width;
      const t = Math.max(0, Math.min(1, pct)) * (dur || audioRef.current?.duration || 0);
      seekWithinBounds(t);
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

  const skip = (sec) => {
    const el = audioRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min((el.currentTime || 0) + sec, dur || el.duration || 0));
    seekWithinBounds(next);
  };

  const setVolume = (v) => {
    const el = audioRef.current;
    const clamped = Math.max(0, Math.min(1, v));
    setVol(clamped);
    if (el && !isiOS) el.volume = clamped;
    localStorage.setItem("pod_vol", String(clamped));
  };

  /* ---------- Admin ---------- */
  const [newPlName, setNewPlName] = useState("");
  const [form, setForm] = useState({ title: "", artist: "", audio: null, locked: true });

  const createPlaylist = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/podcasts/playlists`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPlName || "New Playlist" }),
    });
    setNewPlName("");
    await load();
  };

  const uploadAudio = async (e) => {
    e.preventDefault();
    if (!pid || !form.audio) return;
    const fd = new FormData();
    fd.append("title", form.title || "Untitled");
    fd.append("artist", form.artist || "");
    fd.append("locked", String(form.locked));
    fd.append("audio", form.audio);
    await fetch(`${API_BASE}/podcasts/playlists/${pid}/items`, {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    setForm({ title: "", artist: "", audio: null, locked: true });
    await load();
  };

  const delItem = async (iid) => {
    await fetch(`${API_BASE}/podcasts/playlists/${pid}/items/${iid}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await load();
  };

  const toggleLock = async (iid, newState) => {
    await fetch(`${API_BASE}/podcasts/playlists/${pid}/items/${iid}/lock`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ locked: newState }),
    });
    await load();
  };

  /* ---------- derived ---------- */
  const pl = useMemo(() => playlists.find((p) => p.id === pid), [playlists, pid]);

  /* ---------- render ---------- */
  return (
    <section id="podcast" className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Sidebar */}
      <aside className="md:col-span-1 border rounded-2xl bg-white">
        <div className="p-3 border-b font-semibold">Podcasts</div>
        <div className="p-3 space-y-3 max-h-[60vh] overflow-auto">
          {playlists.map((p) => {
            const pAccess = accessMap[p.id];
            const unlockedPl = !!(pAccess?.expiry && pAccess.expiry > Date.now());
            return (
              <div key={p.id} className={`border rounded-xl ${pid === p.id ? "ring-2 ring-blue-500" : ""}`}>
                <div className="flex items-center justify-between px-3 py-2">
                  <button className="text-left font-medium flex-1" onClick={() => setPid(p.id)}>
                    {p.name}
                  </button>

                  {unlockedPl ? (
                    <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                      <span>✅ Unlocked</span>
                      <AccessTimer timeLeftMs={pAccess.expiry - Date.now()} />
                      {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full" />}
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-1 rounded"
                      onClick={() => { setPlaylistOverlay(p); gateRef.current.overlayShown = true; }}
                    >
                      <span>Preview / Unlock</span>
                      {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-white/80 border-t-transparent rounded-full" />}
                    </button>
                  )}
                </div>

                {pid === p.id && (
                  <div className="px-2 pb-2 space-y-1">
                    {(p.items || []).map((it) => {
                      const isActive = track?.id === it.id;
                      return (
                        <div
                          key={it.id}
                          className={`px-2 py-2 rounded cursor-pointer hover:bg-gray-50 flex items-center justify-between ${isActive ? "bg-gray-50" : ""}`}
                          onClick={() => {
                            setTrack(it);
                            shouldAutoPlayNextRef.current = true;
                          }}
                        >
                          <div className="truncate">
                            <div className="text-sm font-medium truncate">{it.title}</div>
                            <div className="text-xs text-gray-500 truncate">{it.artist}</div>
                          </div>

                          {unlockedPl ? (
                            <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                              <span>✅ Unlocked</span>
                              <AccessTimer timeLeftMs={pAccess.expiry - Date.now()} />
                              {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full" />}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              <span>Locked</span>
                              {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-red-700 border-t-transparent rounded-full" />}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {(p.items || []).length === 0 && <div className="text-xs text-gray-500 px-2 pb-2">No items</div>}
                  </div>
                )}
              </div>
            );
          })}
          {playlists.length === 0 && <div className="text-gray-500 text-sm">No playlists yet</div>}
        </div>

        {/* Admin: create */}
        <IfOwnerOnly className="p-3 border-t">
          <form onSubmit={createPlaylist} className="grid grid-cols-[1fr_auto] gap-2">
            <input className="border rounded p-2" placeholder="New playlist name" value={newPlName} onChange={(e) => setNewPlName(e.target.value)} />
            <button className="bg-black text-white px-3 rounded">Add</button>
          </form>
        </IfOwnerOnly>
      </aside>

      {/* Player panel */}
      <div
        ref={panelRef}
        className={`md:col-span-2 border rounded-2xl bg-white p-5 relative ${playlistOverlay ? "blur-sm opacity-80 pointer-events-none" : ""}`}
      >
        {grantToast && (
          <div className="absolute top-3 right-3 z-20 bg-green-600 text-white text-sm px-3 py-2 rounded-lg shadow">
            {grantToast}
          </div>
        )}

        {track ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold truncate flex items-center gap-2">
                  {track.title}
                  {isPlaying && <span className="text-[#1DB954] text-xs">●</span>}
                </div>
                <div className="text-sm text-gray-500 truncate">{track.artist}</div>
              </div>
              {(() => {
                const unlockedPl = !!(plAccess?.expiry && plAccess.expiry > Date.now());
                return (
                  <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${unlockedPl ? "bg-green-100 text-green-700 animate-pulse" : "bg-red-100 text-red-700"}`}>
                    {unlockedPl ? (
                      <>✅ Unlocked <AccessTimer timeLeftMs={plAccess.expiry - Date.now()} /></>
                    ) : (
                      `Locked (${Math.max(0, PREVIEW_SECONDS - Math.floor(previewUsed / 1000))}s preview)`
                    )}
                    {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />}
                  </div>
                );
              })()}
            </div>

            <div className="rounded-2xl p-4 bg-[#121212] text-white shadow-lg">
              <audio
                ref={audioRef}
                preload="metadata"
                controls={false}
                controlsList="nodownload noplaybackrate"
                crossOrigin="anonymous"
                className="sr-only"
                playsInline
                onContextMenu={(e) => e.preventDefault()}
              />

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-md bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shrink-0">
                  <span className="text-xs uppercase tracking-wider opacity-80">
                    {track?.title?.slice(0, 3) || "Pod"}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/20" onClick={() => skip(-15)} aria-label="Back 15 seconds">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v2a5 5 0 1 0 5 5h2A7 7 0 1 1 12 5Z" fill="currentColor" />
                        <path d="M11 8v8l-5-4 5-4Z" fill="currentColor" />
                      </svg>
                    </button>

                    <button
                      className={`p-3 rounded-full shadow ${isPlaying ? "bg-white/90 text-black ring-2 ring-[#1DB954] animate-pulse" : "bg-[#1DB954] text-black hover:brightness-95"}`}
                      onClick={togglePlay}
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
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

                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/20" onClick={() => skip(15)} aria-label="Forward 15 seconds">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v2a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z" fill="currentColor" />
                        <path d="M13 8v8l5-4-5-4Z" fill="currentColor" />
                      </svg>
                    </button>

                    {/* Volume */}
                    <div className="ml-2 hidden sm:flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 10v4h3l4 3V7L8 10H5z" />
                      </svg>
                      {isiOS ? (
                        <span className="text-[11px] text-white/60">Use phone volume buttons</span>
                      ) : (
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={vol}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="w-28 accent-[#1DB954]"
                          aria-label="Volume"
                        />
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-3 select-none">
                    <span className="text-xs tabular-nums text-white/70 w-10 text-right">{mmss(cur)}</span>

                    <div ref={barRef} className="relative h-2 rounded-full bg-white/15 flex-1 cursor-pointer" onClick={onBarClick}>
                      <div className="absolute inset-y-0 left-0 rounded-full bg-[#1DB954]" style={{ width: `${(dur ? cur / dur : 0) * 100}%` }} />
                      <div
                        className="absolute -top-1.5 h-5 w-5 rounded-full bg-white shadow -translate-x-1/2"
                        style={{ left: `${(dur ? cur / dur : 0) * 100}%` }}
                        onMouseDown={startDrag}
                        onTouchStart={startDrag}
                        role="slider"
                        aria-valuemin={0}
                        aria-valuemax={dur || 0}
                        aria-valuenow={cur || 0}
                        tabIndex={0}
                      />
                    </div>

                    <span className="text-xs tabular-nums text-white/70 w-10">{mmss(dur)}</span>
                  </div>

                  {!unlocked && <div className="text-[11px] text-white/60 mt-2">Preview stops at {PREVIEW_SECONDS}s. Subscribe to continue.</div>}
                </div>
              </div>
            </div>

            {/* Admin controls (for current track) */}
            <IfOwnerOnly>
              <div className="mt-3 flex gap-2">
                <button className="text-xs px-3 py-1 rounded border" onClick={() => toggleLock(track.id, !track.locked)}>
                  {track.locked ? "Unlock" : "Lock"}
                </button>
                <button className="text-xs px-3 py-1 rounded border text-red-600" onClick={() => delItem(track.id)}>
                  Delete
                </button>
              </div>
            </IfOwnerOnly>
          </>
        ) : (
          <div className="text-gray-500">Select a playlist item</div>
        )}
      </div>

      {/* Overlay OUTSIDE the blur */}
      {playlistOverlay && (
        <QROverlay
          open
          onClose={() => { setPlaylistOverlay(null); gateRef.current.overlayShown = false; }}
          title={playlistOverlay.name}
          subjectLabel="Podcast"
          inline
          focusRef={panelRef}
          feature="podcast"
          featureId={playlistOverlay.id}
        />
      )}
    </section>
  );
}
