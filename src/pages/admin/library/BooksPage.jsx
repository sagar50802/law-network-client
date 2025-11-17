// src/pages/admin/library/BooksPage.jsx

import { useState, useEffect } from "react";
import { getJSON, postForm } from "../../../utils/api";
import AdminSidebar from "./AdminSidebar";

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    author: "",
    description: "",
    free: true,
    price: "",
    pdf: null,
    cover: null,
  });

  /* ---------------- Load existing books ---------------- */
  const loadBooks = () => {
    setLoading(true);

    getJSON("/api/library/books")
      .then((r) => setBooks(r.data || r.books || [])) // backend returns { success, data: [...] }
      .catch((err) => {
        console.error("[BooksPage] loadBooks error:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBooks();
  }, []);

  /* ---------------- Upload a new book ---------------- */
  const uploadBook = async () => {
    if (!form.title || !form.pdf || !form.cover) {
      alert("Title, PDF and Cover are required.");
      return;
    }

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("author", form.author);
    fd.append("description", form.description);
    fd.append("free", form.free); // backend uses String(free) === "true"
    fd.append("price", form.price);
    fd.append("pdf", form.pdf);
    fd.append("cover", form.cover);

    try {
      // ✅ MUST MATCH routes/library.js -> router.post("/upload", ...)
      const res = await postForm("/api/library/upload", fd);

      if (res?.success) {
        alert("Book uploaded!");
        setForm({
          title: "",
          author: "",
          description: "",
          free: true,
          price: "",
          pdf: null,
          cover: null,
        });
        loadBooks();
      } else {
        console.error("[BooksPage] upload error response:", res);
        alert(res?.message || "Upload failed");
      }
    } catch (err) {
      console.error("[BooksPage] uploadBook error:", err);
      alert("Upload failed (network/server error).");
    }
  };

  /* ---------------- Delete a book (TODO backend route) ---------------- */
  const deleteBook = async (id) => {
    if (!confirm("Delete this book?")) return;

    try {
      // ⚠ Currently your backend does NOT have /api/library/delete/:id.
      // When you add that route on the server, this will start working.
      const res = await getJSON(`/api/library/delete/${id}`);
      if (res?.success) {
        loadBooks();
      } else {
        alert(res?.message || "Delete failed");
      }
    } catch (err) {
      console.error("[BooksPage] deleteBook error:", err);
      alert("Delete failed (network/server error).");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      <AdminSidebar />

      <div className="flex-1 p-6">
        <h1 className="text-xl font-bold mb-6">📚 Upload Books</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT PANEL - Upload form */}
          <div className="p-4 bg-slate-800 rounded border border-slate-700">
            <h2 className="font-semibold text-lg mb-3">Upload New Book</h2>

            <input
              className="w-full p-2 rounded bg-slate-700 mb-2"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <input
              className="w-full p-2 rounded bg-slate-700 mb-2"
              placeholder="Author"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />

            <textarea
              className="w-full p-2 rounded bg-slate-700 mb-2"
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />

            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={form.free}
                onChange={(e) =>
                  setForm({ ...form, free: e.target.checked })
                }
              />
              Free Book
            </label>

            {!form.free && (
              <input
                type="number"
                className="w-full p-2 rounded bg-slate-700 mb-2"
                placeholder="Price"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            )}

            <label className="block mb-2">
              PDF File:
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) =>
                  setForm({ ...form, pdf: e.target.files?.[0] || null })
                }
              />
            </label>

            <label className="block mb-4">
              Cover Image:
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setForm({ ...form, cover: e.target.files?.[0] || null })
                }
              />
            </label>

            <button
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
              onClick={uploadBook}
            >
              Upload Book
            </button>
          </div>

          {/* RIGHT PANEL - Books list */}
          <div className="lg:col-span-2 p-4 bg-slate-800 rounded border border-slate-700">
            <h2 className="font-semibold text-lg mb-3">Uploaded Books</h2>

            {loading && <p>Loading...</p>}

            {!loading && books.length === 0 && (
              <p className="text-gray-400">No books uploaded yet.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((b) => (
                <div
                  key={b._id}
                  className="p-3 bg-slate-700 rounded shadow flex flex-col"
                >
                  {b.coverUrl && (
                    <img
                      src={b.coverUrl}
                      alt={b.title}
                      className="w-full h-40 object-cover rounded"
                    />
                  )}

                  <h3 className="font-bold mt-2">{b.title}</h3>
                  <p className="text-sm mb-2">{b.author}</p>

                  {b.pdfUrl && (
                    <a
                      href={b.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-300 underline mb-2"
                    >
                      Preview PDF
                    </a>
                  )}

                  <button
                    className="mt-auto px-3 py-1 bg-red-600 rounded hover:bg-red-700"
                    onClick={() => deleteBook(b._id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
