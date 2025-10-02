// client/src/components/Admin/AdminPodcastEditor.jsx
import { useEffect, useState } from "react";
import { getJSON, postJSON, upload, delJSON, authHeaders } from "../../utils/api";

export default function AdminPodcastEditor() {
  const [playlists, setPlaylists] = useState([]);
  const [sel, setSel] = useState(""); // selected playlist _id
  const [newName, setNewName] = useState("");

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [locked, setLocked] = useState(true);
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function log(...a) { console.log("[AdminPodcast]", ...a); }
  function warn(...a) { console.warn("[AdminPodcast]", ...a); }

  async function load() {
    try {
      setError("");
      log("GET /api/podcasts");
      const r = await getJSON("/api/podcasts");
      log(" response:", r);
      const list = Array.isArray(r?.playlists) ? r.playlists : [];
      setPlaylists(list);
      if (!sel && list[0]?._id) setSel(list[0]._id);
    } catch (e) {
      warn(" load failed:", e);
      setError("Failed to load podcast playlists");
      setPlaylists([]);
      setSel("");
    }
  }

  useEffect(() => { load(); }, []);

  async function createPlaylist() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      log("POST /api/podcasts/playlists", { name });
      const r = await postJSON("/api/podcasts/playlists", { name }, { headers: authHeaders() });
      log(" response:", r);
      setNewName("");
      await load();
    } catch (err) {
      warn(" create failed:", err);
      alert("Create playlist failed: " + (err?.message || err));
    } finally { setBusy(false); }
  }

  async function uploadItem(e) {
    e.preventDefault();
    if (!sel) { return alert("Select a playlist first"); }
    if (!file && !url.trim()) { return alert("Choose a file or paste a direct audio URL"); }

    setBusy(true);
    try {
      const fd = new FormData();
      if (file) fd.append("audio", file);
      if (url)  fd.append("url", url.trim());
      fd.append("title", title || "Untitled");
      fd.append("artist", artist || "");
      fd.append("locked", String(locked));

      log(`UPLOAD /api/podcasts/playlists/${sel}/items`, {
        hasFile: !!file, hasUrl: !!url
      });
      const r = await upload(`/api/podcasts/playlists/${sel}/items`, fd, { headers: authHeaders() });
      log(" response:", r);

      setTitle(""); setArtist(""); setLocked(true); setFile(null); setUrl("");
      await load();
    } catch (err) {
      warn(" upload failed:", err);
      alert("Upload failed: " + (err?.message || err));
    } finally { setBusy(false); }
  }

  async function removeItem(pid, iid) {
    if (!confirm("Delete this audio?")) return;
    setBusy(true);
    try {
      log(`DELETE /api/podcasts/playlists/${pid}/items/${iid}`);
      const r = await delJSON(`/api/podcasts/playlists/${pid}/items/${iid}`, { headers: authHeaders() });
      log(" response:", r);
      await load();
    } catch (e) {
      warn(" delete item failed:", e);
    } finally { setBusy(false); }
  }

  async function toggleLock(pid, iid, next) {
    setBusy(true);
    try {
      log(`PATCH /api/podcasts/playlists/${pid}/items/${iid}/lock`, { locked: next });
      const r = await postJSON(`/api/podcasts/playlists/${pid}/items/${iid}/lock`, { locked: next }, { headers: authHeaders() });
      log(" response:", r);
      await load();
    } catch (e) {
      warn(" toggle lock failed:", e);
    } finally { setBusy(false); }
  }

  async function deletePlaylist(pid) {
    if (!confirm("Delete this playlist?")) return;
    setBusy(true);
    try {
      log(`DELETE /api/podcasts/playlists/${pid}`);
      const r = await delJSON(`/api/podcasts/playlists/${pid}`, { headers: authHeaders() });
      log(" response:", r);
      if (sel === pid) setSel("");
      await load();
    } catch (e) {
      warn(" delete playlist failed:", e);
      alert("Delete playlist failed: " + (e?.message || e));
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-8">
      <h3 className="font-semibold text-lg mb-2">Manage Podcasts</h3>

      <div className="flex gap-2 items-center mb-3">
        <input
          className="border rounded p-2 flex-1"
          placeholder="New playlist name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button onClick={createPlaylist} disabled={busy} className="px-3 py-2 rounded bg-gray-800 text-white">
          Add Playlist
        </button>
      </div>

      <div className="mb-4">
        <select className="border rounded p-2" value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">Select playlist…</option>
          {playlists.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>

      <form onSubmit={uploadItem} className="grid gap-2 border rounded p-3 mb-6">
        <input className="border rounded p-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="border rounded p-2" placeholder="Artist (optional)" value={artist} onChange={(e) => setArtist(e.target.value)} />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
          Locked (requires access)
        </label>
        <div className="text-sm text-gray-600">Upload MP3 <em>or</em> paste direct URL</div>
        <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <input className="border rounded p-2" placeholder="External audio URL (https://…)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button disabled={busy} className="px-3 py-2 rounded bg-blue-600 text-white w-fit">{busy ? "Uploading…" : "Upload"}</button>
      </form>

      {playlists.map((p) => (
        <div key={p._id} className="mb-6">
          <div className="font-semibold mb-1 flex items-center justify-between">
            <span>{p.name}</span>
            <button className="text-red-600 text-xs" onClick={() => deletePlaylist(p._id)} disabled={busy}>Delete playlist</button>
          </div>
          {(p.items || []).length === 0 && <div className="text-sm text-gray-500">No items</div>}
          <div className="space-y-2">
            {(p.items || []).map((it) => (
              <div key={it.id} className="flex items-center gap-3 border rounded p-2">
                <div className="flex-1">
                  <div className="font-medium">{it.title}</div>
                  <div className="text-xs text-gray-500 break-all">{it.url}</div>
                </div>
                <span className="text-xs">{it.locked ? "🔒" : "🔓"}</span>
                <button
                  className="px-2 py-1 border rounded text-xs"
                  onClick={() => toggleLock(p._id, it.id, !it.locked)}
                  disabled={busy}
                >
                  {it.locked ? "Unlock" : "Lock"}
                </button>
                <button
                  className="px-2 py-1 border rounded text-xs text-red-600"
                  onClick={() => removeItem(p._id, it.id)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {error && <div className="text-sm whitespace-pre-wrap text-red-600 mt-3">{error}</div>}
    </section>
  );
}
