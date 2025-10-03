// src/components/podcasts/Podcast.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, getJSON, authHeaders, absUrl } from "../../utils/api";
import IfOwnerOnly from "../common/IfOwnerOnly";
import QROverlay from "../common/QROverlay";
import AccessTimer from "../common/AccessTimer";
import useAccessSync from "../../hooks/useAccessSync";
import useSubmissionStream from "../../hooks/useSubmissionStream";
import { loadAccess } from "../../utils/access";

export default function Podcast() {
  /* ------- data ------- */
  const [playlists, setPlaylists] = useState([]);
  const [pid, setPid] = useState(null);
  const [track, setTrack] = useState(null);

  /* ------- access ------- */
  const [accessMap, setAccessMap] = useState({});
  const [accessLoading, setAccessLoading] = useState(false);
  const [grantToast, setGrantToast] = useState(null);
  const [email] = useState(() => localStorage.getItem("userEmail") || "");

  useSubmissionStream(email);

  const audioRef = useRef(null);
  const barRef = useRef(null);
  const panelRef = useRef(null);

  /* preview/QR gating for current track */
  const gateRef = useRef({
    lastTrackId: null,
    consumed: false,     // preview already used
    gateArmed: false,    // block any further play/seek while locked
    overlayShown: false, // avoid duplicate overlays
  });

  const shouldAutoPlayNextRef = useRef(false);

  /* ------- load ------- */
  const getAccessForPlaylist = async (pl) => {
    const cands = [];
    cands.push(await loadAccess("podcast", pl.id, email));
    if (pl.name) cands.push(await loadAccess("podcast", pl.name, email));
    if (pl.slug) cands.push(await loadAccess("podcast", pl.slug, email));
    const ok = cands.filter((x) => x?.expiry && x.expiry > Date.now());
    if (!ok.length) return null;
    return ok.reduce((a, b) => (a.expiry > b.expiry ? a : b));
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

  useEffect(() => { loadAll(); }, []); // init

  /* when playlist changes, pick first item */
  useEffect(() => {
    if (!pid) return;
    const pl = playlists.find((p) => p.id === pid);
    if (pl?.items?.[0]) setTrack(pl.items[0]);
  }, [pid, playlists]);

  /* resolve access for current playlist */
  const hasAccess = useMemo(() => {
    const a = accessMap[pid];
    return !!(a?.expiry && a.expiry > Date.now());
  }, [accessMap, pid]);

  /* refresh access when any recorded expiry passes */
  useEffect(() => {
    const now = Date.now();
    const soonest = Object.values(accessMap)
      .map((a) => a?.expiry)
      .filter((x) => x && x > now)
      .sort((a, b) => a - b)[0];
    if (!soonest) return;
    const t = setTimeout(() => loadAll(), Math.max(0, soonest - now + 500));
    return () => clearTimeout(t);
  }, [accessMap]);

  /* react to external access sync events (grants/revokes) */
  useAccessSync(async (detail) => {
    if (!detail || detail.email !== email || detail.feature !== "podcast") return;

    const featureId = String(detail.featureId);
    const pls = playlists;
    const normalized =
      pls.find((p) => String(p.id) === featureId)?.id ??
      pls.find((p) => String(p.name || "").toLowerCase() === featureId.toLowerCase())?.id ??
      pls.find((p) => String(p.slug || "").toLowerCase() === featureId.toLowerCase())?.id ??
      featureId;

    if (detail.expiry && detail.expiry > Date.now()) {
      // grant
      setAccessMap((prev) => ({ ...prev, [normalized]: { expiry: detail.expiry } }));
      setPlaylistOverlay(null);
      // small toast
      const name = localStorage.getItem("userName") || email?.split("@")[0] || "User";
      setGrantToast(detail.message || `🎉 Congratulations ${name}! Your access has been unlocked.`);
      setTimeout(() => setGrantToast(null), 4500);
      // resume if this is the active playlist
      if (pid && String(pid) === String(normalized)) {
        try { await audioRef.current?.play?.(); } catch {}
      }
      return;
    }

    if (detail.revoked) {
      setAccessMap((prev) => ({ ...prev, [normalized]: null }));
      const pl = playlists.find((x) => String(x.id) === String(normalized));
      if (pl) setPlaylistOverlay(pl);
      return;
    }

    // soft refresh (unknown state)
    const fresh = await loadAccess("podcast", normalized, email);
    setAccessMap((prev) => ({ ...prev, [normalized]: fresh }));
  });

  /* ------- audio state ------- */
  const isiOS = useMemo(() => /iPad|iPhone|iPod/i.test(navigator.userAgent), []);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(() => {
    const saved = Number(localStorage.getItem("pod_vol"));
    return Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 1;
  });
  const [seeking, setSeeking] = useState(false);

  const mmss = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  /* build proxied source (bypass CORS) */
  const proxiedSrc = track?.url
    ? `${API_BASE}/podcasts/stream?src=${encodeURIComponent(absUrl(track.url))}`
    : "";

  /* reset gate when track or playlist changes */
  useEffect(() => {
    const id = track?.id || null;
    if (gateRef.current.lastTrackId !== id) {
      gateRef.current = { lastTrackId: id, consumed: false, gateArmed: false, overlayShown: false };
    }
  }, [track?.id, pid]);

  const openOverlayForCurrent = () => {
    if (gateRef.current.overlayShown) return;
    const currentPl = playlists.find((x) => x.id === pid);
    if (currentPl) setPlaylistOverlay(currentPl);
    gateRef.current.overlayShown = true;
  };

  /* attach audio element and robust autoplay */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    // reset + point to new src
    el.pause();
    el.src = proxiedSrc || "";
    el.load();
    setCur(0);
    setDur(0);
    setIsPlaying(false);
    gateRef.current.overlayShown = false;

    // apply saved volume (not effective on iOS)
    if (!isiOS) el.volume = vol;

    const tryAutoPlay = async () => {
      if (!shouldAutoPlayNextRef.current) return;
      if (!hasAccess && gateRef.current.gateArmed) return; // blocked after preview
      try {
        await el.play();
        shouldAutoPlayNextRef.current = false;
      } catch {
        // user can tap play
      }
    };

    const onLoaded = () => {
      setDur(el.duration || 0);
      if (!isiOS) setVol(el.volume);
    };

    const onCanPlay = () => {
      // most reliable moment to autoplay
      tryAutoPlay();
    };

    const onTime = () => {
      if (!seeking) setCur(el.currentTime || 0);

      if (!hasAccess) {
        if (!gateRef.current.gateArmed && el.currentTime >= 10) {
          // stop preview at 10s, arm gate, open QR
          el.pause();
          setIsPlaying(false);
          gateRef.current.gateArmed = true;
          gateRef.current.consumed = true;
          openOverlayForCurrent();
        }
      }
    };

    const onPlay = () => {
      if (!hasAccess && gateRef.current.gateArmed) {
        el.pause();
        setIsPlaying(false);
        openOverlayForCurrent();
        return;
      }
      setIsPlaying(true);
    };

    const onPause = () => setIsPlaying(false);

    const onVol = () => {
      // keep local state in sync if user uses native controls (desktop/Android)
      if (!isiOS) {
        const v = el.volume;
        setVol(v);
        localStorage.setItem("pod_vol", String(v));
      }
    };

    const onEnded = () => setIsPlaying(false);

    const onSeeking = () => {
      if (!hasAccess) {
        if (gateRef.current.gateArmed || el.currentTime > 10) {
          el.currentTime = Math.min(10, el.currentTime || 0);
          el.pause();
          setIsPlaying(false);
          openOverlayForCurrent();
        }
      }
    };

    const onError = () => setIsPlaying(false);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("volumechange", onVol);
    el.addEventListener("ended", onEnded);
    el.addEventListener("seeking", onSeeking);
    el.addEventListener("error", onError);

    // If canplay already fired (fast caches)
    if (el.readyState >= 3) onCanPlay();
    else if (el.readyState >= 1) onLoaded();

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("volumechange", onVol);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("seeking", onSeeking);
      el.removeEventListener("error", onError);
    };
  }, [proxiedSrc, hasAccess, seeking, vol, isiOS]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      return;
    }
    if (!hasAccess && gateRef.current.gateArmed) {
      openOverlayForCurrent();
      return;
    }
    try { await el.play(); } catch {}
  };

  const seekToPct = (pct) => {
    const el = audioRef.current;
    if (!el || !isFinite(dur)) return;
    let t = Math.max(0, Math.min(1, pct)) * dur;
    if (!hasAccess && (gateRef.current.gateArmed || t > 10)) {
      t = Math.min(t, 10);
      openOverlayForCurrent();
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
      if (!hasAccess && (gateRef.current.gateArmed || t > 10)) t = Math.min(t, 10);
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
    if (!hasAccess && (gateRef.current.gateArmed || next > 10)) {
      next = Math.min(next, 10);
      openOverlayForCurrent();
    }
    el.currentTime = next;
  };

  const setVolume = (v) => {
    const el = audioRef.current;
    const clamped = Math.max(0, Math.min(1, v));
    if (!isiOS && el) {
      el.volume = clamped;
      localStorage.setItem("pod_vol", String(clamped));
    }
    setVol(clamped);
  };

  /* autoplay scheduler: when user clicks a track, set a flag and also try a few times */
  const scheduleAutoPlay = (clickedItem) => {
    shouldAutoPlayNextRef.current = true;
    // small retry loop so we don't miss the ready state
    let tries = 20;
    const targetSrc = `${API_BASE}/podcasts/stream?src=${encodeURIComponent(absUrl(clickedItem.url))}`;
    const tick = async () => {
      const el = audioRef.current;
      if (!el) return;
      const srcReady =
        el.src.includes(encodeURIComponent(absUrl(clickedItem.url))) ||
        el.src === targetSrc;
      if (srcReady && el.readyState >= 3) {
        try {
          await el.play();
          shouldAutoPlayNextRef.current = false;
          return;
        } catch {}
      }
      if (tries-- > 0) setTimeout(tick, 80);
    };
    setTimeout(tick, 60);
  };

  /* ------- overlay ------- */
  const [playlistOverlay, setPlaylistOverlay] = useState(null);

  /* ------- admin helpers ------- */
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
    await loadAll();
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
    await loadAll();
  };

  const delItem = async (iid) => {
    await fetch(`${API_BASE}/podcasts/playlists/${pid}/items/${iid}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await loadAll();
  };

  const toggleLock = async (iid, locked) => {
    await fetch(`${API_BASE}/podcasts/playlists/${pid}/items/${iid}/lock`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ locked }),
    });
    await loadAll();
  };

  /* ------- render ------- */
  return (
    <section className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* left: playlists */}
      <aside className="md:col-span-1 border rounded-2xl bg-white">
        <div className="p-3 border-b font-semibold">Podcasts</div>
        <div className="p-3 space-y-3 max-h-[60vh] overflow-auto">
          {playlists.map((p) => {
            const a = accessMap[p.id];
            const unlocked = a?.expiry && a.expiry > Date.now();
            return (
              <div key={p.id} className={`border rounded-xl ${pid === p.id ? "ring-2 ring-blue-500" : ""}`}>
                <div className="flex items-center justify-between px-3 py-2">
                  <button className="text-left font-medium flex-1" onClick={() => setPid(p.id)}>
                    {p.name}
                  </button>
                  {unlocked ? (
                    <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                      <span>✅ Unlocked</span>
                      <AccessTimer timeLeftMs={a.expiry - Date.now()} />
                      {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full" />}
                    </div>
                  ) : (
                    <button className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-1 rounded" onClick={() => setPlaylistOverlay(p)}>
                      <span>Preview / Unlock</span>
                      {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-white/80 border-t-transparent rounded-full" />}
                    </button>
                  )}
                </div>

                {pid === p.id && (
                  <div className="px-2 pb-2 space-y-1">
                    {(p.items || []).map((it) => {
                      const isActive = track?.id === it.id;
                      const unlockedItem = a?.expiry && a.expiry > Date.now();
                      return (
                        <div
                          key={it.id}
                          className={`px-2 py-2 rounded cursor-pointer hover:bg-gray-50 flex items-center justify-between ${isActive ? "bg-gray-50" : ""}`}
                          onClick={() => {
                            setTrack(it);
                            scheduleAutoPlay(it); // <- autoplay reliably
                          }}
                        >
                          <div className="truncate">
                            <div className="text-sm font-medium truncate">{it.title}</div>
                            <div className="text-xs text-gray-500 truncate">{it.artist}</div>
                          </div>
                          {unlockedItem ? (
                            <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                              <span>✅ Unlocked</span>
                              <AccessTimer timeLeftMs={a.expiry - Date.now()} />
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

        {/* admin: create */}
        <IfOwnerOnly className="p-3 border-t">
          <form onSubmit={createPlaylist} className="grid grid-cols-[1fr_auto] gap-2">
            <input className="border rounded p-2" placeholder="New playlist name" value={newPlName} onChange={(e) => setNewPlName(e.target.value)} />
            <button className="bg-black text-white px-3 rounded">Add</button>
          </form>
        </IfOwnerOnly>
      </aside>

      {/* right: player */}
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
                <div className="text-lg font-semibold truncate">{track.title}</div>
                <div className="text-sm text-gray-500 truncate">{track.artist}</div>
              </div>
              {(() => {
                const a = accessMap[pid];
                const unlocked = a?.expiry && a.expiry > Date.now();
                return (
                  <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${unlocked ? "bg-green-100 text-green-700 animate-pulse" : "bg-red-100 text-red-700"}`}>
                    {unlocked ? (
                      <>
                        ✅ Unlocked <AccessTimer timeLeftMs={a.expiry - Date.now()} />
                      </>
                    ) : (
                      "Locked (10s preview)"
                    )}
                    {accessLoading && <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />}
                  </div>
                );
              })()}
            </div>

            {/* player */}
            <div className="rounded-2xl p-4 bg-[#121212] text-white shadow-lg">
              <audio
                ref={audioRef}
                preload="metadata"
                controls={false}
                controlsList="nodownload noplaybackrate"
                playsInline
                onContextMenu={(e) => e.preventDefault()}
                className="sr-only"
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
                      className={`p-3 rounded-full ${isPlaying ? "bg-white/90 text-black" : "bg-[#1DB954] text-black"} hover:brightness-95 shadow`}
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

                    {/* Volume: iOS shows hint; Android/desktop show slider (persisted) */}
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

                  {!hasAccess && <div className="text-[11px] text-white/60 mt-2">Preview stops at 10s. Subscribe to continue.</div>}
                </div>
              </div>
            </div>

            {/* admin buttons for the current item */}
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

      {/* QR overlay OUTSIDE the blurred panel */}
      {playlistOverlay && (
        <QROverlay
          open
          onClose={() => setPlaylistOverlay(null)}
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
