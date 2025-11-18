// src/pages/admin/library/BooksPage.jsx

import { useState, useEffect } from "react";
import { getJSON } from "../../../utils/api";
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

  /* ---------------- LOAD BOOKS ---------------- */
  const loadBooks = () => {
    setLoading(true);

    getJSON("/api/library/books")
      .then((r) => {
        setBooks(r?.data || []);
      })
      .catch((err) => console.error("Load books error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBooks();
  }, []);

  /* ---------------- HELPERS ---------------- */

  // Request a signed URL from backend
  const getSignedUrl = async (file) => {
    const query = new URLSearchParams({
      filename: file.name,
      type: file.type,
    });

    const res = await fetch(`/api/library/upload-url?${query.toString()}`);
    const json = await res.json();

    if (!json.success) throw new Error(json.message || "Failed to get upload URL");

    return json; // { uploadUrl, fileUrl }
  };

  // Upload file directly to R2 using PUT
  const uploadToR2 = async (uploadUrl, file) => {
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!put.ok) throw new Error("Upload to R2 failed");
  };

  /* ---------------- UPLOAD BOOK ---------------- */
  const uploadBook = async () => {
    try {
      if (!form.title || !form.pdf || !form.cover) {
        alert("Title, PDF and Cover are required");
        return;
      }

      // 1) Get signed URLs
      const pdfSigned = await getSignedUrl(form.pdf);
      const coverSigned = await getSignedUrl(form.cover);

      // 2) Upload both files directly → R2
      await uploadToR2(pdfSigned.uploadUrl, form.pdf);
      await uploadToR2(coverSigned.uploadUrl, form.cover);

      // 3) Save metadata to backend
      const res = await fetch("/api/library/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          author: form.author,
          description: form.description,
          free: form.free,
          price: form.price,
          pdfUrl: pdfSigned.fileUrl,
          coverUrl: coverSigned.fileUrl,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        alert(json.message || "Create failed");
        return;
      }

      alert("Book uploaded!");

      // Reset form
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
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed. Check console.");
    }
  };

  /* ---------------- DELETE BOOK ---------------- */
  const deleteBook = async (id) => {
    if (!confirm("Delete this book?")) return;

    try {
      const res = await getJSON(`/api/library/delete/${id}`);
      if (res?.success) loadBooks();
      else alert(res?.message || "Delete failed");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete failed");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      <AdminSidebar />

      <div className="flex-1 p-6">
        <h1 className="text-xl font-bold mb-6">📚 Upload Books</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT PANEL */}
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
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={form.free}
                onChange={(e) => setForm({ ...form, free: e.target.checked })}
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
                onChange={(e) => setForm({ ...form, pdf: e.target.files?.[0] || null })}
              />
            </label>

            <label className="block mb-4">
              Cover Image:
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setForm({ ...form, cover: e.target.files?.[0] || null })}
              />
            </label>

            <button
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
              onClick={uploadBook}
            >
              Upload Book
            </button>
          </div>

          {/* RIGHT PANEL */}
          <div className="lg:col-span-2 p-4 bg-slate-800 rounded border border-slate-700">
            <h2 className="font-semibold text-lg mb-3">Uploaded Books</h2>

            {loading && <p>Loading...</p>}

            {!loading && books.length === 0 && (
              <p className="text-gray-400">No books uploaded yet.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((b) => (
                <div key={b._id} className="p-3 bg-slate-700 rounded shadow flex flex-col">
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
