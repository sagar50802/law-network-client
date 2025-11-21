// src/pages/library/BookReaderPage.jsx
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
   SAFE PDF URL HANDLER
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

  // 🔍 zoom state
  const [scale, setScale] = useState(1.1); // default zoom

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

      await renderPage(1, doc, scale);
    } catch (err) {
      console.error("PDF load error:", err);
      alert("Could not load PDF.");
    }
  }

  /* ------------------------------------------------------------
     Render a Page (respects current zoom)
  ------------------------------------------------------------ */
  async function renderPage(num, doc = pdf, customScale) {
    if (!doc) return;

    const effectiveScale = customScale ?? scale;
    const page = await doc.getPage(num);
    const viewport = page.getViewport({ scale: effectiveScale });

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // For responsiveness, let CSS handle visual size
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    setPageNum(num);
  }

  /* ------------------------------------------------------------
     Navigation
  ------------------------------------------------------------ */
  const nextPage = () => {
    if (pageNum < totalPages) renderPage(pageNum + 1);
  };

  const prevPage = () => {
    if (pageNum > 1) renderPage(pageNum - 1);
  };

  /* ------------------------------------------------------------
     Zoom handlers
  ------------------------------------------------------------ */
  const zoomIn = () => {
    if (!pdf) return;
    const newScale = Math.min(scale + 0.2, 3); // max 3x
    setScale(newScale);
    renderPage(pageNum, pdf, newScale);
  };

  const zoomOut = () => {
    if (!pdf) return;
    const newScale = Math.max(scale - 0.2, 0.5); // min 0.5x
    setScale(newScale);
    renderPage(pageNum, pdf, newScale);
  };

  const resetZoom = () => {
    if (!pdf) return;
    const base = 1.1;
    setScale(base);
    renderPage(pageNum, pdf, base);
  };

  /* ------------------------------------------------------------
     UI
  ------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading PDF...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-10">
      {/* HEADER */}
      <div className="w-full bg-gray-900 px-4 py-3 flex justify-between items-center">
        <h2 className="font-bold text-lg sm:text-xl truncate max-w-[70%]">
          {book?.title}
        </h2>

        <button
          onClick={() => navigate("/library")}
          className="bg-red-600 px-3 py-1 sm:px-4 sm:py-2 rounded text-sm sm:text-base"
        >
          Exit
        </button>
      </div>

      {/* CONTROLS */}
      <div className="w-full flex flex-wrap items-center justify-center gap-3 mt-4 px-4 text-xs sm:text-sm">
        <button
          onClick={prevPage}
          disabled={pageNum <= 1}
          className="px-3 py-1 bg-gray-700 rounded disabled:opacity-40"
        >
          ← Prev
        </button>

        <span className="px-3 py-1 bg-gray-800 rounded">
          Page {pageNum} / {totalPages}
        </span>

        <button
          onClick={nextPage}
          disabled={pageNum >= totalPages}
          className="px-3 py-1 bg-gray-700 rounded disabled:opacity-40"
        >
          Next →
        </button>

        {/* Zoom controls */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={zoomOut}
            className="px-2 py-1 bg-gray-700 rounded"
          >
            −
          </button>
          <span className="px-2 py-1 bg-gray-800 rounded">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="px-2 py-1 bg-gray-700 rounded"
          >
            +
          </button>
          <button
            onClick={resetZoom}
            className="px-2 py-1 bg-gray-700 rounded hidden sm:inline-block"
          >
            Reset
          </button>
        </div>
      </div>

      {/* PDF CANVAS (responsive container) */}
      <div className="flex-1 flex items-center justify-center mt-4 px-2 sm:px-4">
        <div className="w-full max-w-5xl flex justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-auto max-h-[80vh] rounded shadow-xl bg-black"
            style={{ maxWidth: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
