// src/pages/library/reader/BookReaderPage.jsx
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";

// 🔧 IMPORTANT: this is your existing worker under src/pdf-worker.js
import "../../../pdf-worker.js";

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
  const clean = String(url).trim();
  if (!clean) return null;

  if (clean.startsWith("http")) return clean;
  if (clean.startsWith("/")) return API_ROOT + clean;
  return `${API_ROOT}/${clean.replace(/^\/+/, "")}`;
}

/* ------------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------------ */
export default function BookReaderPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [initialised, setInitialised] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blurred, setBlurred] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isRenderingRef = useRef(false);

  /* ------------------------------------------------------------
     SECURITY: disable print, text selection, right click, copy
  ------------------------------------------------------------ */
  useEffect(() => {
    // disable print (hide everything during print)
    const style = document.createElement("style");
    style.id = "no-print-style";
    style.innerHTML = `
      @media print {
        body * {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    // keydown: block Ctrl+P / Cmd+P and PrintScreen -> blur
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();

      // block browser print
      if (
        (e.ctrlKey || e.metaKey) &&
        (key === "p")
      ) {
        e.preventDefault();
        e.stopPropagation();
        setBlurred(true);
        alert("Printing is disabled.");
      }

      // basic PrintScreen detection
      if (key === "printscreen") {
        setBlurred(true);
        alert("Screenshots are discouraged for this content.");
      }
    };

    // visibility change (very rough anti-screenshot)
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setBlurred(true);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener(
      "visibilitychange",
      onVisibilityChange,
      true
    );

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
        true
      );
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, []);

  /* ------------------------------------------------------------
     LOAD BOOK METADATA + PDF
  ------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`${API_BASE}/library/books/${bookId}`);
        const json = await res.json();

        if (!json.success || !json.data) {
          navigate("/library");
          return;
        }

        if (cancelled) return;

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

        // pdf.js will use worker from pdf-worker.js
        const loadingTask = pdfjsLib.getDocument({
          url: finalUrl,
          withCredentials: false,
        });

        const doc = await loadingTask.promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setPageNum(1);
        setInitialised(false); // recalc fit-to-width on first render
      } catch (err) {
        console.error("Error loading PDF:", err);
        alert("Unable to load PDF.");
        navigate("/library");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [bookId, navigate]);

  /* ------------------------------------------------------------
     RENDER PAGE (respects current scale)
  ------------------------------------------------------------ */
  const renderPage = useCallback(
    async (num, overrideScale) => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return;
      if (isRenderingRef.current) return; // avoid overlaps

      isRenderingRef.current = true;

      try {
        const page = await pdfDoc.getPage(num);

        // Determine base viewport at scale 1
        const unscaled = page.getViewport({ scale: 1 });

        let newScale = overrideScale ?? scale;

        // First render: compute "fit to width"
        if (!initialised) {
          const containerWidth =
            containerRef.current.clientWidth || unscaled.width;
          const fitted = (containerWidth * 0.98) / unscaled.width;
          newScale = fitted || 1;
          setScale(fitted || 1);
          setInitialised(true);
        }

        const viewport = page.getViewport({ scale: newScale });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { alpha: false });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // make canvas responsive on screen
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;

        setPageNum(num);
      } catch (err) {
        console.error("Render page error:", err);
      } finally {
        isRenderingRef.current = false;
      }
    },
    [pdfDoc, scale, initialised]
  );

  /* ------------------------------------------------------------
     WHEN pdfDoc OR pageNum OR scale CHANGES → RENDER
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    // use rAF to ensure DOM painted
    animationFrameRef.current = requestAnimationFrame(() => {
      renderPage(pageNum);
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [pdfDoc, pageNum, scale, renderPage]);

  /* ------------------------------------------------------------
     HANDLE WINDOW RESIZE → re-fit width
  ------------------------------------------------------------ */
  useEffect(() => {
    const onResize = () => {
      if (!pdfDoc) return;
      setInitialised(false); // forces recalculation of fit-to-width
      renderPage(pageNum);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pdfDoc, pageNum, renderPage]);

  /* ------------------------------------------------------------
     CONTROLS
  ------------------------------------------------------------ */
  const nextPage = () => {
    if (pageNum < totalPages) {
      setPageNum((p) => p + 1);
    }
  };

  const prevPage = () => {
    if (pageNum > 1) {
      setPageNum((p) => p - 1);
    }
  };

  const zoomIn = () => {
    setScale((s) => Math.min(s + 0.1, 2.5));
  };

  const zoomOut = () => {
    setScale((s) => Math.max(s - 0.1, 0.4));
  };

  const resetZoom = () => {
    setInitialised(false); // recompute fit-to-width
    setScale(1);
  };

  const zoomPercent = Math.round(scale * 100);

  /* ------------------------------------------------------------
     EVENT GUARDS (disable right-click / copy / selection)
  ------------------------------------------------------------ */
  const guardEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  /* ------------------------------------------------------------
     UI
  ------------------------------------------------------------ */
  return (
    <div
      className="fixed inset-0 z-50 bg-black text-white flex flex-col"
      onContextMenu={guardEvent}
      onCopy={guardEvent}
      onCut={guardEvent}
      onPaste={guardEvent}
      style={{
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-sm sm:text-base truncate max-w-[40vw]">
            {book?.title || "Loading..."}
          </span>

          {totalPages > 0 && (
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <button
                onClick={prevPage}
                disabled={pageNum <= 1}
                className="px-2 py-1 rounded bg-slate-800 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-2 py-1 rounded bg-slate-800">
                Page {pageNum} / {totalPages}
              </span>
              <button
                onClick={nextPage}
                disabled={pageNum >= totalPages}
                className="px-2 py-1 rounded bg-slate-800 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}

          {/* ZOOM */}
          {totalPages > 0 && (
            <div className="flex items-center gap-1 ml-4 text-xs sm:text-sm">
              <button
                onClick={zoomOut}
                className="px-2 py-1 rounded bg-slate-800"
              >
                −
              </button>
              <span className="px-2 py-1 rounded bg-slate-800 min-w-[52px] text-center">
                {zoomPercent}%
              </span>
              <button
                onClick={zoomIn}
                className="px-2 py-1 rounded bg-slate-800"
              >
                +
              </button>
              <button
                onClick={resetZoom}
                className="ml-1 px-2 py-1 rounded bg-slate-800"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate("/library")}
          className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-xs sm:text-sm"
        >
          Exit
        </button>
      </div>

      {/* MAIN AREA */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center bg-black"
      >
        {loading || !pdfDoc ? (
          <div className="text-sm text-slate-300 animate-pulse">
            Loading PDF…
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {/* Canvas wrapper for max width on large screens */}
            <div className="max-w-5xl w-full px-2 sm:px-4 py-4">
              <canvas
                ref={canvasRef}
                className={`w-full h-auto mx-auto shadow-2xl rounded ${
                  blurred ? "blur-xl" : ""
                }`}
              />
            </div>
          </div>
        )}

        {/* BLUR OVERLAY WHEN PROTECTED */}
        {blurred && (
          <div
            className="pointer-events-none fixed inset-0 flex items-center justify-center bg-black/60 text-center px-4"
            style={{ zIndex: 60 }}
          >
            <div className="max-w-md">
              <p className="font-semibold mb-2">
                Screen Protection Enabled
              </p>
              <p className="text-sm text-slate-300">
                For security reasons, viewing has been temporarily
                blurred. Reload the page to continue reading.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
