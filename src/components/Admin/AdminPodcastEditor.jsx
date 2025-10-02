import { useEffect, useState } from "react";
import { API_BASE, getJSON, authHeaders } from "../../utils/api";

export default function AdminPodcastEditor() {
  const [playlists, setPlaylists] = useState([]);
  const [newPlName, setNewPlName] = useState("");
  const [pid, setPid] = useState("");
  const [form, setForm] = useState({
    title: "",
    speaker: "",
    externalUrl: "",
    locked: true,
    audio: null,
  });

  /* ---------------- Load existing playlists ---------------- */
  const load = async () => {
    try {
      const r = await getJSON("/podcasts"); // ✅ no /api here
      setPlaylists(r.playlists || []);
      if (!pid && (r.playlists || []).length) setPid(r.playlists[0].id);
    } catch (err) {
      console.error("[AdminPodcast] load error:", err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ---------------- Create / Delete playlist ---------------- */
  const createPlaylist = async (e) => {
    e.preventDefault();
    if (!newPlName.trim()) return;
    try {
      const resp = await fetch(`${API_BASE}/podcasts/playlists`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ title: newPlName.trim() }), // backend expects title
      });
      if (!resp.ok) throw new Error(await resp.text());
      setNewPlName("");
      await load();
    } catch (err) {
      console.error("[AdminPodcast] create failed:", err);
      alert("Create playlist failed");
    }
  };

  const deletePlaylist = async (plId) => {
    if (!window.confirm("Delete this playlist?")) return;
    try {
      const resp = await fetch(`${API_BASE}/podcasts/playlists/${plId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!resp.ok) throw new Error(await resp.text());
      if (pid === plId) setPid("");
      await load();
    } catch (err) {
      console.error("[AdminPodcast] delete failed:", err);
      alert("Delete playlist failed");
    }
  };

  /* ---------------- Upload audio into playlist ---------------- */
  const uploadAudio = async (e) => {
    e.preventDefault();
    if (!pid || !form.audio) {
      alert("Select playlist and choose an audio file first");
      return;
    }
    const fd = new FormData();
    fd.append("title", form.title || "Untitled");
    fd.append("artist", form.speaker || "");
    fd.append("externalUrl", form.externalUrl || "");
    fd.append("locked", String(form.locked));
    fd.append("audio", form.audio);

    try {
      const resp = await fetch(`${API_BASE}/podcasts/playlists/${pid}/items`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      if (!resp.ok) throw new Error(await resp.text());
      setForm({
        title: "",
        speaker: "",
        externalUrl: "",
        locked: true,
        audio: null,
      });
      await load();
    } catch (err) {
      console.error("[AdminPodcast] upload failed:", err);
      alert("Upload audio failed");
    }
  };

  const deleteItem = async (iid) => {
    if (!window.confirm("Delete this audio item?")) return;
    try {
      const resp = await fetch(
        `${API_BASE}/podcasts/playlists/${pid}/items/${iid}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );
      if (!resp.ok) throw new Error(await resp.text());
      await load();
    } catch (err) {
      console.error("[AdminPodcast] delete item failed:", err);
      alert("Delete audio failed");
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="space-y-6">
      <h2 className="font-bold text-lg">Manage Podcasts</h2>

      {/* Create playlist */}
      <form onSubmit={createPlaylist} className="flex gap-2">
        <input
          className="border rounded p-2 flex-1"
          placeholder="New playlist name"
          value={newPlName}
          onChange={(e) => setNewPlName(e.target.value)}
        />
        <button className="bg-black text-white px-3 rounded">Add</button>
      </form>

      {/* List playlists */}
      <div className="space-y-2">
        {playlists.map((p) => (
          <div
            key={p.id}
            className={`p-2 border rounded flex items-center justify-between ${
              pid === p.id ? "bg-gray-50" : ""
            }`}
          >
            <button
              className="font-medium"
              onClick={() => setPid(p.id)}
              title="Select"
            >
              {p.title || p.name}
            </button>
            <button
              className="text-xs text-red-600"
              onClick={() => deletePlaylist(p.id)}
            >
              Delete
            </button>
          </div>
        ))}
        {playlists.length === 0 && (
          <div className="text-sm text-gray-500">No playlists yet</div>
        )}
      </div>

      {/* Upload audio into selected playlist */}
      {pid && (
        <form onSubmit={uploadAudio} className="space-y-2 border-t pt-3">
          <h3 className="font-semibold text-sm">Add audio to playlist</h3>
          <input
            className="border rounded p-2 w-full"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="border rounded p-2 w-full"
            placeholder="Speaker (optional)"
            value={form.speaker}
            onChange={(e) => setForm({ ...form, speaker: e.target.value })}
          />
          <input
            className="border rounded p-2 w-full"
            placeholder="External audio URL (optional)"
            value={form.externalUrl}
            onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.locked}
              onChange={(e) => setForm({ ...form, locked: e.target.checked })}
            />
            Locked (requires access)
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setForm({ ...form, audio: e.target.files[0] })}
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Upload
          </button>
        </form>
      )}

      {/* Show current playlist items */}
      {pid &&
        playlists
          .find((pl) => pl.id === pid)
          ?.items?.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between border rounded p-2 mt-2"
            >
              <div>
                <div className="text-sm font-medium">{it.title}</div>
                <div className="text-xs text-gray-500">{it.artist}</div>
              </div>
              <button
                className="text-xs text-red-600"
                onClick={() => deleteItem(it.id)}
              >
                Delete
              </button>
            </div>
          ))}
    </div>
  );
}
