// src/components/library/BookFlipViewer.jsx
import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

/**
 * 3D Flip Viewer — StPageFlip-based
 * - Uses local /public/pageflip/page-flip.browser.min.js
 * - Desktop: double-page 3D book
 * - Mobile: single page, with big NEXT / PREV arrows
 * - Zoom + fullscreen
 * - Optional auto-flip + page sound
 */

export default function BookFlipViewer({ pdfUrl, onExit }) {
  const bookRef = useRef(null);       // container for PageFlip
  const flipRef = useRef(null);       // PageFlip instance
  const soundRef = useRef(null);      // optional flip sound

  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState([]);        // data URLs
  const [currentPage, setCurrentPage] = useState(0);
  const [autoFlip, setAutoFlip] = useState(false);
  const [zoom, setZoom] = useState(1);

  const autoFlipTimerRef = useRef(null);

  /* ------------------------------------------------------------
   * 1) Load PDF → convert each page to an image
   * ------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      if (!pdfUrl) return;

      try {
        setLoading(true);

        // Use pdf.js worker from CDN
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

        const task = pdfjsLib.getDocument({
          url: pdfUrl,
          withCredentials: false,
        });

        const doc = await task.promise;
        if (cancelled) return;

        const images = [];

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1.4 });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;

          images.push(canvas.toDataURL("image/jpeg", 0.85));
        }

        if (!cancelled) {
          setPages(images);
        }
      } catch (err) {
        console.error("[Flip] PDF Load Error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  /* ------------------------------------------------------------
   * 2) Load local PageFlip JS + CSS from /public/pageflip
   * ------------------------------------------------------------ */
  function loadPageFlipAssets() {
    return new Promise((resolve) => {
      // CSS once
      if (!document.querySelector("link[data-pageflip-css]")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "/pageflip/page-flip.css";
        link.setAttribute("data-pageflip-css", "1");
        document.head.appendChild(link);
      }

      // JS already loaded?
      if (
        window.PageFlip &&
        (window.PageFlip.PageFlip || typeof window.PageFlip === "function")
      ) {
        return resolve();
      }

      const script = document.createElement("script");
      script.src = "/pageflip/page-flip.browser.min.js";
      script.onload = () => resolve();
      script.onerror = () => {
        console.error("❌ Failed to load PageFlip engine");
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  /* ------------------------------------------------------------
   * 3) Init StPageFlip once images are ready
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!pages.length || !bookRef.current) return;

    let destroyed = false;

    async function init() {
      await loadPageFlipAssets();
      if (destroyed || !bookRef.current) return;

      const globalPF = window.PageFlip;
      const PageFlipClass = globalPF && (globalPF.PageFlip || globalPF);

      if (typeof PageFlipClass !== "function") {
        console.error("❌ PageFlip class not found on window.PageFlip");
        return;
      }

      // Destroy old instance
      if (flipRef.current) {
        flipRef.current.destroy();
        flipRef.current = null;
      }

      // Clean old DOM inside container
      bookRef.current.innerHTML = "";

      // Create new instance
      const flip = new PageFlipClass(bookRef.current, {
        width: 600,
        height: 800,
        size: "stretch",           // fill available area
        maxShadowOpacity: 0.7,
        drawShadow: true,
        flippingTime: 800,
        usePortrait: true,         // single page on small screens
        showCover: false,
        autoSize: true,
        mobileScrollSupport: true,
        startPage: 0,
      });

      // Load pages as images
      flip.loadFromImages(pages);
      flipRef.current = flip;

      // Optional flip sound
      try {
        soundRef.current = new Audio("/page-flip.mp3");
        soundRef.current.volume = 0.4;
      } catch {
        soundRef.current = null;
      }

      // Page change handler
      flip.on("flip", (e) => {
        const pageIndex = typeof e.data === "number" ? e.data : 0;
        setCurrentPage(pageIndex);

        if (soundRef.current) {
          soundRef.current.currentTime = 0;
          soundRef.current.play().catch(() => {});
        }
      });

      // Resize on window resize so it doesn’t stretch weirdly
      const handleResize = () => {
        try {
          flip.update(); // real StPageFlip method
        } catch {
          /* ignore */
        }
      };

      window.addEventListener("resize", handleResize);

      setCurrentPage(0);

      // Cleanup
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    const cleanupPromise = init();

    return () => {
      destroyed = true;
      if (flipRef.current) {
        flipRef.current.destroy();
        flipRef.current = null;
      }
      if (cleanupPromise && typeof cleanupPromise === "function") {
        cleanupPromise();
      }
    };
  }, [pages]);

  /* ------------------------------------------------------------
   * 4) Auto-flip
   * ------------------------------------------------------------ */
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
      const last = pages.length - 1;

      if (state.currentPage >= last) {
        flip.turnToPage(0);
      } else {
        flip.flipNext();
      }
    }, 3500);

    return () => {
      if (autoFlipTimerRef.current) {
        clearInterval(autoFlipTimerRef.current);
        autoFlipTimerRef.current = null;
      }
    };
  }, [autoFlip, pages.length]);

  /* ------------------------------------------------------------
   * 5) Manual navigation helpers (used by arrows + thumbnails)
   * ------------------------------------------------------------ */
  const goToPage = (index) => {
    if (!flipRef.current) return;
    const last = pages.length - 1;
    if (index < 0 || index > last) return;
    flipRef.current.turnToPage(index);
  };

  const goNext = () => {
    if (!flipRef.current) return;
    flipRef.current.flipNext();
  };

  const goPrev = () => {
    if (!flipRef.current) return;
    flipRef.current.flipPrev();
  };

  /* ------------------------------------------------------------
   * 6) Fullscreen only for the flipbook area
   * ------------------------------------------------------------ */
  const enterFullscreen = () => {
    const elem = bookRef.current;
    if (!elem) return;

    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
  };

  /* ------------------------------------------------------------
   * 7) Zoom
   * ------------------------------------------------------------ */
  const zoomIn = () => setZoom((z) => Math.min(2.2, z + 0.2));
  const zoomOut = () => setZoom((z) => Math.max(1, z - 0.2));

  /* ------------------------------------------------------------
   * 8) UI
   * ------------------------------------------------------------ */
  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      {/* HEADER — visible on mobile & desktop */}
      <div className="w-full bg-slate-900 px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 border-b border-slate-800 text-xs sm:text-sm">
        <span className="font-semibold whitespace-nowrap">3D Flip Book</span>

        {pages.length > 0 && (
          <span className="text-[11px] sm:text-xs text-slate-300 whitespace-nowrap">
            Page {currentPage + 1} / {pages.length}
          </span>
        )}

        <button
          onClick={() => setAutoFlip((v) => !v)}
          className={`px-2 sm:px-3 py-1 rounded whitespace-nowrap ${
            autoFlip ? "bg-emerald-600" : "bg-slate-700"
          }`}
        >
          {autoFlip ? "Stop Auto-Flip" : "Start Auto-Flip"}
        </button>

        <button
          onClick={zoomOut}
          className="px-2 sm:px-3 py-1 rounded bg-slate-700"
        >
          Zoom -
        </button>
        <button
          onClick={zoomIn}
          className="px-2 sm:px-3 py-1 rounded bg-slate-700"
        >
          Zoom +
        </button>

        <button
          onClick={enterFullscreen}
          className="px-2 sm:px-3 py-1 rounded bg-blue-700 hover:bg-blue-800"
        >
          Fullscreen
        </button>

        <div className="flex-1" />

        <button
          onClick={onExit}
          className="px-2 sm:px-3 py-1 rounded bg-red-600 hover:bg-red-700"
        >
          Exit
        </button>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex bg-black overflow-hidden">
        {/* Thumbnails (hidden only on very narrow screens) */}
        {pages.length > 0 && (
          <div className="hidden sm:block w-24 md:w-32 border-r border-slate-800 overflow-y-auto p-2 bg-slate-950">
            {pages.map((src, idx) => (
              <button
                key={idx}
                onClick={() => goToPage(idx)}
                className={`mb-2 w-full border ${
                  idx === currentPage ? "border-emerald-400" : "border-slate-700"
                } rounded overflow-hidden`}
              >
                <img
                  src={src}
                  className="w-full h-auto"
                  alt={`Page ${idx + 1}`}
                />
              </button>
            ))}
          </div>
        )}

        {/* Flipbook container with overlay arrows */}
        <div
          className="flex-1 flex justify-center items-center bg-black"
          style={{ height: "calc(100vh - 60px)" }}
        >
          {loading ? (
            <div className="text-slate-200 text-sm">Loading PDF…</div>
          ) : !pages.length ? (
            <div className="text-red-400 text-sm">Unable to render PDF.</div>
          ) : (
            <div
              className="relative w-full h-full flex items-center justify-center"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
              }}
            >
              {/* actual PageFlip root */}
              <div
                ref={bookRef}
                id="flipbook"
                className="w-full h-full"
              />

              {/* Overlay arrows – always visible on mobile & desktop */}
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 sm:left-4 bottom-4 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-2xl sm:text-3xl"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 sm:right-4 bottom-4 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-2xl sm:text-3xl"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
