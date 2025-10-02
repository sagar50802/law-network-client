// client/src/components/Admin/AdminPodcastEditor.jsx
import { useEffect, useState } from "react";
import { getJSON, postJSON, upload, delJSON, authHeaders } from "../../utils/api";

export default function AdminPodcastEditor() {
  const [playlists, setPlaylists] = useState([]);
  const [sel, setSel] = useState("");
  const [newName, setNewName] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [locked, setLocked] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function log(...a) {
    console.log("[AdminPodcast]", ...a);
  }

  async function load() {
    try {
      setError("");
      log("GET /api/podcasts");
      const r = await getJSON("/podcasts", { headers: authHeaders() });
      log("response:", r);
      setPlaylists(r.playlists || []);
      if (r.playlists?.length && !sel) setSel(r.playlists[0]._id);
    } catch (e) {
      console.error(e);
      setError("Failed to load podcast playlists");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createPlaylist() {
    if (!newName.trim()) return;
    try {
      setBusy(true);
      log("POST /api/podcasts/playlists", { name: newName.trim() });
      await postJSON("/podcasts/playlists", { name: newName.trim() });
      setNewName("");
      await load();
    } catch (err) {
      alert("Create playlist failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function uploadItem(e) {
    e.preventDefault();
    if (!sel) return alert("Select a playlist first");
    if (!file && !url.trim()) return alert("Choose a file or paste a direct audio URL");

    try {
      setBusy(true);
      const fd = new FormData();
      fd.append("title", title || "Untitled");
      fd.append("artist", artist || "");
      fd.append("locked", String(locked));
      if (file) fd.append("audio", file);
      if (url) fd.append("url", url.trim());

      log(`UPLOAD /api/podcasts/playlists/${sel}/items`);
      await upload(`/podcasts/playlists/${sel}/items`, fd);
      setTitle("");
      setArtist("");
      setUrl("");
      setFile(null);
      setLocked(true);
      await load();
    } catch (err) {
      alert("Upload failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function deletePlaylist(pid) {
    if (!pid) return;
    if (!confirm("Delete this playlist?")) return;
    try {
      setBusy(true);
      await delJSON(`/podcasts/playlists/${pid}`);
      if (sel === pid) setSel("");
      await load();
    } catch (err) {
      alert("Delete playlist failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(pid, iid) {
    if (!confirm("Delete this audio?")) return;
    try {
      setBusy(true);
      await delJSON(`/podcasts/playlists/${pid}/items/${iid}`);
      await load();
    } catch (err) {
      alert("Delete item failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-lg">Manage Podcasts</h3>

      <div className="flex gap-2 items-center">
        <input
          className="border rounded p-2 flex-1"
          placeholder="New playlist name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button onClick={createPlaylist} disabled={busy} className="px-3 py-2 rounded bg-black text-white">
          Add Playlist
        </button>
      </div>

      <div className="mb-2">
        <select className="border rounded p-2" value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">Select playlist…</option>
          {playlists.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={uploadItem} className="grid gap-2 border rounded p-3">
        <input className="border rounded p-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="border rounded p-2" placeholder="Speaker (optional)" value={artist} onChange={(e) => setArtist(e.target.value)} />
        <input className="border rounded p-2" placeholder="External audio URL (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
          Locked (requires access)
        </label>
        <button disabled={busy} className="px-3 py-2 rounded bg-blue-600 text-white w-fit">
          {busy ? "Uploading…" : "Upload"}
        </button>
      </form>

      {playlists.map((p) => (
        <div key={p._id} className="border rounded p-3 space-y-2">
          <div className="font-semibold flex justify-between items-center">
            <span>{p.name}</span>
            <button className="text-red-600 text-xs" onClick={() => deletePlaylist(p._id)} disabled={busy}>
              Delete playlist
            </button>
          </div>
          {(p.items || []).map((it) => (
            <div key={it.id} className="border rounded p-2 flex justify-between items-center">
              <div>
                <div className="font-medium">{it.title}</div>
                <div className="text-xs text-gray-500">{it.artist}</div>
              </div>
              <button
                className="text-red-600 text-xs border px-2 py-1 rounded"
                onClick={() => deleteItem(p._id, it.id)}
                disabled={busy}
              >
                Delete
              </button>
            </div>
          ))}
          {(p.items?.length ?? 0) === 0 && <div className="text-gray-400 text-sm">No items yet</div>}
        </div>
      ))}

      {error && <div className="text-sm text-red-600">{error}</div>}
    </section>
  );
}
