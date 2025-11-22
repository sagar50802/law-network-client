// src/pages/library/reader/BookReaderPage.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";

// Local worker (Vite-safe, you already have this)
import "../../../utils/pdf-worker";

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
   - Supports R2 public URL
   - Backend static files (/uploads/..)
------------------------------------------------------------ */
function resolvePdfUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http")) return trimmed;
  if (trimmed.startsWith("/")) return API_ROOT + trimmed;

  return `${API_ROOT}/${trimmed.replace(/^\/+/, "")}`;
}

export default function BookReaderPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);

  const [pageSize, setPageSize] = useState(null); // { width, height }
  const [fitScale, setFitScale] = useState(1); // auto-fit to container
  const [zoom, setZoom] = useState(1); // user zoom (0.5x - 3x)
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  const [blurred, setBlurred] = useState(false);

  /* ------------------------------------------------------------
     Side-effects: fullscreen, security (right-click, copy, print)
  ------------------------------------------------------------ */
  useEffect(() => {
    // Make reader fullscreen by locking scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Disable context menu (right-click)
    const onContextMenu = (e) => e.preventDefault();
    document.addEventListener("contextmenu", onContextMenu);

    // Disable copy
    const onCopy = (e) => {
      e.preventDefault();
    };
    document.addEventListener("copy", onCopy);

    // Disable Ctrl+P / Cmd+P (print)
    const onKeyDown = (e) => {
      // Block printing
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        alert("Printing is disabled for this document.");
      }

      // Screenshot-detect (PrintScreen key) – best effort only
      if (e.key === "PrintScreen") {
        setBlurred(true);
        setTimeout(() => setBlurred(false), 4000);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Inject print CSS to hide everything when print dialog opens
  // (extra layer on top of Ctrl+P blocking)
  const printBlockStyle = `
    @media print {
      body * {
        display: none !important;
      }
    }
  `;

  /* ------------------------------------------------------------
     Track window resize for responsive fit
  ------------------------------------------------------------ */
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ------------------------------------------------------------
     Load Book Metadata + PDF
  ------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/library/books/${bookId}`);
        const json = await res.json();

        if (!json.success || !json.data) {
          if (!cancelled) {
            alert("Book not found.");
            navigate("/library");
          }
          return;
        }

        const data = json.data;
        if (!cancelled) setBook(data);

        const rawUrl = data.pdfUrl;
        if (!rawUrl || !String(rawUrl).trim()) {
          if (!cancelled) {
            alert("This book has no PDF file.");
            navigate("/library");
          }
          return;
        }

        const finalUrl = resolvePdfUrl(rawUrl);
        console.log("📄 Final resolved PDF URL:", finalUrl);

        // Optional fallback worker from CDN (in case local worker isn't used)
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;
        } catch {
          // ignore if not allowed
        }

        const task = pdfjsLib.getDocument({ url: finalUrl });
        const doc = await task.promise;
        if (cancelled) return;

        setPdf(doc);
        setTotalPages(doc.numPages);
        setPageNum(1);

        // Get natural page size from first page
        const firstPage = await doc.getPage(1);
        const vp = firstPage.getViewport({ scale: 1 });
        if (!cancelled) {
          setPageSize({ width: vp.width, height: vp.height });
        }
      } catch (err) {
        console.error("Error loading PDF:", err);
        if (!cancelled) {
          setError("Unable to load PDF");
          alert("Unable to load PDF");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [bookId, navigate]);

  /* ------------------------------------------------------------
     Compute auto-fit scale when container or natural page size changes
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!pageSize || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    if (!containerWidth) return;

    // scale to fit width nicely, with some bounds
    const newFit = containerWidth / pageSize.width;
    const clamped = Math.max(0.4, Math.min(newFit, 1.6));

    setFitScale(clamped);
  }, [pageSize, windowWidth]);

  /* ------------------------------------------------------------
     Render current page whenever pdf / pageNum / zoom / fitScale changes
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!pdf || !canvasRef.current || !pageSize) return;

    let cancelled = false;

    async function render() {
      try {
        setIsRendering(true);
        setError("");

        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        const scale = fitScale * zoom;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Clear before drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
      } catch (err) {
        console.error("Render page error:", err);
        if (!cancelled) setError("Failed to render page");
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNum, fitScale, zoom, pageSize]);

  /* ------------------------------------------------------------
     Navigation & zoom controls
  ------------------------------------------------------------ */
  const goPrev = () => {
    if (!pdf || isRendering) return;
    setPageNum((n) => Math.max(1, n - 1));
  };

  const goNext = () => {
    if (!pdf || isRendering) return;
    setPageNum((n) => Math.min(totalPages, n + 1));
  };

  const zoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
  const zoomIn = () => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)));
  const zoomReset = () => setZoom(1);

  const zoomPercent = Math.round(zoom * 100);

  /* ------------------------------------------------------------
     UI
  ------------------------------------------------------------ */
  return (
    <>
      {/* print-block style */}
      <style>{printBlockStyle}</style>

      <div
        className={`fixed inset-0 z-40 bg-black text-white flex flex-col select-none ${
          blurred ? "blur-sm" : ""
        }`}
      >
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <div className="font-semibold text-sm sm:text-base truncate mr-4">
            {book?.title || "Loading..."}
          </div>

          <button
            onClick={() => navigate("/library")}
            className="bg-red-600 hover:bg-red-700 text-xs sm:text-sm px-3 py-1.5 rounded"
          >
            Exit
          </button>
        </div>

        {/* CONTROL BAR */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 py-2 bg-slate-950 border-b border-slate-800 text-xs sm:text-sm">
          <button
            onClick={goPrev}
            disabled={pageNum <= 1 || !pdf || isRendering}
            className="px-2 sm:px-3 py-1 rounded bg-slate-800 disabled:opacity-40"
          >
            ← Prev
          </button>

          <span className="px-2 py-1 rounded bg-slate-800 min-w-[90px] text-center">
            Page {pageNum} / {totalPages || "—"}
          </span>

          <button
            onClick={goNext}
            disabled={pageNum >= totalPages || !pdf || isRendering}
            className="px-2 sm:px-3 py-1 rounded bg-slate-800 disabled:opacity-40"
          >
            Next →
          </button>

          <div className="mx-2 h-4 w-px bg-slate-700 hidden sm:block" />

          <button
            onClick={zoomOut}
            disabled={!pdf || isRendering || zoom <= 0.5}
            className="px-2 py-1 rounded bg-slate-800 disabled:opacity-40"
          >
            −
          </button>

          <span className="px-2 py-1 rounded bg-slate-800 min-w-[60px] text-center">
            {zoomPercent}%
          </span>

          <button
            onClick={zoomIn}
            disabled={!pdf || isRendering || zoom >= 3}
            className="px-2 py-1 rounded bg-slate-800 disabled:opacity-40"
          >
            +
          </button>

          <button
            onClick={zoomReset}
            disabled={!pdf || isRendering || zoom === 1}
            className="px-2 sm:px-3 py-1 rounded bg-slate-700 disabled:opacity-40"
          >
            Reset
          </button>
        </div>

        {/* MAIN VIEWPORT */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto flex items-center justify-center bg-black"
        >
          {loading || !pdf ? (
            <div className="text-slate-300 text-sm">Loading PDF...</div>
          ) : error ? (
            <div className="text-red-400 text-sm">{error}</div>
          ) : (
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto shadow-xl rounded-sm"
            />
          )}
        </div>

        {/* Screenshot blur notice */}
        {blurred && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto bg-black/80 px-4 py-2 rounded text-xs sm:text-sm">
              Screen capture detected. Content temporarily blurred.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
