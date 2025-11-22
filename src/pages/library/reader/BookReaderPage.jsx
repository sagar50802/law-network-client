// src/pages/library/reader/BookReaderPage.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";

// ✅ CORRECT WORKER PATH (2 levels up, not 3)
import "../../utils/pdf-worker.js";

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

  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return API_ROOT + url;

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

  const [scale, setScale] = useState(1.2); // 🔥 Mobile-friendly zoom

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

        setBook(json.data);

        const rawUrl = json.data.pdfUrl;
        if (!rawUrl) {
          alert("This book has no PDF file.");
          navigate("/library");
          return;
        }

        const finalUrl = resolvePdfUrl(rawUrl);
        console.log("📄 Final PDF URL:", finalUrl);

        await loadPDF(finalUrl);
      } catch (err) {
        console.error("Reader load error:", err);
        navigate("/library");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [bookId, navigate]);

  /* ------------------------------------------------------------
     Load PDF
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
      alert("Failed to load PDF.");
    }
  }

  /* ------------------------------------------------------------
     Render a Page
  ------------------------------------------------------------ */
  async function renderPage(num, doc = pdf) {
    if (!doc) return;

    const page = await doc.getPage(num);

    // 🔥 Auto-scale for mobile width
    let autoScale = scale;
    if (window.innerWidth < 600) {
      autoScale = 0.9; // smaller zoom for mobile
    }

    const viewport = page.getViewport({ scale: autoScale });

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
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

  const zoomIn = () => {
    setScale((s) => {
      const newScale = s + 0.2;
      renderPage(pageNum);
      return newScale;
    });
  };

  const zoomOut = () => {
    setScale((s) => {
      const newScale = Math.max(0.6, s - 0.2);
      renderPage(pageNum);
      return newScale;
    });
  };

  /* ------------------------------------------------------------
     UI
  ------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="p-6 text-white text-center text-xl">
        Loading PDF…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center">

      {/* HEADER */}
      <div className="w-full bg-gray-900 px-4 py-3 flex justify-between items-center">
        <h2 className="font-bold text-lg">{book?.title}</h2>
        <button
          onClick={() => navigate("/library")}
          className="bg-red-600 px-4 py-2 rounded"
        >
          Exit
        </button>
      </div>

      {/* CANVAS */}
      <div className="w-full flex justify-center overflow-auto mt-4 px-2">
        <canvas
          ref={canvasRef}
          className="shadow-xl rounded border border-gray-700"
          style={{ maxWidth: "100%" }}
        />
      </div>

      {/* CONTROLS */}
      <div className="flex gap-3 mt-6 flex-wrap justify-center">

        <button
          onClick={prevPage}
          disabled={pageNum <= 1}
          className="px-4 py-2 bg-gray-700 rounded disabled:opacity-40"
        >
          ← Prev
        </button>

        <button
          onClick={zoomOut}
          className="px-4 py-2 bg-gray-700 rounded"
        >
          – Zoom Out
        </button>

        <span className="px-3 py-2 bg-gray-800 rounded">
          Page {pageNum} / {totalPages}
        </span>

        <button
          onClick={zoomIn}
          className="px-4 py-2 bg-gray-700 rounded"
        >
          + Zoom In
        </button>

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
