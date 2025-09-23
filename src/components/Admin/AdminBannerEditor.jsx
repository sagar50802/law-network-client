import { useEffect, useState } from "react";
import { getJSON, upload, deleteJSON, absUrl, authHeaders } from "../../utils/api";

export default function AdminBannerEditor() {
  const [banners, setBanners] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState("");

  async function load() {
    try {
      const r = await getJSON("/banners", { headers: authHeaders() });
      setBanners(Array.isArray(r) ? r : r.banners || r.items || r.data || []);
    } catch (e) {
      console.error("❌ Failed to load banners", e);
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
      fd.append("file", file); // backend expects "file"
    } else {
      fd.append("url", url);
      fd.append("type", url.toLowerCase().endsWith(".mp4") ? "video" : "image");
    }

    try {
      await upload("/banners", fd, { headers: authHeaders() });
      setTitle("");
      setLink("");
      setUrl("");
      setFile(null);
      setPreview("");
      await load();
      alert("✅ Uploaded");
    } catch (err) {
      console.error("❌ Upload failed", err);
      alert("Upload failed, check console");
    }
  }

  async function onDel(id) {
    try {
      await deleteJSON(`/banners/${id}`, { headers: authHeaders() });
      await load();
    } catch (err) {
      console.error("❌ Delete failed", err);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          className="border p-2 rounded flex-1"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border p-2 rounded flex-1"
          placeholder="Optional link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <input type="file" accept="image/*,video/*" onChange={onFile} />
        <input
          className="border p-2 rounded flex-1"
          placeholder="Or paste image/video URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={onUpload}
          className="bg-black text-white px-3 rounded"
        >
          Upload
        </button>
      </div>

      {preview &&
        (file?.type?.startsWith("video") ? (
          <video src={preview} controls className="w-48 rounded" />
        ) : (
          <img src={preview} className="w-48 rounded" alt="preview" />
        ))}

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {banners.map((b) => (
          <li
            key={b._id || b.id}
            className="p-3 border rounded space-y-2"
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
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
