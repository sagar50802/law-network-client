import { useEffect, useState, useMemo } from "react";
import { getJSON, postJSON, upload, delJSON } from "../../utils/api";

export default function AdminPodcastEditor() {
  const [playlists, setPlaylists] = useState([]);
  const [sel, setSel] = useState(""); // selected playlist _id
  const [newName, setNewName] = useState("");

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [locked, setLocked] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // -------- utils ----------
  const log = (...a) => console.log("[AdminPodcast]", ...a);
  const warn = (...a) => console.warn("[AdminPodcast]", ...a);

  const selected = useMemo(
    () => playlists.find((p) => (p?._id || p?.id || p?.name) === sel),
    [playlists, sel]
  );

  // -------- load ----------
  async function load() {
    try {
      setError("");
      log("GET /podcasts");
      const r = await getJSON("/podcasts");
      log(" response:", r);
      const arr = Array.isArray(r?.playlists) ? r.playlists : [];
      setPlaylists(arr);
      if (arr.length) {
        // keep current selection if it still exists
        const keep = arr.find((p) => (p._id || p.id || p.name) === sel);
        setSel(
          keep ? (keep._id || keep.id || keep.name) : (arr[0]._id || arr[0].id || arr[0].name)
        );
      } else {
        setSel("");
      }
    } catch (e) {
      warn(" load failed:", e);
      setError("Failed to load podcast playlists");
      setPlaylists([]);
      setSel("");
    }
  }

  useEffect(() => {
    load();
  }, []);

  // -------- actions: playlist ----------
  async function addPlaylist() {
    const name = newName.trim();
    if (!name) return;
    try {
      setBusy(true);
      log("POST /podcasts/playlists", { name });
      await postJSON("/podcasts/playlists", { name });
      setNewName("");
      await load();
    } catch (err) {
      warn(" create failed:", err);
      alert("Create playlist failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function deletePlaylist(id) {
    if (!id) return;
    if (!confirm("Delete this playlist and all its podcasts?")) return;
    try {
      setBusy(true);
      // server supports both; try the canonical first:
      log(`DELETE /podcasts/playlists/${id}`);
      await delJSON(`/podcasts/playlists/${encodeURIComponent(id)}`);
      if (sel === id) setSel("");
      await load();
    } catch (e) {
      warn(" delete (playlists/:id) failed, trying /podcasts/:id", e);
      try {
        await delJSON(`/podcasts/${encodeURIComponent(id)}`);
        if (sel === id) setSel("");
        await load();
      } catch (err2) {
        warn(" delete failed:", err2);
        alert("Delete playlist failed: " + (err2?.message || err2));
      }
    } finally {
      setBusy(false);
    }
  }

  // -------- actions: items ----------
  async function uploadItem(e) {
    e?.preventDefault?.();
    const key = selected?._id || selected?.id || selected?.name || sel;
    if (!key) return alert("Select a playlist first");
    if (!file && !url.trim()) return alert("Choose a file or paste a direct audio URL");

    const fd = new FormData();
    fd.append("title", title || "Untitled");
    fd.append("artist", artist || "");
    fd.append("locked", String(locked));
    if (file) fd.append("audio", file);
    if (url) fd.append("url", url.trim());

    try {
      setBusy(true);
      log(`UPLOAD /podcasts/playlists/${key}/items`, {
        hasFile: !!file,
        url: url.trim() || "(none)",
      });
      await upload(`/podcasts/playlists/${encodeURIComponent(key)}/items`, fd);
      setTitle("");
      setArtist("");
      setUrl("");
      setFile(null);
      setLocked(true);
      await load();
    } catch (err) {
      warn(" upload failed:", err);
      alert("Upload failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(pid, iid) {
    if (!iid || !pid) return;
    if (!confirm("Delete this audio?")) return;
    try {
      setBusy(true);
      log(`DELETE /podcasts/playlists/${pid}/items/${iid}`);
      await delJSON(`/podcasts/playlists/${encodeURIComponent(pid)}/items/${encodeURIComponent(iid)}`);
      await load();
    } catch (err) {
      warn(" delete item failed:", err);
      alert("Delete item failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  // -------- render ----------
  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-lg">Manage Podcasts</h3>

      {/* Create playlist */}
      <div className="flex gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Playlists list */}
        <div className="space-y-2">
          {playlists.map((p) => {
            const id = p._id || p.id || p.name;
            const active = id === sel;
            return (
              <div
                key={id}
                className={`border rounded p-2 flex items-center justify-between cursor-pointer ${
                  active ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setSel(id)}
              >
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">{(p.items?.length ?? 0)} items</div>
                </div>
                <button
                  className="text-red-600 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePlaylist(id);
                  }}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            );
          })}
          {playlists.length === 0 && <div className="text-gray-400">No playlists yet</div>}
        </div>

        {/* Uploader */}
        <form onSubmit={uploadItem} className="space-y-2">
          <input
            className="border p-2 rounded w-full"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
          />
          <input
            className="border p-2 rounded w-full"
            placeholder="Speaker (optional)"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            disabled={busy}
          />
          <input
            className="border p-2 rounded w-full"
            placeholder="External audio URL (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
          />
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={busy}
          />
          {selected && (
            <div className="text-xs text-gray-500">
              Selected playlist: <code>{selected.name}</code>
            </div>
          )}
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
            type="submit"
            className="bg-blue-600 text-white px-3 rounded disabled:opacity-60"
            disabled={busy || !sel}
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </form>
      </div>

      {/* Items in selected */}
      {selected && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Items in “{selected.name}”</h4>
            <button
              className="text-red-600 text-sm"
              onClick={() => deletePlaylist(selected._id || selected.id || selected.name)}
              disabled={busy}
            >
              Delete Playlist
            </button>
          </div>

          <ul className="space-y-2">
            {(selected.items || []).map((it) => (
              <li key={it._id || it.id} className="border rounded p-2 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.title}</div>
                  <div className="text-xs text-gray-500 truncate">{it.artist}</div>
                </div>
                <button
                  className="text-red-600 text-xs border px-2 py-1 rounded"
                  onClick={() => deleteItem(selected._id || selected.id || selected.name, it._id || it.id)}
                  disabled={busy}
                >
                  Delete
                </button>
              </li>
            ))}
            {(selected.items?.length ?? 0) === 0 && (
              <li className="text-gray-400">No podcasts yet</li>
            )}
          </ul>
        </div>
      )}

      {error && <div className="text-sm whitespace-pre-wrap text-red-600">{error}</div>}
    </section>
  );
}
