// client/src/components/Video/VideoGallery.jsx
import { useEffect, useRef, useState } from "react";
import { API_BASE, getJSON, absUrl } from "../../utils/api";
import QROverlay from "../common/QROverlay";
import AccessTimer from "../common/AccessTimer";
import { loadAccess } from "../../utils/access";
import useAccessSync from "../../hooks/useAccessSync";
import useSubmissionStream from "../../hooks/useSubmissionStream";

const PREVIEW_SECONDS = 10;

export default function VideoGallery() {
  /* data */
  const [playlists, setPlaylists] = useState([]);
  const [pid, setPid] = useState(null);
  const [item, setItem] = useState(null);

  /* access + overlay */
  const [accessMap, setAccessMap] = useState({});
  const [overlayPl, setOverlayPl] = useState(null);
  const overlayGuardRef = useRef(false);

  /* playback UI */
  const videoRef = useRef(null);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  /* user identity for access lookups / events */
  const [email] = useState(() => localStorage.getItem("userEmail") || "");
  useSubmissionStream(email);

  /* load playlists + access */
  const load = async () => {
    const r = await getJSON("/videos");
    const pls = r.playlists || [];
    setPlaylists(pls);
    if (!pid && pls[0]) setPid(pls[0].id);

    const acc = {};
    for (const pl of pls) {
      // access type "video"
      acc[pl.id] = await loadAccess("video", pl.id, email);
    }
    setAccessMap(acc);
  };

  useEffect(() => { load(); /* once */ }, []);

  /* pick first item when playlist changes */
  useEffect(() => {
    if (!pid) return;
    const pl = playlists.find(p => p.id === pid);
    if (pl?.items?.[0]) setItem(pl.items[0]);
  }, [pid, playlists]);

  /* reset on item change */
  useEffect(() => {
    overlayGuardRef.current = false;
    setCur(0);
    setDur(0);
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;

    // point to source through proxy (works even if R2 CORS is strict)
    if (item?.url) {
      const raw = absUrl(item.url);
      el.src = `${API_BASE}/videos/stream?src=${encodeURIComponent(raw)}`;
      // try to autoplay the preview
      el.play().catch(() => {}); // ignore if browser blocks
    } else {
      el.removeAttribute("src");
    }
  }, [item?.id, pid]);

  /* unlocked? */
  const plAccess = accessMap[pid];
  const unlocked = !!(plAccess?.expiry && plAccess.expiry > Date.now());

  /* access sync (grants/revokes from QR flow) */
  useAccessSync(async (detail) => {
    if (!detail || detail.feature !== "video" || detail.email !== email) return;

    const featureId = String(detail.featureId);
    if (detail.expiry && detail.expiry > Date.now()) {
      setAccessMap(prev => ({ ...prev, [featureId]: { expiry: detail.expiry } }));
      setOverlayPl(null);
      overlayGuardRef.current = false;
      // resume playing
      try { await videoRef.current?.play?.(); } catch {}
      return;
    }
    if (detail.revoked) {
      setAccessMap(prev => ({ ...prev, [featureId]: null }));
      const pl = playlists.find(p => String(p.id) === featureId);
      if (pl) setOverlayPl(pl);
      overlayGuardRef.current = true;
    }
  });

  /* utils */
  const mmss = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <section className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* sidebar */}
      <aside className="md:col-span-1 border rounded-2xl bg-white">
        <div className="p-3 border-b font-semibold">Video Gallery</div>
        <div className="p-3 space-y-3 max-h-[60vh] overflow-auto">
          {playlists.map((p) => {
            const a = accessMap[p.id];
            const unlockedPl = !!(a?.expiry && a.expiry > Date.now());
            return (
              <div key={p.id} className={`border rounded-xl ${pid === p.id ? "ring-2 ring-blue-500" : ""}`}>
                <div className="flex items-center justify-between px-3 py-2">
                  <button className="text-left font-medium flex-1" onClick={() => setPid(p.id)}>
                    {p.name}
                  </button>
                  {unlockedPl ? (
                    <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                      ✅ Unlocked <AccessTimer timeLeftMs={a.expiry - Date.now()} />
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-1 rounded"
                      onClick={() => { setOverlayPl(p); overlayGuardRef.current = true; }}
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
                        className={`px-2 py-2 rounded cursor-pointer hover:bg-gray-50 flex items-center justify-between ${item?.id === it.id ? "bg-gray-50" : ""}`}
                        onClick={() => setItem(it)}
                      >
                        <div className="truncate">
                          <div className="text-sm font-medium truncate">{it.title}</div>
                          <div className="text-xs text-gray-500 truncate">{it.artist}</div>
                        </div>
                        {unlockedPl ? (
                          <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">✅ Unlocked</div>
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
      </aside>

      {/* player */}
      <div className="md:col-span-2 border rounded-2xl bg-white p-5 relative">
        {item ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold truncate">{item.title}</div>
                <div className="text-sm text-gray-500 truncate">{item.artist}</div>
              </div>
              {unlocked ? (
                <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full animate-pulse">
                  ✅ Unlocked <AccessTimer timeLeftMs={plAccess.expiry - Date.now()} />
                </div>
              ) : (
                <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Locked</div>
              )}
            </div>

            <video
              ref={videoRef}
              controls
              controlsList="nodownload noplaybackrate"
              preload="metadata"
              crossOrigin="anonymous"
              style={{ width: "100%", maxHeight: 420, background: "#000" }}
              onContextMenu={(e) => e.preventDefault()}
              onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                setCur(el.currentTime);
                if (!unlocked && el.currentTime >= PREVIEW_SECONDS) {
                  el.pause();
                  el.currentTime = PREVIEW_SECONDS - 0.1; // small back-off
                  if (!overlayGuardRef.current) {
                    const currentPl = playlists.find((x) => x.id === pid);
                    if (currentPl) setOverlayPl(currentPl);
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
                    if (currentPl) setOverlayPl(currentPl);
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
          <div className="text-gray-500">Select a video</div>
        )}
      </div>

      {/* QR overlay */}
      {overlayPl && (
        <QROverlay
          open
          onClose={() => {
            const el = videoRef.current;
            if (el) {
              el.pause();
              el.currentTime = Math.min(PREVIEW_SECONDS - 0.2, el.currentTime || 0);
            }
            setOverlayPl(null);
            overlayGuardRef.current = false;
          }}
          title={overlayPl.name}
          subjectLabel="Video"
          inline
          feature="video"
          featureId={overlayPl.id}
        />
      )}
    </section>
  );
}
