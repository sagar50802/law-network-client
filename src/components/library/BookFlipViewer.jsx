// src/components/library/BookFlipViewer.jsx
import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

/**
 * 3D Flip Viewer
 * - Renders PDF pages to images via pdf.js
 * - Uses StPageFlip (PageFlip) via CDN
 * - Features:
 *    - page turning sound
 *    - hardcover / double page
 *    - auto-flip toggle
 *    - thumbnail sidebar (click to jump)
 */

export default function BookFlipViewer({ pdfUrl, onExit }) {
  const bookRef = useRef(null);
  const flipRef = useRef(null);
  const soundRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [autoFlip, setAutoFlip] = useState(false);

  const autoFlipTimerRef = useRef(null);

  /* ------------------------------------------------------------
     Load PDF -> render to images
  ------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      try {
        setLoading(true);

        // Use CDN worker for flip-view (keeps it independent)
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

        const task = pdfjsLib.getDocument({
          url: pdfUrl,
          withCredentials: false,
        });

        const doc = await task.promise;
        if (cancelled) return;

        const imgs = [];

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);

          // render at good quality — not too heavy
          const viewport = page.getViewport({ scale: 1.4 });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;

          const img = canvas.toDataURL("image/jpeg", 0.8);
          imgs.push(img);
        }

        if (!cancelled) {
          setPages(imgs);
        }
      } catch (err) {
        console.error("[Flip] PDF load error:", err);
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
     Init flipbook once images are ready
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
        maxWidth: 1400,
        maxHeight: 1800,
        showCover: true, // hardcover style
        usePortrait: false, // double-page on desktop
        flippingTime: 800,
        maxShadowOpacity: 0.6,
        drawShadow: true,
        autoSize: true,
        mobileScrollSupport: true,
      });

      flip.loadFromImages(pages);
      flipRef.current = flip;

      // Prepare simple flip sound (optional file in /public/page-flip.mp3)
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

      // Start at first page
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
    }, 4000); // every 4s

    return () => {
      if (autoFlipTimerRef.current) {
        clearInterval(autoFlipTimerRef.current);
        autoFlipTimerRef.current = null;
      }
    };
  }, [autoFlip, pages.length]);

  /* ------------------------------------------------------------
     Thumbnail click handler
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
              Page {currentPage + 1} / {pages.length}
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
                  alt={`Page ${idx + 1}`}
                  className="w-full h-auto block"
                />
              </button>
            ))}
          </div>
        )}

        {/* Flip container */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
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
              style={{ width: "100%", height: "100%" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
