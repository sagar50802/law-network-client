// client/src/components/Admin/AdminVideoGallery.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getJSON,
  postJSON,
  upload,
  deleteJSON,
  authHeaders,
  absUrl,
} from "../../utils/api";

export default function AdminVideoGallery() {
  /* ---------------- state ---------------- */
  const [playlists, setPlaylists] = useState([]);
  const [sel, setSel] = useState(""); // selected playlist id
  const [newName, setNewName] = useState("");

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [locked, setLocked] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const log = (...a) => console.log("[AdminVideo]", ...a);
  const warn = (...a) => console.warn("[AdminVideo]", ...a);

  /* ---------------- helpers ---------------- */
  const selected = useMemo(
    () => playlists.find((p) => (p._id || p.id) === sel),
    [playlists, sel]
  );

  const normalize = (r) => {
    if (Array.isArray(r)) return r;
    if (Array.isArray(r?.playlists)) return r.playlists;
    if (Array.isArray(r?.items)) return r.items;
    if (Array.isArray(r?.data)) return r.data;
    return [];
  };

  // Reuse the same admin key strategy as podcasts
  const ownerQuery = () => {
    const h = authHeaders() || {};
    const headerKey = h["X-Owner-Key"] || h["x-owner-key"] || "";
    const bearer =
      typeof h.Authorization === "string" && h.Authorization.startsWith("Bearer ")
        ? h.Authorization.slice(7)
        : "";
    const key = headerKey || bearer || "";
    return key ? `?owner=${encodeURIComponent(key)}` : "";
  };

  /* ---------------- load ---------------- */
  async function load() {
    try {
      setError("");
      log("GET /videos");
      const r = await getJSON("/videos", { headers: authHeaders() });
      log(" response:", r);
      const arr = normalize(r);
      setPlaylists(arr);
      if (arr.length) {
        const keep = arr.find((p) => (p._id || p.id) === sel);
        setSel(keep ? (keep._id || keep.id) : (arr[0]._id || arr[0].id));
      } else {
        setSel("");
      }
    } catch (e) {
      warn(" load failed:", e);
      setError("Failed to load video playlists");
      setPlaylists([]);
      setSel("");
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */}, []);

  /* ---------------- create/delete playlist ---------------- */
  async function addPlaylist() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      // send name in both places (body + query) like your podcast editor
      const qs = new URLSearchParams({ name }).toString();
      await postJSON(`/videos/playlists?${qs}`, { name, playlistName: name }, { headers: authHeaders() });
      setNewName("");
      await load();
    } catch (e) {
      warn(" create failed:", e);
      alert("Create video playlist failed");
    } finally {
      setBusy(false);
    }
  }

  async function deletePlaylist(id) {
    if (!id) return;
    if (!confirm("Delete this video playlist and all its items?")) return;
    setBusy(true);
    try {
      const urlWithKey = `/videos/playlists/${encodeURIComponent(id)}${ownerQuery()}`;
      log("DELETE", urlWithKey);
      await deleteJSON(urlWithKey, { headers: authHeaders() });
    } catch (e) {
      warn(" delete failed:", e);
      alert("Delete playlist failed");
    } finally {
      setBusy(false);
      if (sel === id) setSel("");
      await load();
    }
  }

  /* ---------------- upload item (video file or URL) ---------------- */
  async function uploadItem(e) {
    e?.preventDefault?.();
    const plId = selected?._id || selected?.id || sel;
    if (!plId) return alert("Select a playlist first");
    if (!file && !url.trim()) return alert("Choose a file or paste a direct video URL");

    const fd = new FormData();
    fd.append("title", title || "Untitled");
    fd.append("artist", artist || "");
    fd.append("locked", locked ? "true" : "false");
    if (file) fd.append("video", file); // NOTE: field name must be "video"
    if (url.trim()) fd.append("url", url.trim());

    setBusy(true);
    try {
      const urlWithKey = `/videos/playlists/${encodeURIComponent(plId)}/items${ownerQuery()}`;
      log("UPLOAD", urlWithKey);
      await upload(urlWithKey, fd, { headers: authHeaders() });
      setTitle("");
      setArtist("");
      setFile(null);
      setUrl("");
      setLocked(true);
      await load();
    } catch (err) {
      warn(" upload failed:", err);
      alert("Upload failed. Check server logs for details.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------------- delete/toggle item ---------------- */
  async function removeItem(iid) {
    if (!confirm("Delete this video item?")) return;
    const plId = selected?._id || selected?.id || sel;
    if (!plId || !iid) return;
    setBusy(true);
    try {
      const urlWithKey = `/videos/playlists/${encodeURIComponent(plId)}/items/${encodeURIComponent(iid)}${ownerQuery()}`;
      log("DELETE", urlWithKey);
      await deleteJSON(urlWithKey, { headers: authHeaders() });
    } catch (e) {
      warn(" delete item failed:", e);
    } finally {
      setBusy(false);
      await load();
    }
  }

  async function toggleLock(iid, newState) {
    const plId = selected?._id || selected?.id || sel;
    if (!plId || !iid) return;
    setBusy(true);
    try {
      const qs = new URLSearchParams({ locked: String(!!newState) }).toString();
      const urlWithKey = `/videos/playlists/${encodeURIComponent(plId)}/items/${encodeURIComponent(iid)}/lock${ownerQuery()}&${qs}`;
      log("PATCH", urlWithKey);
      await fetch(urlWithKey, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ locked: !!newState }),
      });
    } catch (e) {
      warn(" toggle lock failed:", e);
    } finally {
      setBusy(false);
      await load();
    }
  }

  /* ---------------- view ---------------- */
  return (
    <div className="space-y-4">
      {/* Create playlist */}
      <div className="flex gap-2 items-center">
        <input
          className="border p-2 rounded flex-1"
          placeholder="New video playlist name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={busy}
        />
        <button
          className="bg-black text-white px-3 rounded disabled:opacity-60"
          onClick={addPlaylist}
          disabled={busy || !newName.trim()}
        >
          Add Playlist
        </button>
      </div>

      {/* Select playlist */}
      <select
        className="border p-2 rounded w-full"
        value={sel}
        onChange={(e) => setSel(e.target.value)}
        disabled={busy}
      >
        <option value="">Select playlist…</option>
        {playlists.map((p) => {
          const id = p._id || p.id;
          return (
            <option key={id} value={id}>
              {p.name}
            </option>
          );
        })}
      </select>

      {/* Upload form */}
      <form onSubmit={uploadItem} className="grid gap-2">
        <input
          className="border p-2 rounded"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
        <input
          className="border p-2 rounded"
          placeholder="Speaker (optional)"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          disabled={busy}
        />
        <input
          className="border p-2 rounded"
          placeholder="External video URL (optional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
        />
        <div className="text-sm">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={busy}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={locked}
            onChange={(e) => setLocked(e.target.checked)}
            disabled={busy}
          />
        </label>
        <span className="text-sm text-gray-600 -mt-2">Locked (requires access)</span>

        <button
          className="bg-blue-600 text-white px-3 py-2 rounded w-fit disabled:opacity-60"
          disabled={busy || !sel || (!file && !url.trim())}
        >
          {busy ? "Uploading..." : "Upload"}
        </button>
      </form>

      {/* Items list */}
      {selected && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Items in “{selected.name}”</h4>
            <button
              className="text-red-600 text-sm"
              onClick={() => deletePlaylist(selected._id || selected.id)}
              disabled={busy}
            >
              Delete Playlist
            </button>
          </div>

          <ul className="space-y-2">
            {(selected.items || []).map((it) => (
              <li key={it._id || it.id} className="border rounded p-2">
                <div className="font-medium">{it.title}</div>
                <div className="text-xs text-gray-500 break-all">{absUrl(it.url)}</div>
                <div className="flex gap-2 mt-2">
                  <button
                    className="px-2 py-1 border rounded text-xs"
                    onClick={() => toggleLock(it._id || it.id, !it.locked)}
                    disabled={busy}
                  >
                    {it.locked ? "Unlock" : "Lock"}
                  </button>
                  <button
                    className="px-2 py-1 border rounded text-xs text-red-600"
                    onClick={() => removeItem(it._id || it.id)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {(selected.items?.length ?? 0) === 0 && (
              <li className="text-gray-400">No videos yet</li>
            )}
          </ul>
        </div>
      )}

      {error && <div className="text-sm whitespace-pre-wrap text-red-600">{error}</div>}
    </div>
  );
}
