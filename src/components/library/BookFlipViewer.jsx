// src/components/library/BookFlipViewer.jsx
import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

/**
 * 3D Flip Viewer (Stable Version)
 * - Renders ALL PDF pages to images (simple mode)
 * - Uses your local /public/pageflip/page-flip.browser.min.js
 * - Double-page spread view supported
 * - Auto flip, sound, thumbnails
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
     Load PDF => Convert all pages to images
  ------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      try {
        setLoading(true);

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

        const task = pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false });
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

          images.push(canvas.toDataURL("image/jpeg", 0.8));
        }

        if (!cancelled) setPages(images);
      } catch (err) {
        console.error("[Flip] PDF Load Error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (pdfUrl) loadPdf();
    return () => (cancelled = true);
  }, [pdfUrl]);

  /* ------------------------------------------------------------
     Load PageFlip JS + CSS (LOCAL version)
  ------------------------------------------------------------ */
  function loadPageFlipAssets() {
    return new Promise((resolve) => {
      // CSS
      if (!document.querySelector("link[data-pageflip-css]")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "/pageflip/page-flip.css";
        link.setAttribute("data-pageflip-css", "1");
        document.head.appendChild(link);
      }

      // JS (already loaded?)
      if (window.PageFlip) return resolve();

      const script = document.createElement("script");
      script.src = "/pageflip/page-flip.browser.min.js";
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  /* ------------------------------------------------------------
     Initialize flipbook when pages exist
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!pages.length || !bookRef.current) return;

    let destroyed = false;

    async function init() {
      await loadPageFlipAssets();
      if (destroyed) return;

      const PageFlip = window.PageFlip;
      if (!PageFlip) return;

      // Destroy previous
      if (flipRef.current) {
        flipRef.current.destroy();
        flipRef.current = null;
      }

      // Initialize
      const flip = new PageFlip(bookRef.current, {
        width: 600,
        height: 800,
        size: "stretch",
        minWidth: 320,
        minHeight: 400,
        maxWidth: 2000,
        maxHeight: 2000,
        showCover: true,
        usePortrait: false, // double page
        flippingTime: 800,
        maxShadowOpacity: 0.6,
        drawShadow: true,
        autoSize: true,
        mobileScrollSupport: true,
      });

      flip.loadFromImages(pages);
      flipRef.current = flip;

      // sound
      try {
        soundRef.current = new Audio("/page-flip.mp3");
        soundRef.current.volume = 0.4;
      } catch (err) {}

      flip.on("flip", (e) => {
        setCurrentPage(e.data);

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
      if (flipRef.current) flipRef.current.destroy();
    };
  }, [pages]);

  /* ------------------------------------------------------------
     Auto flip
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!autoFlip || !flipRef.current) {
      clearInterval(autoFlipTimerRef.current);
      return;
    }

    autoFlipTimerRef.current = setInterval(() => {
      const flip = flipRef.current;
      const last = pages.length - 1;

      if (flip.getState().currentPage >= last) flip.turnToPage(0);
      else flip.flipNext();
    }, 4000);

    return () => clearInterval(autoFlipTimerRef.current);
  }, [autoFlip, pages.length]);

  /* ------------------------------------------------------------
     Thumbnail click
  ------------------------------------------------------------ */
  const goToPage = (index) => {
    if (flipRef.current) flipRef.current.turnToPage(index);
  };

  /* ------------------------------------------------------------
     UI
  ------------------------------------------------------------ */
  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      {/* HEADER */}
      <div className="w-full bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="font-semibold">3D Flip Book</span>

          {pages.length > 0 && (
            <span className="text-xs text-slate-300">
              Page {currentPage + 1} / {pages.length}
            </span>
          )}

          <button
            onClick={() => setAutoFlip((v) => !v)}
            className={`ml-3 px-3 py-1 rounded text-xs ${
              autoFlip ? "bg-emerald-600" : "bg-slate-700"
            }`}
          >
            {autoFlip ? "Stop Auto-Flip" : "Start Auto-Flip"}
          </button>
        </div>

        <button
          onClick={onExit}
          className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-xs"
        >
          Exit
        </button>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex bg-black overflow-hidden">

        {/* Thumbnails */}
        {pages.length > 0 && (
          <div className="hidden sm:block w-24 md:w-32 border-r border-slate-800 overflow-y-auto p-2 bg-slate-950/80">
            {pages.map((src, idx) => (
              <button
                key={idx}
                onClick={() => goToPage(idx)}
                className={`mb-2 w-full border ${
                  idx === currentPage ? "border-emerald-400" : "border-slate-700"
                } rounded overflow-hidden`}
              >
                <img src={src} className="w-full h-auto" />
              </button>
            ))}
          </div>
        )}

        {/* FLIPBOOK FULL WIDTH + HEIGHT */}
        <div
          className="flex-1 p-0 bg-black overflow-hidden"
          style={{ height: "calc(100vh - 60px)" }}
        >
          {loading ? (
            <div className="text-slate-200 p-4">Loading 3D book…</div>
          ) : !pages.length ? (
            <div className="text-red-400 p-4">Could not render pages.</div>
          ) : (
            <div
              ref={bookRef}
              id="flipbook"
              className="shadow-2xl bg-slate-900/40 w-full h-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}
