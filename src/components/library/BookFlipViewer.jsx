// src/components/library/BookFlipViewer.jsx
import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

/**
 * 3D Flip Viewer
 * - Renders PDF pages to images via pdf.js
 * - Uses StPageFlip (PageFlip) via CDN
 * - Features:
 *    - page turning sound
 *    - hardcover / double page (spreads)
 *    - auto-flip toggle
 *    - thumbnail sidebar (click to jump)
 *
 * NOTE: each "page" in PageFlip is now a **spread**:
 *   [1+2], [3+4], [5+6], ...
 */

export default function BookFlipViewer({ pdfUrl, onExit }) {
  const bookRef = useRef(null); // container for PageFlip
  const flipRef = useRef(null); // PageFlip instance
  const soundRef = useRef(null); // page flip sound

  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState([]); // array of spread data URLs
  const [currentPage, setCurrentPage] = useState(0); // spread index
  const [autoFlip, setAutoFlip] = useState(false);

  const autoFlipTimerRef = useRef(null);

  /* ------------------------------------------------------------
     Load PDF -> render to DOUBLE-PAGE spreads
  ------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function renderPdfPageToCanvas(page, scale) {
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas;
    }

    async function loadPdf() {
      try {
        setLoading(true);

        // Use CDN worker for this viewer (keeps it independent)
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

        const task = pdfjsLib.getDocument({
          url: pdfUrl,
          withCredentials: false,
        });

        const doc = await task.promise;
        if (cancelled) return;

        const spreads = [];
        const totalPages = doc.numPages || 0;

        // Build spreads: [1+2], [3+4], ...
        for (let i = 1; i <= totalPages; i += 2) {
          const pageLeft = await doc.getPage(i);
          const leftCanvas = await renderPdfPageToCanvas(pageLeft, 1.4);

          let rightCanvas = null;
          if (i + 1 <= totalPages) {
            const pageRight = await doc.getPage(i + 1);
            rightCanvas = await renderPdfPageToCanvas(pageRight, 1.4);
          }

          // Spread canvas = left + right side-by-side
          const spreadCanvas = document.createElement("canvas");
          const spreadCtx = spreadCanvas.getContext("2d");

          const spreadHeight = leftCanvas.height;
          const spreadWidth =
            leftCanvas.width + (rightCanvas ? rightCanvas.width : leftCanvas.width);

          spreadCanvas.width = spreadWidth;
          spreadCanvas.height = spreadHeight;

          // background
          spreadCtx.fillStyle = "#000";
          spreadCtx.fillRect(0, 0, spreadWidth, spreadHeight);

          // draw left
          spreadCtx.drawImage(leftCanvas, 0, 0);

          // draw right if exists, otherwise leave blank "inside cover"
          if (rightCanvas) {
            spreadCtx.drawImage(rightCanvas, leftCanvas.width, 0);
          }

          const img = spreadCanvas.toDataURL("image/jpeg", 0.85);
          spreads.push(img);
        }

        if (!cancelled) {
          setPages(spreads);
          setCurrentPage(0);
        }
      } catch (err) {
        console.error("[Flip] PDF load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (pdfUrl) loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  /* ------------------------------------------------------------
     Ensure PageFlip JS + CSS from CDN
  ------------------------------------------------------------ */
  function loadPageFlipAssets() {
    return new Promise((resolve) => {
      // CSS
      if (!document.querySelector("link[data-pageflip-css]")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href =
          "https://cdn.jsdelivr.net/npm/page-flip/dist/css/page-flip.min.css";
        link.setAttribute("data-pageflip-css", "1");
        document.head.appendChild(link);
      }

      // JS
      if (window.PageFlip) return resolve();

      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/page-flip/dist/js/page-flip.browser.min.js";
      script.async = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  /* ------------------------------------------------------------
     Init flipbook once spreads are ready
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!bookRef.current) return;
    if (!pages.length) return;

    let destroyed = false;

    async function init() {
      await loadPageFlipAssets();
      if (destroyed || !bookRef.current) return;

      const PageFlip = window.PageFlip;
      if (!PageFlip) return;

      // Destroy previous instance if any
      if (flipRef.current) {
        flipRef.current.destroy();
        flipRef.current = null;
      }

      const flip = new PageFlip(bookRef.current, {
        width: 600,
        height: 800,
        size: "stretch",
        minWidth: 320,
        minHeight: 400,
        maxWidth: 1600,
        maxHeight: 1800,
        showCover: true, // hardcover style
        usePortrait: false, // double-page on desktop
        flippingTime: 800,
        maxShadowOpacity: 0.6,
        drawShadow: true,
        autoSize: true,
        mobileScrollSupport: true,
      });

      // Each item in `pages` is already a spread image
      flip.loadFromImages(pages);
      flipRef.current = flip;

      // Prepare simple flip sound (optional file: /public/page-flip.mp3)
      try {
        soundRef.current = new Audio("/page-flip.mp3");
        soundRef.current.volume = 0.4;
      } catch {
        soundRef.current = null;
      }

      // Update current page & play sound
      flip.on("flip", (e) => {
        setCurrentPage(e.data);
        if (soundRef.current) {
          soundRef.current.currentTime = 0;
          soundRef.current.play().catch(() => {});
        }
      });

      // Start at first spread
      setCurrentPage(0);
    }

    init();

    return () => {
      destroyed = true;
      if (flipRef.current) {
        flipRef.current.destroy();
        flipRef.current = null;
      }
    };
  }, [pages]);

  /* ------------------------------------------------------------
     Auto-flip timer
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!autoFlip || !flipRef.current) {
      if (autoFlipTimerRef.current) {
        clearInterval(autoFlipTimerRef.current);
        autoFlipTimerRef.current = null;
      }
      return;
    }

    autoFlipTimerRef.current = setInterval(() => {
      const flip = flipRef.current;
      if (!flip) return;

      const state = flip.getState();
      const lastPage = pages.length - 1;

      if (state.currentPage >= lastPage) {
        // loop back to cover
        flip.turnToPage(0);
      } else {
        flip.flipNext();
      }
    }, 4000); // every 4 seconds

    return () => {
      if (autoFlipTimerRef.current) {
        clearInterval(autoFlipTimerRef.current);
        autoFlipTimerRef.current = null;
      }
    };
  }, [autoFlip, pages.length]);

  /* ------------------------------------------------------------
     Thumbnail click handler (uses spreads)
  ------------------------------------------------------------ */
  const goToPage = (index) => {
    if (!flipRef.current) return;
    flipRef.current.turnToPage(index);
  };

  /* ------------------------------------------------------------
     UI
  ------------------------------------------------------------ */
  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      {/* HEADER */}
      <div className="w-full bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3 text-sm sm:text-base">
          <span className="font-semibold">3D Flip Book</span>

          {pages.length > 0 && (
            <span className="text-xs sm:text-sm text-slate-300">
              Spread {currentPage + 1} / {pages.length}
            </span>
          )}

          <button
            onClick={() => setAutoFlip((v) => !v)}
            className={`ml-3 px-3 py-1 rounded text-xs sm:text-sm ${
              autoFlip ? "bg-emerald-600" : "bg-slate-700"
            }`}
          >
            {autoFlip ? "Stop Auto-Flip" : "Start Auto-Flip"}
          </button>
        </div>

        <button
          onClick={onExit}
          className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-xs sm:text-sm"
        >
          Exit
        </button>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex bg-black overflow-hidden">
        {/* Thumbnails sidebar (hidden on very small screens) */}
        {pages.length > 0 && (
          <div className="hidden sm:block w-24 md:w-32 border-r border-slate-800 overflow-y-auto p-2 bg-slate-950/80">
            {pages.map((src, idx) => (
              <button
                key={idx}
                onClick={() => goToPage(idx)}
                className={`mb-2 w-full border ${
                  idx === currentPage
                    ? "border-emerald-400"
                    : "border-slate-700"
                } rounded overflow-hidden`}
              >
                <img
                  src={src}
                  alt={`Spread ${idx + 1}`}
                  className="w-full h-auto block"
                />
              </button>
            ))}
          </div>
        )}

        {/* Flip container – FULL SCREEN HEIGHT */}
        <div
          className="flex-1 flex justify-center items-center p-0 bg-black"
          style={{ height: "calc(100vh - 60px)" }} // ~60px header approximation
        >
          {loading ? (
            <div className="text-slate-200 text-sm sm:text-base">
              Loading 3D book…
            </div>
          ) : !pages.length ? (
            <div className="text-red-400 text-sm sm:text-base">
              Could not render pages.
            </div>
          ) : (
            <div
              ref={bookRef}
              id="flipbook"
              className="shadow-2xl bg-slate-900/40"
              style={{
                width: "100%",
                height: "100%",
                maxHeight: "100%",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
