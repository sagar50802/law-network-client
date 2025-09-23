// client/src/components/Admin/AdminArticleEditor.jsx
import { useEffect, useState } from "react";
import {
  getJSON,
  postJSON,
  deleteJSON,
  authHeaders,
} from "../../utils/api";

export default function AdminArticleEditor() {
  const [articles, setArticles] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const r = await getJSON("/articles", { headers: authHeaders() });
      setArticles(Array.isArray(r?.articles) ? r.articles : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load articles");
      setArticles([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addArticle(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return alert("Title and content required");

    try {
      setBusy(true);
      await postJSON(
        "/articles",
        { title, content, image, link },
        { headers: authHeaders() }
      );
      setTitle("");
      setContent("");
      setImage("");
      setLink("");
      await load();
    } catch (err) {
      alert("Create article failed: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteArticle(id) {
    if (!id) return;
    if (!confirm("Delete this article?")) return;

    try {
      setBusy(true);
      await deleteJSON(`/articles/${encodeURIComponent(id)}`, {
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
      {/* Create article form */}
      <form onSubmit={addArticle} className="space-y-2">
        <input
          className="border p-2 rounded w-full"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
        <textarea
          className="border p-2 rounded w-full h-32"
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={busy}
        />
        <input
          className="border p-2 rounded w-full"
          placeholder="Image URL (optional)"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          disabled={busy}
        />
        <input
          className="border p-2 rounded w-full"
          placeholder="External link (optional)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          className="bg-black text-white px-3 rounded disabled:opacity-60"
          disabled={busy}
        >
          Add Article
        </button>
      </form>

      {/* Article list */}
      <div className="space-y-2">
        <h4 className="font-semibold">Articles</h4>
        <ul className="space-y-2">
          {articles.map((a) => (
            <li
              key={a._id || a.id}
              className="border rounded p-2 flex items-center justify-between"
            >
              <div className="truncate">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-gray-500">
                  {a.link || "No external link"}
                </div>
              </div>
              <button
                className="text-red-600 text-sm"
                onClick={() => deleteArticle(a._id || a.id)}
                disabled={busy}
              >
                Delete
              </button>
            </li>
          ))}
          {articles.length === 0 && (
            <li className="text-gray-400">No articles yet</li>
          )}
        </ul>
      </div>

      {error && (
        <div className="text-sm whitespace-pre-wrap text-red-600">{error}</div>
      )}
    </div>
  );
}
