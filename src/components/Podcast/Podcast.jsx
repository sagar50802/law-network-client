// src/components/podcasts/Podcast.jsx
import { useEffect, useRef, useState } from "react";
import { API_BASE, getJSON, authHeaders, absUrl } from "../../utils/api";
import IfOwnerOnly from "../common/IfOwnerOnly";
import QROverlay from "../common/QROverlay";
import { loadAccess } from "../../utils/access";
import AccessTimer from "../common/AccessTimer";
import useAccessSync from "../../hooks/useAccessSync";
import useSubmissionStream from "../../hooks/useSubmissionStream";

const PREVIEW_SECONDS = 10;

export default function Podcast() {
  const [playlists, setPlaylists] = useState([]);
  const [pid, setPid] = useState(null);
  const [track, setTrack] = useState(null);

  const [accessMap, setAccessMap] = useState({});
  const [playlistOverlay, setPlaylistOverlay] = useState(null);

  const [email] = useState(() => localStorage.getItem("userEmail") || "");
  useSubmissionStream(email);

  const audioRef = useRef(null);
  const overlayGuardRef = useRef(false);

  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  /* load playlists and access */
  const load = async () => {
    const r = await getJSON("/podcasts");
    const pls = r.playlists || [];
    setPlaylists(pls);
    if (!pid && pls[0]) setPid(pls[0].id);
    const acc = {};
    for (const pl of pls) acc[pl.id] = await loadAccess("podcast", pl.id, email);
    setAccessMap(acc);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!pid) return;
    const pl = playlists.find((p) => p.id === pid);
    if (pl?.items?.[0]) setTrack(pl.items[0]);
  }, [pid, playlists]);

  const plAccess = accessMap[pid];
  const unlocked = !!(plAccess?.expiry && plAccess.expiry > Date.now());

  /* reset on track change */
  useEffect(() => {
    overlayGuardRef.current = false;
    setCur(0);
    setDur(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [track?.id, pid]);

  /* refresh access when window refocuses */
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [playlists, email]);

  /* admin unlock events */
  useAccessSync(async (detail) => {
    if (!detail || detail.email !== email || detail.feature !== "podcast") return;
    const featureId = String(detail.featureId);
    if (detail.expiry && detail.expiry > Date.now()) {
      setAccessMap((p) => ({ ...p, [featureId]: { expiry: detail.expiry } }));
      setPlaylistOverlay(null);
      overlayGuardRef.current = false;
      const el = audioRef.current;
      if (el) { try { await el.play(); } catch {} }
      return;
    }
    if (detail.revoked) {
      setAccessMap((p) => ({ ...p, [featureId]: null }));
      const pl = playlists.find((x) => String(x.id) === featureId);
      if (pl) setPlaylistOverlay(pl);
      overlayGuardRef.current = true;
    }
  });

  const mmss = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  /* admin actions */
  const [newPlName, setNewPlName] = useState("");

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
                      ✅ Unlocked <AccessTimer timeLeftMs={pAccess.expiry - Date.now()} />
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-1 rounded"
                      onClick={() => { setPlaylistOverlay(p); overlayGuardRef.current = true; }}
                    >
                      Preview / Unlock
                    </button>
                  )}
                </div>
                {pid === p.id && (
                  <div className="px-2 pb-2 space-y-1">
                    {(p.items || []).map((it) => (
                      <div
                        key={it.id}
                        className={`px-2 py-2 rounded cursor-pointer hover:bg-gray-50 flex items-center justify-between ${track?.id === it.id ? "bg-gray-50" : ""}`}
                        onClick={() => setTrack(it)}
                      >
                        <div className="truncate">
                          <div className="text-sm font-medium truncate">{it.title}</div>
                          <div className="text-xs text-gray-500 truncate">{it.artist}</div>
                        </div>
                        {unlockedPl ? (
                          <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                            ✅ Unlocked
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            Locked
                          </div>
                        )}
                      </div>
                    ))}
                    {(p.items || []).length === 0 && <div className="text-xs text-gray-500 px-2 pb-2">No items</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Admin: create */}
        <IfOwnerOnly className="p-3 border-t">
          <form onSubmit={createPlaylist} className="grid grid-cols-[1fr_auto] gap-2">
            <input className="border rounded p-2" placeholder="New playlist name" value={newPlName} onChange={(e) => setNewPlName(e.target.value)} />
            <button className="bg-black text-white px-3 rounded">Add</button>
          </form>
        </IfOwnerOnly>
      </aside>

      {/* Player */}
      <div className="md:col-span-2 border rounded-2xl bg-white p-5 relative">
        {track ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold truncate">{track.title}</div>
                <div className="text-sm text-gray-500 truncate">{track.artist}</div>
              </div>
              {unlocked ? (
                <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full animate-pulse">
                  ✅ Unlocked <AccessTimer timeLeftMs={plAccess.expiry - Date.now()} />
                </div>
              ) : (
                <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Locked</div>
              )}
            </div>

            <audio
              ref={audioRef}
              controls
              controlsList="nodownload noplaybackrate"
              crossOrigin="anonymous"
              preload="metadata"
              src={track.url ? `${API_BASE}/podcasts/stream?src=${encodeURIComponent(absUrl(track.url))}` : ""}
              style={{ width: "100%" }}
              onContextMenu={(e) => e.preventDefault()}
              onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                setCur(el.currentTime);
                if (!unlocked && el.currentTime >= PREVIEW_SECONDS) {
                  el.pause();
                  el.currentTime = PREVIEW_SECONDS - 0.1; // back off a bit
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

            <div className="mt-2 text-xs text-gray-500">
              {mmss(cur)} / {mmss(dur)} {!unlocked && `• Preview stops at ${PREVIEW_SECONDS}s`}
            </div>
          </>
        ) : (
          <div className="text-gray-500">Select a playlist item</div>
        )}
      </div>

      {/* Overlay */}
      {playlistOverlay && (
        <QROverlay
          open
          onClose={() => {
            // pause + rewind a bit so it doesn’t instantly trigger again
            const el = audioRef.current;
            if (el) {
              el.pause();
              el.currentTime = Math.min(PREVIEW_SECONDS - 0.2, el.currentTime);
            }
            setPlaylistOverlay(null);
            overlayGuardRef.current = false;
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
