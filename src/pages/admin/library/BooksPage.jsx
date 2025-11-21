// src/pages/admin/library/BooksPage.jsx
import React, { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";

/* ------------------------------------------------------------
   ✅ API CONSTANTS
------------------------------------------------------------ */
const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000")
    .replace(/\/$/, "")}/api`;

// 🔑 must match process.env.ADMIN_PANEL_KEY on the server
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_PANEL_KEY || "";

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

  /* ------------------------------------------------------------
     Load existing books (public endpoint)
  ------------------------------------------------------------ */
  async function loadBooks() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/library/books`);
      const json = await res.json();
      setBooks(json.data || []);
    } catch (err) {
      console.error("Load books error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBooks();
  }, []);

  /* ------------------------------------------------------------
     Signed URL from server → Cloudflare R2
  ------------------------------------------------------------ */
  async function getUploadUrl(file) {
    const res = await fetch(
      `${API_BASE}/library/upload-url?filename=${encodeURIComponent(
        file.name
      )}&type=${encodeURIComponent(file.type)}`
    );
    const json = await res.json();
    if (!json.success) {
      console.error("Signed URL error:", json);
      throw new Error("Failed to get signed URL");
    }
    return json; // { success, uploadUrl, fileUrl }
  }

  async function uploadToR2(uploadUrl, file) {
    const put = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!put.ok) {
      console.error("R2 PUT error:", put.status, await put.text());
      throw new Error("R2 upload failed");
    }
  }

  /* ------------------------------------------------------------
     Upload book (PDF + cover → R2, then metadata → API)
  ------------------------------------------------------------ */
  async function uploadBook() {
    try {
      if (!form.title || !form.pdf || !form.cover) {
        alert("Title, PDF and Cover are required");
        return;
      }

      // 1) Get signed URLs
      const pdfInfo = await getUploadUrl(form.pdf);
      const coverInfo = await getUploadUrl(form.cover);

      // 2) Upload files to R2
      await uploadToR2(pdfInfo.uploadUrl, form.pdf);
      await uploadToR2(coverInfo.uploadUrl, form.cover);

      // 3) Create book via admin API
      const payload = {
        title: form.title,
        author: form.author,
        description: form.description,
        free: form.free,
        price: form.free ? 0 : form.price,
        pdfUrl: pdfInfo.fileUrl,
        coverUrl: coverInfo.fileUrl,
      };

      const res = await fetch(`${API_BASE}/admin/library/create`, {
        method: "POST",
        credentials: "include", // send cookies if any
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": ADMIN_TOKEN, // ⭐ MUST MATCH server ADMIN_PANEL_KEY
        },
        body: JSON.stringify(payload),
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

      // Reload list
      loadBooks();
    } catch (err) {
      console.error("Upload error:", err);
      alert(err.message || "Upload failed");
    }
  }

  /* ------------------------------------------------------------
     Delete book (admin)
  ------------------------------------------------------------ */
  async function deleteBook(id) {
    if (!confirm("Delete book?")) return;

    try {
      const res = await fetch(`${API_BASE}/admin/library/delete/${id}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "x-admin-token": ADMIN_TOKEN,
        },
      });
      const json = await res.json();

      if (json.success) {
        loadBooks();
      } else {
        alert(json.message || "Delete failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete failed");
    }
  }

  /* ------------------------------------------------------------
     UI
  ------------------------------------------------------------ */
  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      <AdminSidebar />

      <div className="flex-1 p-6">
        <h1 className="text-xl font-bold mb-6">📚 Upload Books</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload form */}
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
                onChange={(e) =>
                  setForm({ ...form, free: e.target.checked })
                }
              />
              Free Book
            </label>

            {!form.free && (
              <input
                className="w-full p-2 mb-2 bg-slate-700 rounded"
                type="number"
                placeholder="Price"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
              />
            )}

            <label className="block mb-2 text-sm">
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

          {/* Books list */}
          <div className="lg:col-span-2 p-4 bg-slate-800 rounded border border-slate-700">
            <h2 className="font-semibold text-lg mb-3">Uploaded Books</h2>

            {loading ? (
              <p>Loading...</p>
            ) : books.length === 0 ? (
              <p>No books uploaded</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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

                    {b.pdfUrl && (
                      <a
                        href={b.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-300 underline mt-1"
                      >
                        Preview PDF
                      </a>
                    )}

                    <button
                      onClick={() => deleteBook(b._id)}
                      className="mt-3 bg-red-600 hover:bg-red-700 w-full py-1 rounded text-sm"
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
