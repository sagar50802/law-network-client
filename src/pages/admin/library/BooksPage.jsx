// src/pages/admin/library/BooksPage.jsx

import { useState, useEffect } from "react";
import { getJSON } from "../../../utils/api"; // postForm no longer needed
import AdminSidebar from "./AdminSidebar";

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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

  /* ---------------- Helpers for R2 direct upload ---------------- */

  // 1️⃣ Get signed upload URL + final public file URL from backend
  const getR2UploadInfo = async (file) => {
    const params = new URLSearchParams({
      filename: file.name,
      type: file.type || "application/octet-stream",
    });

    const res = await getJSON(`/api/library/upload-url?${params.toString()}`);

    if (!res || !res.success) {
      console.error("[BooksPage] getR2UploadInfo error:", res);
      throw new Error(res?.message || "Failed to get upload URL");
    }

    // { success, uploadUrl, fileUrl }
    return res;
  };

  // 2️⃣ Upload a file directly to R2 using the signed URL
  const uploadFileToR2 = async (file, uploadUrl) => {
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
    });

    if (!putRes.ok) {
      const text = await putRes.text().catch(() => "");
      console.error("[BooksPage] R2 PUT error:", putRes.status, text);
      throw new Error("Failed to upload file to storage");
    }
  };

  /* ---------------- Upload a new book (direct to R2) ---------------- */
  const uploadBook = async () => {
    if (!form.title || !form.pdf || !form.cover) {
      alert("Title, PDF and Cover are required.");
      return;
    }

    setUploading(true);

    try {
      // 1) Ask backend for signed URLs for both files
      const [pdfInfo, coverInfo] = await Promise.all([
        getR2UploadInfo(form.pdf),
        getR2UploadInfo(form.cover),
      ]);

      // 2) Upload actual file bytes directly to R2
      await Promise.all([
        uploadFileToR2(form.pdf, pdfInfo.uploadUrl),
        uploadFileToR2(form.cover, coverInfo.uploadUrl),
      ]);

      // 3) Tell backend to create the book record with the R2 URLs
      const payload = {
        title: form.title,
        author: form.author,
        description: form.description,
        free: form.free,
        price: form.price,
        pdfUrl: pdfInfo.fileUrl,
        coverUrl: coverInfo.fileUrl,
      };

      const res = await fetch("/api/library/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

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
        // reset file inputs visually
        const pdfInput = document.getElementById("book-pdf-input");
        const coverInput = document.getElementById("book-cover-input");
        if (pdfInput) pdfInput.value = "";
        if (coverInput) coverInput.value = "";
        loadBooks();
      } else {
        console.error("[BooksPage] create-book error:", res);
        alert(res?.message || "Failed to save book in database.");
      }
    } catch (err) {
      console.error("[BooksPage] uploadBook error:", err);
      alert(err.message || "Upload failed (storage / server error).");
    } finally {
      setUploading(false);
    }
  };

  /* ---------------- Delete a book ---------------- */
  const deleteBook = async (id) => {
    if (!confirm("Delete this book?")) return;

    try {
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
                id="book-pdf-input"
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
                id="book-cover-input"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setForm({ ...form, cover: e.target.files?.[0] || null })
                }
              />
            </label>

            <button
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={uploadBook}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload Book"}
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
