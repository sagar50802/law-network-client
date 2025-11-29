// src/components/library/BookFlipViewer.jsx
import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

/**
 * 3D Flip Viewer — Stable Version
 * - Uses local /public/pageflip engine (canvas based)
 * - Zoom + fullscreen
 * - Thumbnails + optional auto flip + page sound
 */

export default function BookFlipViewer({ pdfUrl, onExit }) {
  const bookRef = useRef(null);
  const flipRef = useRef(null);
  const soundRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [autoFlip, setAutoFlip] = useState(false);
  const [zoom, setZoom] = useState(1);

  const autoFlipTimerRef = useRef(null);

  /* ------------------------------------------------------------
   * Load PDF → convert each page to an image
   * ------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      if (!pdfUrl) return;
      try {
        setLoading(true);

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

        const task = pdfjsLib.getDocument({
          url: pdfUrl,
          withCredentials: false,
        });

        const doc = await task.promise;
        if (cancelled) return;

        const arr = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1.4 });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;
          arr.push(canvas.toDataURL("image/jpeg", 0.85));
        }

        if (!cancelled) {
          setPages(arr);
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
   * Load local JS + CSS from /public/pageflip
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
      if (window.PageFlip && (window.PageFlip.PageFlip || typeof window.PageFlip === "function")) {
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
   * Initialize flipbook once pages are ready
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!pages.length || !bookRef.current) return;

    let destroyed = false;

    async function init() {
      await loadPageFlipAssets();
      if (destroyed || !bookRef.current) return;

      const globalPF = window.PageFlip;
      const PageFlipClass =
        globalPF && (globalPF.PageFlip || globalPF); // handle both exports

      if (typeof PageFlipClass !== "function") {
        console.error("❌ PageFlip class not found on window.PageFlip");
        return;
      }

      // Destroy old instance
      if (flipRef.current) {
        flipRef.current.destroy();
        flipRef.current = null;
      }

      // Create instance
      const flip = new PageFlipClass(bookRef.current, {
        width: 600,
        height: 800,
        size: "stretch",
        maxShadowOpacity: 0.5,
        drawShadow: true,
        flippingTime: 800,
        showCover: false,
        usePortrait: false,
        mobileScrollSupport: true,
        startPage: 0,
      });

      flip.loadFromImages(pages);
      flipRef.current = flip;

      // Optional flip sound
      try {
        soundRef.current = new Audio("/page-flip.mp3");
        soundRef.current.volume = 0.4;
      } catch {
        soundRef.current = null;
      }

      flip.on("flip", (e) => {
        setCurrentPage(e.data || 0);
        if (soundRef.current) {
          soundRef.current.currentTime = 0;
          soundRef.current.play().catch(() => {});
        }
      });

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
   * Auto-flip
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
   * Thumbnails → jump to page
   * ------------------------------------------------------------ */
  const goToPage = (index) => {
    if (!flipRef.current) return;
    flipRef.current.turnToPage(index);
  };

  /* ------------------------------------------------------------
   * Fullscreen only for the flipbook area
   * ------------------------------------------------------------ */
  const enterFullscreen = () => {
    const elem = bookRef.current;
    if (!elem) return;

    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
  };

  /* ------------------------------------------------------------
   * Zoom
   * ------------------------------------------------------------ */
  const zoomIn = () => setZoom((z) => Math.min(2.2, z + 0.2));
  const zoomOut = () => setZoom((z) => Math.max(1, z - 0.2));

  /* ------------------------------------------------------------
   * UI
   * ------------------------------------------------------------ */
  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      {/* HEADER */}
      <div className="w-full bg-slate-900 px-4 py-2 flex items-center gap-3 border-b border-slate-800">
        <span className="font-semibold text-sm sm:text-base">3D Flip Book</span>

        {pages.length > 0 && (
          <span className="text-xs sm:text-slate-300">
            Page {currentPage + 1} / {pages.length}
          </span>
        )}

        <button
          onClick={() => setAutoFlip((v) => !v)}
          className={`px-3 py-1 rounded text-xs sm:text-sm ${
            autoFlip ? "bg-emerald-600" : "bg-slate-700"
          }`}
        >
          {autoFlip ? "Stop Auto-Flip" : "Start Auto-Flip"}
        </button>

        <button
          onClick={zoomIn}
          className="px-3 py-1 rounded bg-slate-700 text-xs sm:text-sm"
        >
          Zoom +
        </button>
        <button
          onClick={zoomOut}
          className="px-3 py-1 rounded bg-slate-700 text-xs sm:text-sm"
        >
          Zoom -
        </button>

        <button
          onClick={enterFullscreen}
          className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-800 text-xs sm:text-sm"
        >
          Fullscreen
        </button>

        <div className="flex-1" />

        <button
          onClick={onExit}
          className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-xs sm:text-sm"
        >
          Exit
        </button>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex bg-black overflow-hidden">
        {/* Thumbnails */}
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
                <img src={src} className="w-full h-auto" alt={`Page ${idx + 1}`} />
              </button>
            ))}
          </div>
        )}

        {/* Flipbook container */}
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
              ref={bookRef}
              id="flipbook"
              style={{
                width: "100%",
                height: "100%",
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
