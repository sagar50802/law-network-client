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
  const [previewUsed, setPreviewUsed] = useState(0);
  const previewStartRef = useRef(null);

  /* load playlists */
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

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!pid) return;
    const pl = playlists.find((p) => p.id === pid);
    if (pl?.items?.[0]) setTrack(pl.items[0]);
  }, [pid, playlists]);

  /* when track changes reset preview */
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
  const plAccess = accessMap[pid];
  const unlocked = !!(plAccess?.expiry && plAccess.expiry > Date.now());

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const openOverlay = () => {
      if (overlayGuardRef.current) return;
      const currentPl = playlists.find((x) => x.id === pid);
      if (currentPl) setPlaylistOverlay(currentPl);
      overlayGuardRef.current = true;
    };

    const onTime = () => {
      if (!unlocked && el.currentTime >= PREVIEW_SECONDS) {
        el.pause();
        el.currentTime = PREVIEW_SECONDS;
        openOverlay();
      }
    };
    const onPlaying = () => {
      if (previewStartRef.current == null) previewStartRef.current = performance.now();
    };
    const onPause = () => {
      if (previewStartRef.current != null) {
        const delta = performance.now() - previewStartRef.current;
        previewStartRef.current = null;
        setPreviewUsed((u) => Math.min(PREVIEW_MS, u + delta));
      }
    };

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", onPause);
    };
  }, [unlocked, pid, playlists]);

  /* derived */
  const pl = useMemo(() => playlists.find((p) => p.id === pid), [playlists, pid]);

  return (
    <section className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
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

      <div className="md:col-span-2 border rounded-2xl bg-white p-5 relative">
        {track ? (
          <>
            <div className="mb-3 font-semibold">{track.title}</div>
            {/* Plain native audio for debugging */}
            <audio
              ref={audioRef}
              controls
              crossOrigin="anonymous"
              src={track.url ? `${API_BASE}/podcasts/stream?src=${encodeURIComponent(absUrl(track.url))}` : ""}
              style={{ width: "100%" }}
            />
            {!unlocked && (
              <div className="text-xs mt-2">
                Preview limited to {PREVIEW_SECONDS}s. Subscribe to continue.
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-500">Select a playlist item</div>
        )}
      </div>

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
