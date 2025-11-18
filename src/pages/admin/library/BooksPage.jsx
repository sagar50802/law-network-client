import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";

const API =
  import.meta.env.VITE_API || "https://law-network-server.onrender.com";

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

  /* Load Books */
  function loadBooks() {
    setLoading(true);
    fetch(`${API}/api/library/books`)
      .then((r) => r.json())
      .then((json) => setBooks(json.data || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadBooks();
  }, []);

  /* Signed URL from server */
  async function getUploadUrl(file) {
    const url = `${API}/api/library/upload-url?filename=${encodeURIComponent(
      file.name
    )}&type=${encodeURIComponent(file.type)}`;

    const res = await fetch(url);
    const json = await res.json();

    if (!json.success) throw new Error("Failed to get signed URL");
    return json;
  }

  /* Upload to Cloudflare R2 */
  async function uploadToR2(uploadUrl, file) {
    const put = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!put.ok) throw new Error("R2 upload failed");
  }

  /* Upload Book */
  async function uploadBook() {
    try {
      if (!form.title || !form.pdf || !form.cover) {
        alert("Title, PDF & Cover required");
        return;
      }

      const pdfInfo = await getUploadUrl(form.pdf);
      const coverInfo = await getUploadUrl(form.cover);

      await uploadToR2(pdfInfo.uploadUrl, form.pdf);
      await uploadToR2(coverInfo.uploadUrl, form.cover);

      const res = await fetch(`${API}/api/library/create`, {
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

      const json = await res.json();
      if (!json.success) return alert(json.message);

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
  }

  async function deleteBook(id) {
    if (!confirm("Delete book?")) return;

    const res = await fetch(`${API}/api/library/delete/${id}`);
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
                      className="w-full h-40 object-cover rounded"
                    />

                    <h3 className="mt-2 font-bold">{b.title}</h3>
                    <p className="text-sm text-slate-300">{b.author}</p>

                    <a
                      className="text-blue-300 underline mt-1 mb-2"
                      href={b.pdfUrl}
                      target="_blank"
                    >
                      Preview PDF
                    </a>

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
