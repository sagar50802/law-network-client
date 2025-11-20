// src/pages/admin/library/BooksPage.jsx
import React, { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";

/* API BASE */
const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000")
    .replace(/\/$/, "")}/api`;

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

  useEffect(() => {
    loadBooks();
  }, []);

  /* Load all books */
  async function loadBooks() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/library/books`);
      const json = await res.json();
      setBooks(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  /* Get R2 upload URL */
  async function getUploadUrl(file) {
    const r = await fetch(
      `${API_BASE}/library/upload-url?filename=${encodeURIComponent(
        file.name
      )}&type=${encodeURIComponent(file.type)}`
    );
    const json = await r.json();
    if (!json.success) throw new Error("Failed to get signed URL");
    return json;
  }

  /* Upload file to R2 */
  async function uploadR2(uploadUrl, file) {
    const r = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!r.ok) throw new Error("R2 upload failed");
  }

  /* Upload Book */
  async function uploadBook() {
    try {
      if (!form.title || !form.pdf || !form.cover) {
        alert("Title, PDF, and Cover are required");
        return;
      }

      // Signed URLs
      const pdfInfo = await getUploadUrl(form.pdf);
      const coverInfo = await getUploadUrl(form.cover);

      // Upload to R2
      await uploadR2(pdfInfo.uploadUrl, form.pdf);
      await uploadR2(coverInfo.uploadUrl, form.cover);

      // Admin create book — MUST include credentials
      const res = await fetch(`${API_BASE}/admin/library/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          author: form.author,
          description: form.description,
          free: form.free,
          price: form.free ? 0 : Number(form.price),
          pdfUrl: pdfInfo.fileUrl,
          coverUrl: coverInfo.fileUrl,
        }),
      });

      const json = await res.json();
      if (!json.success) return alert(json.message);

      alert("Book uploaded!");
      loadBooks();

      setForm({
        title: "",
        author: "",
        description: "",
        free: true,
        price: "",
        pdf: null,
        cover: null,
      });
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  async function deleteBook(id) {
    if (!confirm("Delete book?")) return;

    const res = await fetch(`${API_BASE}/library/delete/${id}`, {
      method: "GET",
      credentials: "include",
    });

    const json = await res.json();
    if (json.success) loadBooks();
    else alert(json.message);
  }

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      <AdminSidebar />

      <div className="flex-1 p-6">
        <h1 className="text-xl font-bold mb-6">📚 Upload Books</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Form */}
          <div className="p-4 bg-slate-800 rounded border border-slate-700">
            <h2 className="font-semibold text-lg mb-3">Upload New Book</h2>

            <input
              className="w-full p-2 mb-2 bg-slate-700 rounded"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <input
              className="w-full p-2 mb-2 bg-slate-700 rounded"
              placeholder="Author"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />

            <textarea
              className="w-full p-2 mb-2 bg-slate-700 rounded"
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />

            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={form.free}
                onChange={(e) => setForm({ ...form, free: e.target.checked })}
              />
              Free Book
            </label>

            {!form.free && (
              <input
                className="w-full p-2 mb-2 bg-slate-700 rounded"
                type="number"
                placeholder="Price"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            )}

            <label className="block mb-3 text-sm">
              PDF:
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) =>
                  setForm({ ...form, pdf: e.target.files[0] || null })
                }
              />
            </label>

            <label className="block mb-4 text-sm">
              Cover:
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setForm({ ...form, cover: e.target.files[0] || null })
                }
              />
            </label>

            <button
              onClick={uploadBook}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              Upload Book
            </button>
          </div>

          {/* Books List */}
          <div className="lg:col-span-2 p-4 bg-slate-800 rounded border border-slate-700">
            <h2 className="font-semibold text-lg mb-3">Uploaded Books</h2>

            {loading ? (
              <p>Loading...</p>
            ) : books.length === 0 ? (
              <p>No books uploaded</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.map((b) => (
                  <div
                    key={b._id}
                    className="bg-slate-700 p-3 rounded flex flex-col"
                  >
                    <img
                      src={b.coverUrl}
                      alt={b.title}
                      className="w-full h-40 object-cover rounded"
                    />

                    <h3 className="mt-2 font-bold">{b.title}</h3>
                    <p className="text-sm text-slate-300">{b.author}</p>

                    <button
                      onClick={() => deleteBook(b._id)}
                      className="mt-auto bg-red-600 px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
