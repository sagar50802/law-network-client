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

export default function Podcast() {
  const [playlists, setPlaylists] = useState([]);
  const [pid, setPid] = useState(null);
  const [track, setTrack] = useState(null);

  const [accessMap, setAccessMap] = useState({});
  const [accessLoading, setAccessLoading] = useState(false);
  const [playlistOverlay, setPlaylistOverlay] = useState(null);

  const [email] = useState(() => localStorage.getItem("userEmail") || "");
  useSubmissionStream(email);

  const audioRef = useRef(null);
  const overlayGuardRef = useRef(false);

  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  /* ---------- load playlists + access ---------- */
  const getAccessForPlaylist = async (pl) => {
    const hits = [
      await loadAccess("podcast", pl.id, email),
      pl.name ? await loadAccess("podcast", pl.name, email) : null,
      pl.slug ? await loadAccess("podcast", pl.slug, email) : null,
    ].filter(Boolean);
    const valid = hits.filter((x) => x?.expiry && x.expiry > Date.now());
    if (!valid.length) return null;
    return valid.reduce((a, b) => (a.expiry > b.expiry ? a : b));
  };

  const load = async () => {
    setAccessLoading(true);
    const r = await getJSON("/podcasts");
    const pls = r.playlists || [];
    setPlaylists(pls);
    if (!pid && pls[0]) setPid(pls[0].id);
    const acc = {};
    for (const pl of pls) acc[pl.id] = await getAccessForPlaylist(pl);
    setAccessMap(acc);
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

  /* ---------- reset when track changes ---------- */
  useEffect(() => {
    overlayGuardRef.current = false;
    setCur(0);
    setDur(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [track?.id, pid]);

  /* ---------- live access sync ---------- */
  const resolvePlaylistId = (featureId) => {
    if (!featureId) return null;
    const fid = String(featureId).trim().toLowerCase();
    const byId = playlists.find((pl) => String(pl.id).toLowerCase() === fid)?.id;
    if (byId) return byId;
    const byName = playlists.find((pl) => String(pl.name || "").toLowerCase() === fid)?.id;
    if (byName) return byName;
    const bySlug = playlists.find((pl) => String(pl.slug || "").toLowerCase() === fid)?.id;
    if (bySlug) return bySlug;
    return null;
  };

  useAccessSync(async (detail) => {
    if (!detail || detail.email !== email || detail.feature !== "podcast") return;
    const norm = resolvePlaylistId(detail.featureId) || detail.featureId;
    if (detail.expiry && detail.expiry > Date.now()) {
      setAccessMap((p) => ({ ...p, [norm]: { expiry: detail.expiry } }));
      setPlaylistOverlay(null);
      overlayGuardRef.current = false;
      try { await audioRef.current?.play?.(); } catch {}
      return;
    }
    if (detail.revoked) {
      setAccessMap((p) => ({ ...p, [norm]: null }));
      const pl = playlists.find((x) => String(x.id) === String(norm));
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

  /* ---------- admin actions ---------- */
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
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-1 rounded"
                      onClick={() => { setPlaylistOverlay(p); overlayGuardRef.current = true; }}
                    >
                      <span>Preview / Unlock</span>
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
                          onClick={() => setTrack(it)}
                        >
                          <div className="truncate">
                            <div className="text-sm font-medium truncate">{it.title}</div>
                            <div className="text-xs text-gray-500 truncate">{it.artist}</div>
                          </div>

                          {unlockedPl ? (
                            <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                              <span>✅ Unlocked</span>
                              <AccessTimer timeLeftMs={pAccess.expiry - Date.now()} />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              <span>Locked</span>
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
                <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                  Locked
                </div>
              )}
            </div>

            {/* Native controls with preview enforcement */}
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
                  el.currentTime = PREVIEW_SECONDS;
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
                  el.currentTime = PREVIEW_SECONDS;
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

            {/* Admin controls for current track */}
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

      {/* Overlay */}
      {playlistOverlay && (
        <QROverlay
          open
          onClose={() => {
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
