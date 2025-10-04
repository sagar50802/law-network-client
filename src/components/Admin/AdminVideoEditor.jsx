import { useEffect, useMemo, useState } from "react";
import {
  getJSON,
  postJSON,
  upload,
  deleteJSON,
  authHeaders,
  absUrl,
} from "../../utils/api";

export default function AdminVideoEditor() {
  const [playlists, setPlaylists] = useState([]);
  const [sel, setSel] = useState("");
  const [newName, setNewName] = useState("");

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [locked, setLocked] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  async function load() {
    try {
      setError("");
      const r = await getJSON("/videos", { headers: authHeaders() });
      const arr = normalize(r);
      setPlaylists(arr);
      if (arr.length) {
        const keep = arr.find((p) => (p._id || p.id) === sel);
        setSel(keep ? (keep._id || keep.id) : (arr[0]._id || arr[0].id));
      } else {
        setSel("");
      }
    } catch (e) {
      setError("Failed to load video playlists");
      setPlaylists([]);
      setSel("");
    }
  }
  useEffect(() => { load(); }, []);

  async function addPlaylist() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await postJSON("/videos/playlists", { name }, { headers: authHeaders() });
      setNewName("");
      await load();
    } catch {
      alert("Create playlist failed");
    } finally {
      setBusy(false);
    }
  }

  async function deletePlaylist(id) {
    if (!id) return;
    if (!confirm("Delete this playlist and all its videos?")) return;
    setBusy(true);
    try {
      await deleteJSON(`/videos/playlists/${encodeURIComponent(id)}`, { headers: authHeaders() });
    } catch {
      alert("Delete playlist failed");
    } finally {
      setBusy(false);
      if (sel === id) setSel("");
      await load();
    }
  }

  async function uploadItem(e) {
    e?.preventDefault?.();
    const key = selected?._id || selected?.id || sel;
    if (!key) return alert("Select a playlist first");
    if (!file && !url.trim()) return alert("Choose a video file or paste a direct video URL");

    const fd = new FormData();
    fd.append("title", title || "Untitled");
    fd.append("artist", artist || "");
    fd.append("locked", locked ? "true" : "false");
    if (file) fd.append("video", file);  // field name "video"
    if (url.trim()) fd.append("url", url.trim());

    setBusy(true);
    try {
      await upload(`/videos/playlists/${encodeURIComponent(key)}/items`, fd, {
        headers: authHeaders(),
      });
      setTitle("");
      setArtist("");
      setFile(null);
      setUrl("");
      setLocked(true);
      await load();
    } catch {
      alert("Upload failed. Check server logs for details.");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(iid) {
    if (!confirm("Delete this video item?")) return;
    const key = selected?._id || selected?.id || sel;
    if (!key || !iid) return;
    setBusy(true);
    try {
      await deleteJSON(`/videos/playlists/${encodeURIComponent(key)}/items/${encodeURIComponent(iid)}`, {
        headers: authHeaders(),
      });
    } catch {}
    setBusy(false);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <input
          className="border p-2 rounded flex-1"
          placeholder="New playlist name"
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
          Locked (requires access)
        </label>
        <button
          className="bg-blue-600 text-white px-3 py-2 rounded w-fit disabled:opacity-60"
          disabled={busy || !sel || (!file && !url.trim())}
        >
          {busy ? "Uploading..." : "Upload"}
        </button>
      </form>

      {selected && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">
              Items in “{selected.name}”
            </h4>
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
