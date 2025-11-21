import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
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
   Resolve PDF URL
------------------------------------------------------------ */
function resolvePdfUrl(url) {
  if (!url) return null;

  url = String(url).trim();
  if (!url) return null;

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

  const [zoom, setZoom] = useState(1); // ⭐ REAL ZOOM
  const canvasRef = useRef(null);

  /* ------------------------------------------------------------
     Load Book + PDF
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

        const finalUrl = resolvePdfUrl(data.pdfUrl);
        await loadPDF(finalUrl);
      } catch (err) {
        console.error("Load PDF error:", err);
        navigate("/library");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [bookId]);

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

      await renderPage(1, doc, zoom);
    } catch (err) {
      console.error(err);
      alert("Unable to load PDF");
    }
  }

  /* ------------------------------------------------------------
     Render Page with REAL ZOOM
  ------------------------------------------------------------ */
  async function renderPage(num, doc = pdf, z = zoom) {
    if (!doc) return;

    const page = await doc.getPage(num);

    // ⭐ Dynamic scale based on zoom + responsive width
    const containerWidth = window.innerWidth * 0.9;
    const baseViewport = page.getViewport({ scale: 1 });
    const autoScale = containerWidth / baseViewport.width;

    const viewport = page.getViewport({ scale: autoScale * z });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

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
     ZOOM Controls
  ------------------------------------------------------------ */
  const zoomIn = () => {
    const newZoom = zoom + 0.2;
    setZoom(newZoom);
    renderPage(pageNum, pdf, newZoom);
  };

  const zoomOut = () => {
    const newZoom = Math.max(0.4, zoom - 0.2);
    setZoom(newZoom);
    renderPage(pageNum, pdf, newZoom);
  };

  const resetZoom = () => {
    setZoom(1);
    renderPage(pageNum, pdf, 1);
  };

  /* ------------------------------------------------------------
     UI
  ------------------------------------------------------------ */
  if (loading) return <div className="p-6 text-white">Loading PDF...</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center pb-10">

      {/* Header */}
      <div className="w-full bg-gray-900 px-4 py-3 flex justify-between items-center">
        <h2 className="font-bold text-lg">{book?.title}</h2>
        <button
          onClick={() => navigate("/library")}
          className="bg-red-600 px-4 py-2 rounded"
        >
          Exit
        </button>
      </div>

      {/* Controls */}
      <div className="flex gap-3 mt-4 flex-wrap justify-center">
        <button onClick={prevPage} disabled={pageNum <= 1}
          className="px-3 py-1 bg-gray-700 rounded disabled:opacity-40">
          ← Prev
        </button>

        <span className="px-3 py-1 bg-gray-800 rounded">
          Page {pageNum} / {totalPages}
        </span>

        <button onClick={nextPage} disabled={pageNum >= totalPages}
          className="px-3 py-1 bg-gray-700 rounded disabled:opacity-40">
          Next →
        </button>

        {/* Zoom Buttons */}
        <button onClick={zoomOut} className="px-3 py-1 bg-gray-700 rounded">
          –
        </button>

        <span className="px-3 py-1 bg-gray-800 rounded">
          {(zoom * 100).toFixed(0)}%
        </span>

        <button onClick={zoomIn} className="px-3 py-1 bg-gray-700 rounded">
          +
        </button>

        <button onClick={resetZoom} className="px-3 py-1 bg-blue-700 rounded">
          Reset
        </button>
      </div>

      {/* PDF Canvas */}
      <div className="mt-6 w-full flex justify-center overflow-auto">
        <canvas ref={canvasRef} className="rounded shadow-lg" />
      </div>
    </div>
  );
}
