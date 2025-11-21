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
  const [scale, setScale] = useState(1); // current zoom
  const [isRendering, setIsRendering] = useState(false);

  const canvasRef = useRef(null);
  const isMountedRef = useRef(false);

  // choose a nicer initial zoom based on screen width
  function getInitialScale() {
    if (typeof window === "undefined") return 1.1;
    const w = window.innerWidth;
    if (w < 640) return 0.8; // phones
    if (w < 1024) return 1.0; // small tablets
    return 1.2; // desktop
  }

  /* ------------------------------------------------------------
     Load Book Metadata + PDF
  ------------------------------------------------------------ */
  useEffect(() => {
    isMountedRef.current = true;

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

        const initialScale = getInitialScale();
        setScale(initialScale);
        await loadPDF(finalUrl, initialScale);
      } catch (err) {
        console.error("Error loading PDF:", err);
        alert("Unable to load PDF");
        navigate("/library");
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    }

    load();

    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  /* ------------------------------------------------------------
     Load PDF Document
  ------------------------------------------------------------ */
  async function loadPDF(url, initialScale) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

      const task = pdfjsLib.getDocument({ url });
      const doc = await task.promise;

      if (!isMountedRef.current) return;

      setPdf(doc);
      setTotalPages(doc.numPages);

      await renderPage(1, doc, initialScale);
    } catch (err) {
      console.error("PDF load error:", err);
      alert("Could not load PDF.");
    }
  }

  /* ------------------------------------------------------------
     Render a Page with a given scale
  ------------------------------------------------------------ */
  async function renderPage(num, doc = pdf, customScale = scale) {
    if (!doc || !canvasRef.current || !isMountedRef.current) return;

    setIsRendering(true);
    try {
      const page = await doc.getPage(num);

      const viewport = page.getViewport({ scale: customScale });

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.warn("Canvas context not available");
        return;
      }

      // Set canvas size to match viewport
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      const renderTask = page.render(renderContext);
      await renderTask.promise;

      if (!isMountedRef.current) return;

      setPageNum(num);
      setScale(customScale);
    } catch (err) {
      console.error("Render page error:", err);
    } finally {
      if (isMountedRef.current) setIsRendering(false);
    }
  }

  /* ------------------------------------------------------------
     Page navigation + zoom
  ------------------------------------------------------------ */
  const nextPage = () => {
    if (!pdf || isRendering) return;
    if (pageNum < totalPages) renderPage(pageNum + 1);
  };

  const prevPage = () => {
    if (!pdf || isRendering) return;
    if (pageNum > 1) renderPage(pageNum - 1);
  };

  const zoomIn = () => {
    if (!pdf || isRendering) return;
    const newScale = Math.min(scale * 1.2, 3); // max 300%
    renderPage(pageNum, pdf, newScale);
  };

  const zoomOut = () => {
    if (!pdf || isRendering) return;
    const newScale = Math.max(scale / 1.2, 0.4); // min 40%
    renderPage(pageNum, pdf, newScale);
  };

  const resetZoom = () => {
    if (!pdf || isRendering) return;
    const s = getInitialScale();
    renderPage(pageNum, pdf, s);
  };

  /* ------------------------------------------------------------
     UI
  ------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white z-[9999]">
        <div className="text-sm sm:text-base">Loading PDF...</div>
      </div>
    );
  }

  return (
    // FULLSCREEN OVERLAY (covers whole site layout)
    <div className="fixed inset-0 bg-black text-white flex flex-col z-[9999]">
      {/* HEADER BAR */}
      <div className="w-full bg-gray-900 px-3 sm:px-4 py-2 flex items-center justify-between">
        <div className="text-sm sm:text-base font-semibold truncate max-w-[70%]">
          {book?.title || "Book"}
        </div>
        <button
          onClick={() => navigate("/library")}
          className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-xs sm:text-sm"
        >
          Exit
        </button>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-2 bg-black border-b border-gray-800">
        <button
          onClick={prevPage}
          disabled={pageNum <= 1 || isRendering}
          className="px-3 py-1 text-xs sm:text-sm bg-gray-800 rounded disabled:opacity-40"
        >
          ← Prev
        </button>

        <span className="px-3 py-1 text-xs sm:text-sm bg-gray-800 rounded">
          Page {pageNum} / {totalPages}
        </span>

        <button
          onClick={nextPage}
          disabled={pageNum >= totalPages || isRendering}
          className="px-3 py-1 text-xs sm:text-sm bg-gray-800 rounded disabled:opacity-40"
        >
          Next →
        </button>

        <button
          onClick={zoomOut}
          disabled={isRendering}
          className="px-2 py-1 text-xs sm:text-sm bg-gray-800 rounded disabled:opacity-40"
        >
          −
        </button>

        <span className="px-2 py-1 text-xs sm:text-sm bg-gray-800 rounded min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={zoomIn}
          disabled={isRendering}
          className="px-2 py-1 text-xs sm:text-sm bg-gray-800 rounded disabled:opacity-40"
        >
          +
        </button>

        <button
          onClick={resetZoom}
          disabled={isRendering}
          className="px-3 py-1 text-xs sm:text-sm bg-gray-800 rounded disabled:opacity-40"
        >
          Reset
        </button>
      </div>

      {/* CANVAS AREA */}
      <div className="flex-1 overflow-auto flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto shadow-xl bg-black"
        />
      </div>
    </div>
  );
}
