// client/src/components/Admin/AdminPodcastEditor.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getJSON,
  postJSON,
  upload,
  deleteJSON,
  absUrl,
  authHeaders,
} from "../../utils/api";

export default function AdminPodcastEditor() {
  /* ---------------- state ---------------- */
  const [playlists, setPlaylists] = useState([]);
  const [sel, setSel] = useState("");           // selected playlist id/_id/name
  const [newName, setNewName] = useState("");

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [locked, setLocked] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const log  = (...a) => console.log("[AdminPodcast]", ...a);
  const warn = (...a) => console.warn("[AdminPodcast]", ...a);

  /* ---------------- helpers ---------------- */
  const selected = useMemo(
    () => playlists.find((p) => (p._id || p.id || p.name) === sel),
    [playlists, sel]
  );

  const normalize = (r) => {
    if (Array.isArray(r)) return r;
    if (Array.isArray(r?.playlists)) return r.playlists;
    if (Array.isArray(r?.items)) return r.items;
    if (Array.isArray(r?.data)) return r.data;
    return [];
  };

  /* ---------------- load ---------------- */
  async function load() {
    try {
      setError("");
      log("GET /podcasts");
      const r = await getJSON("/podcasts", { headers: authHeaders() });
      log(" response:", r);
      const arr = normalize(r);
      setPlaylists(arr);
      if (arr.length) {
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
  useEffect(() => { load(); }, []);

  /* ---------------- create/delete playlist ---------------- */
  async function addPlaylist() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      log("POST /podcasts/playlists", { name });
      await postJSON("/podcasts/playlists", { name }, { headers: authHeaders() });
      setNewName("");
      await load();
    } catch (e) {
      warn(" create failed:", e);
      alert("Create playlist failed");
    } finally {
      setBusy(false);
    }
  }

  async function deletePlaylist(id) {
    if (!id) return;
    if (!confirm("Delete this playlist and all its podcasts?")) return;
    setBusy(true);
    try {
      // server supports /podcasts/playlists/:id (preferred)
      log(`DELETE /podcasts/playlists/${id}`);
      await deleteJSON(`/podcasts/playlists/${encodeURIComponent(id)}`, { headers: authHeaders() });
    } catch (e1) {
      // fallback /podcasts/:id if older route exists
      try {
        log(`DELETE /podcasts/${id} (fallback)`);
        await deleteJSON(`/podcasts/${encodeURIComponent(id)}`, { headers: authHeaders() });
      } catch (e2) {
        warn(" delete failed:", e1, e2);
        alert("Delete playlist failed");
      }
    } finally {
      setBusy(false);
      if (sel === id) setSel("");
      await load();
    }
  }

  /* ---------------- upload item (audio or url) ---------------- */
  async function uploadItem(e) {
    e?.preventDefault?.();
    const key = selected?._id || selected?.id || selected?.name || sel;
    if (!key) return alert("Select a playlist first");
    if (!file && !url.trim()) return alert("Choose a file or paste a direct audio URL");

    // fresh FormData builder per attempt
    const buildFD = (fileField) => {
      const fd = new FormData();
      fd.append("title", title || "Untitled");
      fd.append("artist", artist || "");
      fd.append("locked", locked ? "true" : "false");
      if (file) fd.append(fileField, file);
      if (url.trim()) fd.append("url", url.trim());
      return fd;
    };

    setBusy(true);
    try {
      // TRY 1: nested route, field "audio"
      log(`UPLOAD /podcasts/playlists/${key}/items  (field=audio)`);
      await upload(`/podcasts/playlists/${encodeURIComponent(key)}/items`, buildFD("audio"), {
        headers: authHeaders(),
      });
      log(" success TRY 1");
    } catch (e1) {
      warn(" TRY 1 failed:", e1);
      try {
        // TRY 2: nested route, field "file"
        log(`UPLOAD /podcasts/playlists/${key}/items  (field=file)`);
        await upload(`/podcasts/playlists/${encodeURIComponent(key)}/items`, buildFD("file"), {
          headers: authHeaders(),
        });
        log(" success TRY 2");
      } catch (e2) {
        warn(" TRY 2 failed:", e2);
        try {
          // TRY 3: flat route with playlist in body
          const fd = buildFD(file ? "file" : "audio");
          fd.append("playlist", key);
          log("UPLOAD /podcasts/items  (with playlist)");
          await upload(`/podcasts/items`, fd, { headers: authHeaders() });
          log(" success TRY 3");
        } catch (e3) {
          warn(" TRY 3 failed:", e3);
          alert("Upload failed. Check server logs for /podcasts…/items");
          setBusy(false);
          return;
        }
      }
    }

    // reset
    setTitle("");
    setArtist("");
    setFile(null);
    setUrl("");
    setLocked(true);
    setBusy(false);
    await load();
  }

  /* ---------------- delete/toggle individual item ---------------- */
  async function removeItem(iid) {
    if (!confirm("Delete this audio item?")) return;
    const key = selected?._id || selected?.id || selected?.name || sel;
    if (!key || !iid) return;
    setBusy(true);
    try {
      log(`DELETE /podcasts/playlists/${key}/items/${iid}`);
      await deleteJSON(`/podcasts/playlists/${encodeURIComponent(key)}/items/${encodeURIComponent(iid)}`, {
        headers: authHeaders(),
      });
    } catch (e) {
      warn(" delete item failed:", e);
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

      {/* Select playlist */}
      <select
        className="border p-2 rounded w-full"
        value={sel}
        onChange={(e) => setSel(e.target.value)}
        disabled={busy}
      >
        <option value="">Select playlist…</option>
        {playlists.map((p) => {
          const id = p._id || p.id || p.name;
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
          placeholder="External audio URL (optional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
        />
        <div className="text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={busy}
            />
          </label>
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

      {/* Items list */}
      {selected && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">
              Items in “{selected.name}”
            </h4>
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
              <li className="text-gray-400">No podcasts yet</li>
            )}
          </ul>
        </div>
      )}

      {error && <div className="text-sm whitespace-pre-wrap text-red-600">{error}</div>}
    </div>
  );
}
