import { useState, useEffect } from "react";
import { getJSON } from "../../../utils/api";
import AdminSidebar from "./AdminSidebar";

// Backend root
const API =
  import.meta.env.VITE_API || "https://law-network.onrender.com";

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

  /* ---------------- Load Books ---------------- */
  const loadBooks = () => {
    setLoading(true);

    fetch(`${API}/api/library/books`)
      .then((r) => r.json())
      .then((json) => setBooks(json.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBooks();
  }, []);

  /* ---------------- Get Signed URL ---------------- */
  async function getUploadUrl(file) {
    const url = `${API}/api/library/upload-url?filename=${encodeURIComponent(
      file.name
    )}&type=${encodeURIComponent(file.type)}`;

    const res = await fetch(url);
    const json = await res.json();

    if (!json.success) throw new Error("Failed to get signed upload URL");

    return json;
  }

  /* ---------------- Upload File to R2 ---------------- */
  async function uploadToR2(uploadUrl, file) {
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!putRes.ok) {
      console.error("PUT ERROR:", await putRes.text());
      throw new Error("Failed uploading file to R2");
    }
  }

  /* ---------------- Upload Book ---------------- */
  const uploadBook = async () => {
    try {
      if (!form.title || !form.pdf || !form.cover) {
        alert("Title, PDF and Cover are required");
        return;
      }

      // 1️⃣ Request signed URLs
      const pdfInfo = await getUploadUrl(form.pdf);
      const coverInfo = await getUploadUrl(form.cover);

      // 2️⃣ Upload files directly
      await uploadToR2(pdfInfo.uploadUrl, form.pdf);
      await uploadToR2(coverInfo.uploadUrl, form.cover);

      // 3️⃣ Save metadata
      const metaRes = await fetch(`${API}/api/library/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          author: form.author,
          description: form.description,
          free: form.free,
          price: form.price,
          pdfUrl: pdfInfo.fileUrl,
          coverUrl: coverInfo.fileUrl,
        }),
      });

      const metaJson = await metaRes.json();
      if (!metaJson.success) {
        alert(metaJson.message || "Failed to save book");
        return;
      }

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
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    }
  };

  /* ---------------- Delete Book ---------------- */
  async function deleteBook(id) {
    if (!confirm("Delete this book?")) return;

    const r = await fetch(`${API}/api/library/delete/${id}`);
    const json = await r.json();
    if (json.success) loadBooks();
    else alert(json.message || "Delete failed");
  }

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
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
            />

            <input
              className="w-full p-2 rounded bg-slate-700 mb-2"
              placeholder="Author"
              value={form.author}
              onChange={(e) =>
                setForm({ ...form, author: e.target.value })
              }
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
                className="w-full p-2 rounded bg-slate-700 mb-2"
                type="number"
                placeholder="Price"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
              />
            )}

            <label className="block mb-2">
              PDF:
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) =>
                  setForm({ ...form, pdf: e.target.files[0] })
                }
              />
            </label>

            <label className="block mb-4">
              Cover:
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

          {/* RIGHT PANEL */}
          <div className="lg:col-span-2 p-4 bg-slate-800 rounded border border-slate-700">
            <h2 className="font-semibold text-lg mb-3">Uploaded Books</h2>

            {loading ? (
              <p>Loading...</p>
            ) : books.length === 0 ? (
              <p>No books uploaded yet</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.map((b) => (
                  <div
                    key={b._id}
                    className="bg-slate-700 p-3 rounded flex flex-col"
                  >
                    <img
                      src={b.coverUrl}
                      className="w-full h-40 object-cover rounded"
                    />
                    <h3 className="font-bold mt-2">{b.title}</h3>
                    <p className="text-sm text-slate-300 mb-2">
                      {b.author}
                    </p>

                    <a
                      href={b.pdfUrl}
                      target="_blank"
                      className="text-blue-300 underline mb-2"
                    >
                      Preview PDF
                    </a>

                    <button
                      className="mt-auto bg-red-600 px-3 py-1 rounded"
                      onClick={() => deleteBook(b._id)}
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
