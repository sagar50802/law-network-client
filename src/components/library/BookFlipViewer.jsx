import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Load local worker
import "../../utils/pdf-worker";

export default function BookFlipViewer({ pdfUrl, onExit }) {
  const bookRef = useRef(null);
  const [loading, setLoading] = useState(true);

  const imagesRef = useRef([]);

  useEffect(() => {
    async function loadPDF() {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

        const task = pdfjsLib.getDocument(pdfUrl);
        const doc = await task.promise;

        const pages = [];

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;

          const img = canvas.toDataURL("image/jpeg", 0.8);
          pages.push(img);
        }

        imagesRef.current = pages;

        initFlipBook();
      } catch (err) {
        console.error("FlipBook PDF error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPDF();
  }, [pdfUrl]);

  // Inject PageFlip CDN
  function loadPageFlip() {
    return new Promise((resolve) => {
      if (window.PageFlip) return resolve();

      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/page-flip/dist/js/page-flip.browser.min.js";
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  async function initFlipBook() {
    await loadPageFlip();

    const PageFlip = window.PageFlip;

    const flip = new PageFlip(bookRef.current, {
      width: 500,
      height: 700,
      size: "stretch",
      minWidth: 300,
      minHeight: 400,
      maxWidth: 1200,
      maxHeight: 1600,
      maxShadowOpacity: 0.3,
      showCover: true,
      mobileScrollSupport: true,
    });

    flip.loadFromImages(imagesRef.current);
  }

  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      {/* Header */}
      <div className="w-full bg-gray-900 px-4 py-3 flex justify-between items-center">
        <h2 className="font-bold text-lg">3D Flip Book</h2>

        <button
          onClick={onExit}
          className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
        >
          Exit
        </button>
      </div>

      {/* Main viewer */}
      <div className="flex-1 flex justify-center items-center p-4">
        {loading ? (
          <div className="text-white">Loading 3D Book...</div>
        ) : (
          <div
            ref={bookRef}
            id="flipbook"
            className="shadow-2xl"
            style={{ width: "100%", height: "100%" }}
          ></div>
        )}
      </div>
    </div>
  );
}
