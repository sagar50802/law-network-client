// client/src/components/Admin/AdminBannerEditor.jsx
import { useEffect, useState } from "react";
import {
  getJSON,
  upload,
  deleteJSON,
  absUrl,
  authHeaders,
} from "../../utils/api";

export default function AdminBannerEditor() {
  const [banners, setBanners] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const r = await getJSON("/banners", { headers: authHeaders() });
      const arr = Array.isArray(r)
        ? r
        : r?.banners || r?.items || r?.data || [];
      setBanners(arr);
    } catch (e) {
      console.error(e);
      setError("Failed to load banners");
      setBanners([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onFile(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  }

  async function onUpload() {
    if (!file && !url) return alert("Choose a file or paste a URL");

    const fd = new FormData();
    fd.append("title", title || "Untitled");
    fd.append("link", link || "");

    if (file) {
      fd.append("file", file); // server expects "file"
    } else {
      fd.append("url", url);
      fd.append("type", url.toLowerCase().endsWith(".mp4") ? "video" : "image");
    }

    try {
      setBusy(true);
      await upload("/banners", fd, { headers: authHeaders() });
      setTitle("");
      setLink("");
      setUrl("");
      setFile(null);
      setPreview("");
      await load();
      alert("✅ Uploaded");
    } catch (err) {
      alert("Upload failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function onDel(id) {
    if (!id) return;
    if (!confirm("Delete this banner?")) return;
    try {
      setBusy(true);
      await deleteJSON(`/banners/${encodeURIComponent(id)}`, {
        headers: authHeaders(),
      });
      await load();
    } catch (err) {
      alert("Delete failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload form */}
      <div className="flex flex-wrap gap-2">
        <input
          className="border p-2 rounded flex-1"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
        <input
          className="border p-2 rounded flex-1"
          placeholder="Optional link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          disabled={busy}
        />
        <input
          type="file"
          accept="image/*,video/*"
          onChange={onFile}
          disabled={busy}
        />
        <input
          className="border p-2 rounded flex-1"
          placeholder="Or paste image/video URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
        />
        <button
          onClick={onUpload}
          className="bg-black text-white px-3 rounded disabled:opacity-60"
          disabled={busy}
        >
          Upload
        </button>
      </div>

      {/* File preview */}
      {preview &&
        (file?.type?.startsWith("video") ? (
          <video src={preview} controls className="w-48 rounded" />
        ) : (
          <img src={preview} className="w-48 rounded" alt="preview" />
        ))}

      {/* Banner list */}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {banners.map((b) => (
          <li
            key={b._id || b.id}
            className="p-3 border rounded space-y-2 bg-white"
          >
            <div className="font-medium">{b.title}</div>
            {b.type === "video" ? (
              <video src={absUrl(b.url)} controls className="w-full rounded" />
            ) : (
              <img src={absUrl(b.url)} className="w-full rounded" alt="" />
            )}
            <div className="flex justify-between items-center">
              {b.link && (
                <a
                  href={b.link}
                  className="text-blue-600 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  open
                </a>
              )}
              <button
                onClick={() => onDel(b._id || b.id)}
                className="text-red-600 text-sm"
                disabled={busy}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {banners.length === 0 && (
          <li className="text-gray-400">No banners yet</li>
        )}
      </ul>

      {error && (
        <div className="text-sm whitespace-pre-wrap text-red-600">{error}</div>
      )}
    </div>
  );
}
