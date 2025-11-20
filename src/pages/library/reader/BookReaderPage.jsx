import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";

import "../../../pdf-worker";

// Correct backend root: MUST NOT include /api
const API =
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  import.meta.env.VITE_API?.replace(/\/api\/?$/, "") ||
  "https://law-network.onrender.com";

// Fix PDF URL building for R2
function resolvePdfUrl(url) {
  if (!url) return null;

  // Already full R2 URL
  if (url.startsWith("http")) return url;

  // Begins with / → attach domain
  if (url.startsWith("/")) return API + url;

  // Raw path (no /)
  return API + "/" + url;
}

export default function BookReaderPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState(null);
  const [pdf, setPdf] = useState(null);

  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const canvasRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        // FIX: use API without double /api
        const res = await fetch(`${API}/api/library/books/${bookId}`);
        const json = await res.json();

        if (!json.success) return navigate("/library");

        const data = json.data;
        setBook(data);

        const raw =
          data.pdfUrl ||
          data.pdf ||
          data.fileUrl ||
          data.file ||
          data.path ||
          null;

        if (!raw) {
          console.error("No PDF URL on book:", data);
          alert("This book has no PDF file.");
          return;
        }

        const finalUrl = resolvePdfUrl(raw);
        await loadPDF(finalUrl);
      } catch (err) {
        console.error("Reader load error:", err);
        setLoading(false);
      }
    }

    load();
  }, [bookId]);

  async function loadPDF(url) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

      // FIX: always pass { url }
      const task = pdfjsLib.getDocument({ url });
      const doc = await task.promise;

      setPdf(doc);
      setTotalPages(doc.numPages);

      await renderPage(1, doc);
      setLoading(false);
    } catch (err) {
      console.error("PDF load error:", err);
      setLoading(false);
    }
  }

  async function renderPage(num, doc = pdf) {
    if (!doc) return;

    const page = await doc.getPage(num);
    const viewport = page.getViewport({ scale: 1.35 });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    setPageNum(num);
  }

  const nextPage = () =>
    pageNum < totalPages && renderPage(pageNum + 1);

  const prevPage = () =>
    pageNum > 1 && renderPage(pageNum - 1);

  if (loading)
    return <div className="p-6 text-white">Loading PDF...</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center pb-10">

      <div className="w-full bg-gray-900 px-4 py-3 flex justify-between items-center">
        <h2 className="font-bold text-xl">{book?.title}</h2>

        <button
          onClick={() => navigate("/library")}
          className="bg-red-600 px-4 py-2 rounded"
        >
          Exit
        </button>
      </div>

      <canvas ref={canvasRef} className="mt-6 rounded shadow-xl" />

      <div className="flex gap-4 mt-6">
        <button
          onClick={prevPage}
          disabled={pageNum <= 1}
          className="px-4 py-2 bg-gray-700 rounded"
        >
          ← Prev
        </button>

        <span className="px-3 py-2 bg-gray-800 rounded">
          Page {pageNum} / {totalPages}
        </span>

        <button
          onClick={nextPage}
          disabled={pageNum >= totalPages}
          className="px-4 py-2 bg-gray-700 rounded"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
