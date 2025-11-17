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

  const loadBooks = () => {
    setLoading(true);
    getJSON("/api/library/books")
      .then((r) => setBooks(r.books || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const uploadBook = async () => {
    if (!form.title || !form.pdf || !form.cover) {
      alert("Title, PDF and Cover are required.");
      return;
    }

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("author", form.author);
    fd.append("description", form.description);
    fd.append("free", form.free);
    fd.append("price", form.price);
    fd.append("pdf", form.pdf);
    fd.append("cover", form.cover);

    const res = await postForm("/api/admin/library/upload", fd)

    if (res.success) {
      alert("Book uploaded!");
      loadBooks();
    } else {
      alert("Upload failed");
    }
  };

  const deleteBook = async (id) => {
    if (!confirm("Delete?")) return;

    const res = await getJSON(`/api/library/delete/${id}`);
    if (res.success) {
      loadBooks();
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
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <input
              className="w-full p-2 rounded bg-slate-700 mb-2"
              placeholder="Author"
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />

            <textarea
              className="w-full p-2 rounded bg-slate-700 mb-2"
              placeholder="Description"
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
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
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            )}

            <label className="block mb-2">
              PDF File:
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) =>
                  setForm({ ...form, pdf: e.target.files[0] })
                }
              />
            </label>

            <label className="block mb-4">
              Cover Image:
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setForm({ ...form, cover: e.target.files[0] })
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
                  <img
                    src={b.coverUrl}
                    className="w-full h-40 object-cover rounded"
                  />
                  <h3 className="font-bold mt-2">{b.title}</h3>
                  <p className="text-sm mb-2">{b.author}</p>

                  <a
                    href={b.pdfUrl}
                    target="_blank"
                    className="text-blue-300 underline mb-2"
                  >
                    Preview PDF
                  </a>

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
