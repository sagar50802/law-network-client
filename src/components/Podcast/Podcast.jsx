// src/components/podcasts/Podcast.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { API_BASE, getJSON, authHeaders, absUrl } from "../../utils/api";
import IfOwnerOnly from "../common/IfOwnerOnly";
import usePreviewLock from "../../hooks/usePreviewLock";
import QROverlay from "../common/QROverlay";
import { loadAccess } from "../../utils/access";
import AccessTimer from "../common/AccessTimer";
import useAccessSync from "../../hooks/useAccessSync";
import useSubmissionStream from "../../hooks/useSubmissionStream";

/**
 * NOTES:
 * - We stream audio through:   ${API_BASE}/podcasts/stream?src=<encoded original url>
 *   This bypasses R2 CORS entirely and supports Range.
 * - 10s preview rules:
 *   • First play on a locked playlist is allowed up to 10.00s (inclusive guard).
 *   • When currentTime >= 10, we pause, show QR, arm a "gate" that blocks future plays/seeks.
 *   • Closing QR while still locked keeps the gate armed; any play/seek re-opens QR immediately.
 *   • Switch track/playlist => gate resets so user can preview the new item.
 */

export default function Podcast() {
  const [playlists, setPlaylists] = useState([]);
  const [pid, setPid] = useState(null);
  const [track, setTrack] = useState(null);

  // Access + UI
  const [accessMap, setAccessMap] = useState({});
  const [accessLoading, setAccessLoading] = useState(false);
  const [grantToast, setGrantToast] = useState(null);

  const panelRef = useRef(null);
  const audioRef = useRef(null);
  const [playlistOverlay, setPlaylistOverlay] = useState(null);

  const [email] = useState(() => localStorage.getItem("userEmail") || "");

  // live events
  useSubmissionStream(email);

  const pendingEventsRef = useRef([]);

  /* ---------------- helpers ---------------- */
  const resolvePlaylistId = (featureId) => {
    if (!featureId) return null;
    const fid = String(featureId).trim().toLowerCase();
    const byId = playlists.find((pl) => String(pl.id).toLowerCase() === fid);
    if (byId) return byId.id;
    const byName = playlists.find(
      (pl) => String(pl.name || pl.title || "").toLowerCase() === fid
    );
    if (byName) return byName.id;
    const bySlug = playlists.find((pl) => String(pl.slug || "").toLowerCase() === fid);
    if (bySlug) return bySlug.id;
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
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => (a.expiry > b.expiry ? a : b));
  };

  const applyGrant = async ({ featureId, expiry, message }) => {
    const normalizedId = resolvePlaylistId(featureId);
    if (!normalizedId) {
      pendingEventsRef.current.push({ type: "grant", featureId, expiry, message });
      return;
    }

    persistLocalAccess(normalizedId, expiry);
    setAccessMap((prev) => ({ ...prev, [normalizedId]: { expiry, source: "event" } }));
    setPlaylistOverlay(null);

    const savedName = localStorage.getItem("userName");
    const fallbackName = email ? email.split("@")[0] : "User";
    const name = savedName || fallbackName || "User";
    setGrantToast(message || `🎉 Congratulations ${name}! Your access has been unlocked.`);
    setTimeout(() => setGrantToast(null), 4500);

    if (pid && String(pid) === String(normalizedId)) {
      try {
        await audioRef.current?.play?.();
      } catch {}
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
  };

  /* ---------------- data load ---------------- */
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playlists.length || pendingEventsRef.current.length === 0) return;
    const queue = pendingEventsRef.current.splice(0, pendingEventsRef.current.length);
    for (const ev of queue) {
      if (ev.type === "grant") applyGrant(ev);
      if (ev.type === "revoke") applyRevoke(ev);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlists.length]);

  useEffect(() => {
    if (!pid) return;
    const pl = playlists.find((p) => p.id === pid);
    if (pl && pl.items?.[0]) setTrack(pl.items[0]);
  }, [pid, playlists]);

  const refreshAllAccess = async () => {
    if (playlists.length === 0) return;
    setAccessLoading(true);
    const next = {};
    for (const pl of playlists) next[pl.id] = await getAccessForPlaylist(pl);
    setAccessMap(next);
    setAccessLoading(false);
  };

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
    } else {
      setPlaylistOverlay(null);
    }
  });

  useEffect(() => {
    const onFocus = () => refreshAllAccess();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlists, email]);

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

  // 10s preview lock
  const lock = usePreviewLock({
    type: "podcast",
    id: track?.id || "none",
    previewSeconds: 10,
  });

  /** --------- PREVIEW GATE (the important part) ---------- */
  const previewRef = useRef({
    lastTrackId: null,
    consumed: false,        // 10s already used for this track
    gateArmed: false,       // block any future play/seek while locked
    overlayShown: false,    // ensure single open per run
  });
  const shouldAutoPlayNextRef = useRef(false);

  const hasAccess = useMemo(() => {
    const a = accessMap[pid];
    return !!(a?.expiry && a.expiry > Date.now());
  }, [accessMap, pid]);

  // Reset preview gate whenever track or playlist changes
  useEffect(() => {
    const tId = track?.id || null;
    if (previewRef.current.lastTrackId !== tId || !tId) {
      previewRef.current = {
        lastTrackId: tId,
        consumed: false,
        gateArmed: false,
        overlayShown: false,
      };
    }
  }, [track?.id, pid]);

  // Build proxied src
  const audioSrc = track?.url
    ? `${API_BASE}/podcasts/stream?src=${encodeURIComponent(absUrl(track.url))}`
    : "";

  // Keep premium player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);
  const [seeking, setSeeking] = useState(false);
  const barRef = useRef(null);

  // Wire audio element (and the 10s gate)
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    // Always point to the latest src and reset
    el.pause();
    el.src = audioSrc || "";
    el.load();
    setCur(0);
    setDur(0);
    setIsPlaying(false);
    previewRef.current.overlayShown = false;

    const onLoaded = () => {
      setDur(el.duration || 0);
      setVol(el.volume);
      // Autoplay if user clicked an item
      if (!hasAccess) {
        // Locked: allow first preview run (not armed yet)
        if (shouldAutoPlayNextRef.current) {
          shouldAutoPlayNextRef.current = false;
          safePlay(el);
        }
      } else {
        if (shouldAutoPlayNextRef.current) {
          shouldAutoPlayNextRef.current = false;
          safePlay(el);
        }
      }
    };

    const onTime = () => {
      if (!seeking) setCur(el.currentTime || 0);

      if (!hasAccess) {
        // Allow first run until 10.00s, then block
        if (!previewRef.current.gateArmed && el.currentTime >= 10) {
          el.pause();
          previewRef.current.gateArmed = true;
          previewRef.current.consumed = true;
          setIsPlaying(false);
          openOverlayForCurrent();
        }
      }
    };

    const onPlay = () => {
      // If locked and gate is armed (preview already consumed), block immediately
      if (!hasAccess && previewRef.current.gateArmed) {
        el.pause();
        setIsPlaying(false);
        openOverlayForCurrent();
        return;
      }
      setIsPlaying(true);
    };

    const onPause = () => setIsPlaying(false);
    const onVol = () => setVol(el.volume);
    const onEnded = () => setIsPlaying(false);

    const onSeeking = () => {
      if (!hasAccess) {
        if (previewRef.current.gateArmed || el.currentTime > 10) {
          // Keep user within preview
          el.currentTime = Math.min(10, el.currentTime || 0);
          el.pause();
          setIsPlaying(false);
          openOverlayForCurrent();
        }
      }
    };

    const onError = () => {
      setIsPlaying(false);
    };

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("volumechange", onVol);
    el.addEventListener("ended", onEnded);
    el.addEventListener("seeking", onSeeking);
    el.addEventListener("error", onError);

    // If metadata is already there
    if (el.readyState >= 1) onLoaded();

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("volumechange", onVol);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("seeking", onSeeking);
      el.removeEventListener("error", onError);
    };
  }, [audioSrc, hasAccess, seeking]);

  const openOverlayForCurrent = () => {
    if (previewRef.current.overlayShown) return;
    const currentPl = playlists.find((x) => x.id === pid);
    setPlaylistOverlay(currentPl || null);
    previewRef.current.overlayShown = true;
  };

  const safePlay = async (el) => {
    try {
      await el.play();
    } catch {
      // Autoplay might be blocked by the browser; user can tap Play
    }
  };

  // human time
  const mmss = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      // First play on a locked preview is allowed if not armed yet
      if (!hasAccess && previewRef.current.gateArmed) {
        openOverlayForCurrent();
        return;
      }
      await safePlay(el);
    }
  };

  const seekToPct = (pct) => {
    const el = audioRef.current;
    if (!el || !isFinite(dur)) return;
    let t = Math.max(0, Math.min(1, pct)) * dur;

    if (!hasAccess) {
      // If preview consumed or beyond 10s, block and open QR
      if (previewRef.current.gateArmed || t > 10) {
        openOverlayForCurrent();
        t = Math.min(t, 10);
      }
    }
    el.currentTime = t;
    setCur(t);
  };

  const onBarClick = (e) => {
    const rect = barRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seekToPct(pct);
  };

  const startDrag = (e) => {
    e.preventDefault();
    setSeeking(true);
    const move = (ev) => {
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const rect = barRef.current.getBoundingClientRect();
      const pct = (clientX - rect.left) / rect.width;
      let t = Math.max(0, Math.min(1, pct)) * (dur || 0);
      if (!hasAccess && (previewRef.current.gateArmed || t > 10)) {
        t = Math.min(t, 10);
      }
      setCur(t);
    };
    const up = (ev) => {
      const clientX = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
      const rect = barRef.current.getBoundingClientRect();
      const pct = (clientX - rect.left) / rect.width;
      seekToPct(pct);
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
    let next = Math.max(0, Math.min((el.currentTime || 0) + sec, dur || el.duration || 0));
    if (!hasAccess) {
      if (previewRef.current.gateArmed || next > 10) {
        openOverlayForCurrent();
        next = Math.min(next, 10);
      }
    }
    el.currentTime = next;
  };

  const setVolume = (v) => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, v));
    setVol(el.volume);
  };

  const pl = playlists.find((p) => p.id === pid);

  /* ---------------- Admin actions ---------------- */
  const [newPlName, setNewPlName] = useState("");
  const [form, setForm] = useState({
    title: "",
    artist: "",
    audio: null,
    locked: true,
  });

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

  /* ---------------- render ---------------- */
  return (
    <section
      id="podcast"
      className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      {/* Sidebar */}
      <aside className="md:col-span-1 border rounded-2xl bg-white">
        <div className="p-3 border-b font-semibold">Podcasts</div>
        <div className="p-3 space-y-3 max-h-[60vh] overflow-auto">
          {playlists.map((p) => {
            const plAccess = accessMap[p.id];
            return (
              <div
                key={p.id}
                className={`border rounded-xl ${pid === p.id ? "ring-2 ring-blue-500" : ""}`}
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <button
                    onClick={() => {
                      setPid(p.id);
                      // reset preview state is handled by effect; also auto select first item in effect above
                    }}
                    className="text-left font-medium flex-1"
                  >
                    {p.name}
                  </button>

                  {plAccess?.expiry && plAccess.expiry > Date.now() ? (
                    <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                      <span>✅ Unlocked</span>
                      <AccessTimer timeLeftMs={plAccess.expiry - Date.now()} />
                      {accessLoading && (
                        <span className="animate-spin inline-block w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full"></span>
                      )}
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-1 rounded"
                      onClick={() => setPlaylistOverlay(p)}
                    >
                      <span>Preview / Unlock</span>
                      {accessLoading && (
                        <span className="animate-spin inline-block w-3 h-3 border-2 border-white/80 border-t-transparent rounded-full"></span>
                      )}
                    </button>
                  )}
                </div>

                {pid === p.id && (
                  <div className="px-2 pb-2 space-y-1">
                    {(p.items || []).map((it) => {
                      const effectiveAccess =
                        plAccess?.expiry && plAccess.expiry > Date.now() ? plAccess : null;
                      const isActive = track?.id === it.id;
                      return (
                        <div
                          key={it.id}
                          className={`px-2 py-2 rounded cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                            isActive ? "bg-gray-50" : ""
                          }`}
                          onClick={() => {
                            setTrack(it);
                            // request autoplay once metadata is ready
                            shouldAutoPlayNextRef.current = true;
                          }}
                        >
                          <div className="truncate">
                            <div className="text-sm font-medium truncate">{it.title}</div>
                            <div className="text-xs text-gray-500 truncate">{it.artist}</div>
                          </div>

                          {effectiveAccess ? (
                            <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                              <span>✅ Unlocked</span>
                              <AccessTimer timeLeftMs={effectiveAccess.expiry - Date.now()} />
                              {accessLoading && (
                                <span className="animate-spin inline-block w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full"></span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              <span>Locked</span>
                              {accessLoading && (
                                <span className="animate-spin inline-block w-3 h-3 border-2 border-red-700 border-t-transparent rounded-full"></span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {(p.items || []).length === 0 && (
                      <div className="text-xs text-gray-500 px-2 pb-2">No items</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {playlists.length === 0 && (
            <div className="text-gray-500 text-sm">No playlists yet</div>
          )}
        </div>

        {/* Admin: create playlist */}
        <IfOwnerOnly className="p-3 border-t">
          <form onSubmit={createPlaylist} className="grid grid-cols-[1fr_auto] gap-2">
            <input
              className="border rounded p-2"
              placeholder="New playlist name"
              value={newPlName}
              onChange={(e) => setNewPlName(e.target.value)}
            />
            <button className="bg-black text-white px-3 rounded">Add</button>
          </form>
        </IfOwnerOnly>
      </aside>

      {/* Main player (blurs while overlay is open) */}
      <div
        ref={panelRef}
        className={`md:col-span-2 border rounded-2xl bg-white p-5 relative ${
          playlistOverlay ? "blur-sm opacity-80 pointer-events-none" : ""
        }`}
      >
        {/* 🎉 Congrats toast */}
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
              {(() => {
                const plAccess = accessMap[pid];
                return (
                  <div
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      plAccess?.expiry && plAccess.expiry > Date.now()
                        ? "bg-green-100 text-green-700 animate-pulse"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {plAccess?.expiry && plAccess.expiry > Date.now() ? (
                      <>
                        ✅ Unlocked{" "}
                        <AccessTimer timeLeftMs={plAccess.expiry - Date.now()} />
                      </>
                    ) : (
                      `Locked (10s preview)`
                    )}
                    {accessLoading && (
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full"></span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Premium dark player */}
            <div className="rounded-2xl p-4 bg-[#121212] text-white shadow-lg">
              {/* Hidden native audio element used by the custom controls */}
              <audio
                ref={audioRef}
                preload="metadata"
                controls={false}
                controlsList="nodownload noplaybackrate"
                className="sr-only"
                onContextMenu={(e) => e.preventDefault()}
              />

              <div className="flex items-center gap-4">
                {/* Cover/placeholder */}
                <div className="w-16 h-16 rounded-md bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                  <span className="text-xs uppercase tracking-wider opacity-80">
                    {track?.title?.slice(0, 3) || "Pod"}
                  </span>
                </div>

                {/* Controls + progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                      onClick={() => skip(-15)}
                      aria-label="Back 15 seconds"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v2a5 5 0 1 0 5 5h2A7 7 0 1 1 12 5Z" fill="currentColor" />
                        <path d="M11 8v8l-5-4 5-4Z" fill="currentColor" />
                      </svg>
                    </button>

                    <button
                      className={`p-3 rounded-full ${
                        isPlaying ? "bg-white/90 text-black" : "bg-[#1DB954] text-black"
                      } hover:brightness-95 shadow`}
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

                    <button
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                      onClick={() => skip(15)}
                      aria-label="Forward 15 seconds"
                    >
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
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={vol}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-28 accent-[#1DB954]"
                      />
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-3 select-none">
                    <span className="text-xs tabular-nums text-white/70 w-10 text-right">
                      {mmss(cur)}
                    </span>

                    <div
                      ref={barRef}
                      className="relative h-2 rounded-full bg-white/15 flex-1 cursor-pointer"
                      onClick={onBarClick}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-[#1DB954]"
                        style={{ width: `${(dur ? cur / dur : 0) * 100}%` }}
                      />
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

                    <span className="text-xs tabular-nums text-white/70 w-10">
                      {mmss(dur)}
                    </span>
                  </div>

                  {!hasAccess && (
                    <div className="text-[11px] text-white/60 mt-2">
                      Preview stops at 10s. Subscribe to continue.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin controls (for current track) */}
            <IfOwnerOnly>
              <div className="mt-3 flex gap-2">
                <button
                  className="text-xs px-3 py-1 rounded border"
                  onClick={() => toggleLock(track.id, !track.locked)}
                >
                  {track.locked ? "Unlock" : "Lock"}
                </button>
                <button
                  className="text-xs px-3 py-1 rounded border text-red-600"
                  onClick={() => delItem(track.id)}
                >
                  Delete
                </button>
              </div>
            </IfOwnerOnly>
          </>
        ) : (
          <div className="text-gray-500">Select a playlist item</div>
        )}
      </div>

      {/* Keep overlay COMPLETELY OUTSIDE the blurred panel so it stays crisp */}
      {playlistOverlay && (
        <QROverlay
          open={!!playlistOverlay}
          onClose={() => {
            // If still locked, keep the gate armed and re-open next attempt
            setPlaylistOverlay(null);
          }}
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
