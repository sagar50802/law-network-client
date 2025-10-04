// src/components/podcasts/Podcast.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, getJSON, authHeaders, absUrl } from "../../utils/api";
import IfOwnerOnly from "../common/IfOwnerOnly";
import QROverlay from "../common/QROverlay";
import { loadAccess } from "../../utils/access";
import AccessTimer from "../common/AccessTimer";
import useAccessSync from "../../hooks/useAccessSync";
import useSubmissionStream from "../../hooks/useSubmissionStream";

const PREVIEW_SECONDS = 10;
const PREVIEW_MS = PREVIEW_SECONDS * 1000;

export default function Podcast() {
  const [playlists, setPlaylists] = useState([]);
  const [pid, setPid] = useState(null);
  const [track, setTrack] = useState(null);

  const [accessMap, setAccessMap] = useState({});
  const [accessLoading, setAccessLoading] = useState(false);
  const [playlistOverlay, setPlaylistOverlay] = useState(null);

  const [email] = useState(() => localStorage.getItem("userEmail") || "");
  useSubmissionStream(email);

  const overlayGuardRef = useRef(false);
  const audioRef = useRef(null);
  const barRef = useRef(null);

  const [previewUsed, setPreviewUsed] = useState(0);
  const previewStartRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(() => {
    const saved = Number(localStorage.getItem("pod_vol"));
    return Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 1;
  });

  const isiOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);

  /* load playlists and access */
  const load = async () => {
    setAccessLoading(true);
    const r = await getJSON("/podcasts");
    const pls = r.playlists || [];
    setPlaylists(pls);
    if (!pid && pls[0]) setPid(pls[0].id);
    const next = {};
    for (const pl of pls) next[pl.id] = await loadAccess("podcast", pl.id, email);
    setAccessMap(next);
    setAccessLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!pid) return;
    const pl = playlists.find((p) => p.id === pid);
    if (pl?.items?.[0]) setTrack(pl.items[0]);
  }, [pid, playlists]);

  const plAccess = accessMap[pid];
  const unlocked = !!(plAccess?.expiry && plAccess.expiry > Date.now());

  /* reset preview on track change */
  useEffect(() => {
    overlayGuardRef.current = false;
    setPreviewUsed(0);
    previewStartRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [track?.id, pid]);

  /* preview enforcement */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const openOverlay = () => {
      if (overlayGuardRef.current) return;
      const currentPl = playlists.find((x) => x.id === pid);
      if (currentPl) setPlaylistOverlay(currentPl);
      overlayGuardRef.current = true;
    };

    const onLoaded = () => {
      setDur(el.duration || 0);
      if (!isiOS) el.volume = vol;
    };

    const onTime = () => {
      setCur(el.currentTime || 0);
      if (!unlocked && el.currentTime >= PREVIEW_SECONDS) {
        el.pause();
        el.currentTime = PREVIEW_SECONDS;
        openOverlay();
      }
    };

    const onPlaying = () => {
      if (previewStartRef.current == null) previewStartRef.current = performance.now();
      setIsPlaying(true);
    };

    const onPause = () => {
      if (previewStartRef.current != null) {
        const delta = performance.now() - previewStartRef.current;
        previewStartRef.current = null;
        setPreviewUsed((u) => Math.min(PREVIEW_MS, u + delta));
      }
      setIsPlaying(false);
    };

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("pause", onPause);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", onPause);
    };
  }, [unlocked, pid, playlists, vol, isiOS]);

  const mmss = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) return el.pause();
    if (!unlocked && (previewUsed >= PREVIEW_MS || (el.currentTime || 0) >= PREVIEW_SECONDS)) {
      const currentPl = playlists.find((x) => x.id === pid);
      if (currentPl) setPlaylistOverlay(currentPl);
      overlayGuardRef.current = true;
      return;
    }
    try { await el.play(); } catch {}
  };

  const onBarClick = (e) => {
    const rect = barRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const total = dur || 0;
    let target = Math.max(0, Math.min(1, pct)) * total;
    if (!unlocked) target = Math.min(target, PREVIEW_SECONDS);
    audioRef.current.currentTime = target;
    setCur(target);
    if (!unlocked && target >= PREVIEW_SECONDS) {
      const currentPl = playlists.find((x) => x.id === pid);
      if (currentPl) setPlaylistOverlay(currentPl);
      overlayGuardRef.current = true;
    }
  };

  const setVolume = (v) => {
    const el = audioRef.current;
    const clamped = Math.max(0, Math.min(1, v));
    setVol(clamped);
    if (el && !isiOS) el.volume = clamped;
    localStorage.setItem("pod_vol", String(clamped));
  };

  const skip = (sec) => {
    const el = audioRef.current;
    if (!el) return;
    let next = Math.max(0, Math.min((el.currentTime || 0) + sec, dur || el.duration || 0));
    if (!unlocked) next = Math.min(next, PREVIEW_SECONDS);
    el.currentTime = next;
    setCur(next);
  };

  const streamUrl = track?.url
    ? `${API_BASE}/podcasts/stream?src=${encodeURIComponent(absUrl(track.url))}`
    : "";

  return (
    <section className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-1 rounded"
                      onClick={() => {
                        setPlaylistOverlay(p);
                        overlayGuardRef.current = true;
                      }}
                    >
                      <span>Preview / Unlock</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Player */}
      <div className="md:col-span-2 border rounded-2xl bg-white p-5 relative">
        {track ? (
          <>
            <div className="text-lg font-semibold mb-3">{track.title}</div>

            {/* Hidden audio element */}
            <audio
              ref={audioRef}
              src={streamUrl}
              preload="metadata"
              controls={false}
              crossOrigin="anonymous"
              className="sr-only"
              playsInline
            />

            {/* Player controls */}
            <div className="bg-[#121212] text-white rounded-xl p-4">
              <div className="flex items-center gap-4 mb-3">
                <button
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                  onClick={() => skip(-15)}
                  aria-label="Back 15 seconds"
                >
                  ⏪
                </button>

                <button
                  className={`p-3 rounded-full ${isPlaying ? "bg-white text-black" : "bg-green-500 text-black"}`}
                  onClick={togglePlay}
                >
                  {isPlaying ? "⏸" : "▶️"}
                </button>

                <button
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                  onClick={() => skip(15)}
                  aria-label="Forward 15 seconds"
                >
                  ⏩
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={vol}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-28 accent-green-500 ml-auto"
                  aria-label="Volume"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs w-10 text-right">{mmss(cur)}</span>
                <div
                  ref={barRef}
                  className="relative h-2 rounded-full bg-white/15 flex-1 cursor-pointer"
                  onClick={onBarClick}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-green-500"
                    style={{ width: `${(dur ? cur / dur : 0) * 100}%` }}
                  />
                </div>
                <span className="text-xs w-10">{mmss(dur)}</span>
              </div>

              {!unlocked && (
                <div className="text-[11px] text-white/60 mt-2">
                  Preview stops at {PREVIEW_SECONDS}s. Subscribe to continue.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-gray-500">Select a playlist item</div>
        )}
      </div>

      {/* QR Overlay */}
      {playlistOverlay && (
        <QROverlay
          open
          onClose={() => {
            setPlaylistOverlay(null);
            overlayGuardRef.current = false;
            setPreviewUsed(0);
          }}
          title={playlistOverlay.name}
          subjectLabel="Podcast"
          inline
          feature="podcast"
          featureId={playlistOverlay.id}
        />
      )}
    </section>
  );
}
