// src/components/Admin/AdminPodcastEditor.jsx
import { useEffect, useState } from "react";
import { API_BASE, authHeaders, getJSON } from "../../utils/api";

export default function AdminPodcastEditor() {
  const [playlists, setPlaylists] = useState([]);
  const [newPl, setNewPl] = useState("");
  const [pid, setPid] = useState("");
  const [form, setForm] = useState({
    title: "",
    artist: "",
    url: "",
    audio: null,
    locked: true,
  });

  const load = async () => {
    const r = await getJSON(`${API_BASE}/podcasts`);
    setPlaylists(r.playlists || []);
    if (!pid && r.playlists?.length) setPid(r.playlists[0]._id || r.playlists[0].id);
  };

  useEffect(() => {
    load();
  }, []);

  const createPl = async (e) => {
    e.preventDefault();
    if (!newPl) return;
    const r = await fetch(`${API_BASE}/podcasts/playlists`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPl }),
    });
    if (!r.ok) alert("Create playlist failed");
    setNewPl("");
    await load();
  };

  const deletePl = async (id) => {
    if (!window.confirm("Delete this playlist?")) return;
    const r = await fetch(`${API_BASE}/podcasts/playlists/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!r.ok) alert("Delete playlist failed");
    await load();
  };

  const uploadAudio = async (e) => {
    e.preventDefault();
    if (!pid) return alert("Select a playlist first");
    if (!form.audio && !form.url) return alert("Choose file or URL");

    const fd = new FormData();
    fd.append("title", form.title || "Untitled");
    fd.append("artist", form.artist || "");
    fd.append("locked", String(form.locked));
    if (form.audio) fd.append("audio", form.audio);
    if (form.url) fd.append("url", form.url);

    const r = await fetch(`${API_BASE}/podcasts/playlists/${pid}/items`, {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    if (!r.ok) alert("Upload failed");
    setForm({ title: "", artist: "", url: "", audio: null, locked: true });
    await load();
  };

  return (
    <div className="p-4 space-y-4 border rounded">
      <h3 className="font-semibold">Manage Podcasts</h3>

      {/* create playlist */}
      <form onSubmit={createPl} className="flex gap-2">
        <input
          className="border rounded p-2 flex-1"
          placeholder="New playlist name"
          value={newPl}
          onChange={(e) => setNewPl(e.target.value)}
        />
        <button className="bg-black text-white px-3 rounded">Add Playlist</button>
      </form>

      {/* choose playlist */}
      <select
        className="border rounded p-2 w-full"
        value={pid || ""}
        onChange={(e) => setPid(e.target.value)}
      >
        <option value="">Select playlist…</option>
        {playlists.map((p) => (
          <option key={p._id || p.id} value={p._id || p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* upload audio */}
      <form onSubmit={uploadAudio} className="space-y-2">
        <input
          className="border rounded p-2 w-full"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          className="border rounded p-2 w-full"
          placeholder="Speaker (optional)"
          value={form.artist}
          onChange={(e) => setForm({ ...form, artist: e.target.value })}
        />
        <input
          className="border rounded p-2 w-full"
          placeholder="External audio URL (optional)"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
        />
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setForm({ ...form, audio: e.target.files[0] })}
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.locked}
            onChange={(e) => setForm({ ...form, locked: e.target.checked })}
          />
          Locked (requires access)
        </label>
        <button className="bg-blue-600 text-white px-4 py-1 rounded">Upload</button>
      </form>

      {/* list playlists with delete */}
      <div className="space-y-1">
        {playlists.map((p) => (
          <div key={p._id || p.id} className="flex items-center justify-between border p-2 rounded">
            <span>{p.name}</span>
            <button
              className="text-red-600 text-sm"
              onClick={() => deletePl(p._id || p.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
