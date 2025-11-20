import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";

/* ------------------------------------------------------------
   ✅ Standardized API constants for admin
------------------------------------------------------------ */
const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(
    /\/$/,
    ""
  )}/api`;

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

    // ✅ API_BASE already has /api
    fetch(`${API_BASE}/library/books`)
      .then((r) => r.json())
      .then((json) => setBooks(json.data || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadBooks();
  }, []);

  /* Signed URL from server */
  async function getUploadUrl(file) {
    const url = `${API_BASE}/library/upload-url?filename=${encodeURIComponent(
      file.name
    )}&type=${encodeURIComponent(file.type)}`;

    const res = await fetch(url);
    const json = await res.json();

    if (!json.success) {
      console.error("Signed URL error:", json);
      throw new Error("Failed to get signed URL");
    }

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

      // 🔥 Step 1: get signed URLs
      const pdfInfo = await getUploadUrl(form.pdf);
      const coverInfo = await getUploadUrl(form.cover);

      // 🔥 Step 2: upload files directly to R2
      await uploadToR2(pdfInfo.uploadUrl, form.pdf);
      await uploadToR2(coverInfo.uploadUrl, form.cover);

      // 🔥 Step 3: create book metadata
      const res = await fetch(`${API_BASE}/library/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          author: form.author,
          description: form.description,
          free: form.free,
          price: form.free ? 0 : form.price,
          pdfUrl: pdfInfo.fileUrl,
          coverUrl: coverInfo.fileUrl,
        }),
      });

      const json = await res.json();
      if (!json.success) return alert(json.message || "Create failed");

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

    const res = await fetch(`${API_BASE}/library/delete/${id}`);
    const json = await res.json();

    if (json.success) loadBooks();
    else alert(json.message);
  }

  // ... ⬇️ keep the rest of your JSX exactly as it was (no changes needed)
