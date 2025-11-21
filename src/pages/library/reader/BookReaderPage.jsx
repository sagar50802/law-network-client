import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";

// Load worker from local file (Vite-safe)
import "../../../pdf-worker";

/* ------------------------------------------------------------
   API CONSTANTS
------------------------------------------------------------ */
const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000")
    .replace(/\/$/, "")}/api`;

const API_ROOT = API_BASE.replace(/\/api\/?$/, "");

/* ------------------------------------------------------------
   SAFE PDF URL HANDLER — supports:
   - Cloudflare R2 links
   - Render absolute links
   - Backend static links (/uploads/..)
------------------------------------------------------------ */
function resolvePdfUrl(url) {
  if (!url) return null;

  url = String(url).trim();
  if (!url) return null;

  if (url.startsWith("http")) return url; // R2 or any full URL
  if (url.startsWith("/")) return API_ROOT + url; // backend file

  return `${API_ROOT}/${url.replace(/^\/+/, "")}`;
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

  /* ------------------------------------------------------------
     Load Book Metadata + PDF
  ------------------------------------------------------------ */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/library/books/${bookId}`);
        const json = await res.json();

        if (!json.success) {
          navigate("/library");
          return;
        }

        const data = json.data;
        setBook(data);

        const rawUrl = data.pdfUrl;
        if (!rawUrl || !String(rawUrl).trim()) {
          alert("This book has no PDF file.");
          navigate("/library");
          return;
        }

        const finalUrl = resolvePdfUrl(rawUrl);
        console.log("📄 Final resolved PDF URL:", finalUrl);

        await loadPDF(finalUrl);
      } catch (err) {
        console.error("Error loading PDF:", err);
        navigate("/library");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [bookId, navigate]);

  /* ------------------------------------------------------------
     Load PDF Document
  ------------------------------------------------------------ */
  async function loadPDF(url) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

      const task = pdfjsLib.getDocument({ url });
      const doc = await task.promise;

      setPdf(doc);
      setTotalPages(doc.numPages);

      await renderPage(1, doc);
    } catch (err) {
      console.error("PDF load error:", err);
      alert("Could not load PDF.");
    }
  }

  /* ------------------------------------------------------------
     Render a Page
  ------------------------------------------------------------ */
  async function renderPage(num, doc = pdf) {
    if (!doc) return;

    const page = await doc.getPage(num);
    const viewport = page.getViewport({ scale: 1.35 });

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    setPageNum(num);
  }

  const nextPage = () => {
    if (pageNum < totalPages) renderPage(pageNum + 1);
  };

  const prevPage = () => {
    if (pageNum > 1) renderPage(pageNum - 1);
  };

  /* ------------------------------------------------------------
     UI
  ------------------------------------------------------------ */
  if (loading) {
    return <div className="p-6 text-white">Loading PDF...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center pb-10">
      {/* HEADER */}
      <div className="w-full bg-gray-900 px-4 py-3 flex justify-between items-center">
        <h2 className="font-bold text-xl">{book?.title}</h2>

        <button
          onClick={() => navigate("/library")}
          className="bg-red-600 px-4 py-2 rounded"
        >
          Exit
        </button>
      </div>

      {/* PDF CANVAS */}
      <canvas ref={canvasRef} className="mt-6 rounded shadow-xl" />

      {/* CONTROLS */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={prevPage}
          disabled={pageNum <= 1}
          className="px-4 py-2 bg-gray-700 rounded disabled:opacity-40"
        >
          ← Prev
        </button>

        <span className="px-3 py-2 bg-gray-800 rounded">
          Page {pageNum} / {totalPages}
        </span>

        <button
          onClick={nextPage}
          disabled={pageNum >= totalPages}
          className="px-4 py-2 bg-gray-700 rounded disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
