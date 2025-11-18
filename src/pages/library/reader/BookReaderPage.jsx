// src/pages/library/reader/BookReaderPage.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";

// Auto-detect audio extension
import { loadFileAuto } from "../../../utils/loadFile";

// PDF.js worker
import "../../../pdf-worker";

// IMPORTANT: Your .env MUST contain:
// VITE_API_URL=https://law-network-server.onrender.com/api
const API_URL =
  import.meta.env.VITE_API_URL || "https://law-network-server.onrender.com/api";

// 🔹 Server origin (remove trailing /api so we can build absolute URLs)
const SERVER_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export default function BookReaderPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState(null);
  const [access, setAccess] = useState(null);
  const [pdf, setPdf] = useState(null);

  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const canvasRef = useRef(null);
  const ambience = useRef(null);

  const [seatTimeLeft, setSeatTimeLeft] = useState(null);
  const [readTimeLeft, setReadTimeLeft] = useState(null);

  /* ============================================================
     🔗 Helper: make sure pdfUrl is a FULL URL
  ============================================================ */
  function resolvePdfUrl(rawUrl) {
    if (!rawUrl) return null;

    // Already absolute
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      return rawUrl;
    }

    // Starts with "/" → attach server origin
    if (rawUrl.startsWith("/")) {
      return `${SERVER_ORIGIN}${rawUrl}`;
    }

    // Fallback
    return `${SERVER_ORIGIN}/${rawUrl}`;
  }

  /* ============================================================
     📘 Load Metadata + Access
  ============================================================ */
  useEffect(() => {
    async function load() {
      try {
        /* 1️⃣ Load book metadata */
        const bookRes = await fetch(`${API_URL}/library/books/${bookId}`);
        const bookJson = await bookRes.json();

        if (!bookJson.success || !bookJson.data) {
          console.error("Book not found:", bookJson);
          navigate("/library");
          return;
        }

        setBook(bookJson.data);
        const fullPdfUrl = resolvePdfUrl(bookJson.data.pdfUrl);

        /* 2️⃣ If FREE book → skip access check completely */
        if (!bookJson.data.isPaid) {
          setAccess({ canRead: true, reason: "free-book" });
          await loadPDF(fullPdfUrl);
          return;
        }

        /* 3️⃣ PAID — Access check */
        const accessRes = await fetch(
          `${API_URL}/library/books/${bookId}/access`,
          { credentials: "include" }
        );
        const accessJson = await accessRes.json();
        setAccess(accessJson.data);

        if (!accessJson.data?.canRead) {
          alert("You don't have reading access for this book.");
          navigate("/library");
          return;
        }

        startTimers(accessJson.data);

        /* 4️⃣ Load PDF */
        await loadPDF(fullPdfUrl);
      } catch (err) {
        console.error("Reader load error:", err);
        setLoading(false);
      }
    }

    load();
  }, [bookId, navigate]);

  /* ============================================================
     ⏳ Timers
  ============================================================ */
  function startTimers(data) {
    if (data.seatEndsAt)
      setSeatTimeLeft(new Date(data.seatEndsAt).getTime() - Date.now());
    if (data.purchaseExpiresAt)
      setReadTimeLeft(new Date(data.purchaseExpiresAt).getTime() - Date.now());
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setSeatTimeLeft((t) => (t != null ? t - 1000 : null));
      setReadTimeLeft((t) => (t != null ? t - 1000 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto exit on expiry
  useEffect(() => {
    if (seatTimeLeft != null && seatTimeLeft <= 0) {
      alert("Your seat time has expired.");
      navigate("/library");
    }
    if (readTimeLeft != null && readTimeLeft <= 0) {
      alert("Your reading window has expired.");
      navigate("/library");
    }
  }, [seatTimeLeft, readTimeLeft, navigate]);

  /* ============================================================
     📄 Load PDF
  ============================================================ */
  async function loadPDF(pdfUrl) {
    try {
      if (!pdfUrl) {
        console.error("No PDF URL found for this book.");
        setLoading(false);
        return;
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

      // ✅ Always pass parameter object to avoid "need parameter object" error
      const pdfTask = pdfjsLib.getDocument({ url: pdfUrl });
      const pdfDoc = await pdfTask.promise;

      setPdf(pdfDoc);
      setTotalPages(pdfDoc.numPages);

      await renderPage(1, pdfDoc);
      setLoading(false);
    } catch (err) {
      console.error("PDF load error:", err);
      setLoading(false);
    }
  }

  async function renderPage(num, pdfDoc = pdf) {
    if (!pdfDoc) return;

    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    setPageNum(num);
  }

  const nextPage = () =>
    pageNum < totalPages && renderPage(pageNum + 1);

  const prevPage = () =>
    pageNum > 1 && renderPage(pageNum - 1);

  /* ============================================================
     🎵 Ambience Audio
  ============================================================ */
  useEffect(() => {
    async function loadAudio() {
      const audioFile = await loadFileAuto("/audio/library-ambience");
      if (!audioFile) {
        console.warn("⚠ No ambience audio found");
        return;
      }

      ambience.current = new Audio(audioFile);
      ambience.current.loop = true;
      ambience.current.volume = 0.4;
      ambience.current.play().catch(() => {});
    }

    loadAudio();
    return () => ambience.current?.pause();
  }, []);

  /* ============================================================
     UI
  ============================================================ */
  function formatTime(ms) {
    if (ms == null) return null;
    if (ms <= 0) return "Expired";

    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  }

  if (loading)
    return <div className="p-6 text-white">Loading reader...</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center pb-10">
      {/* Header */}
      <div className="w-full bg-gray-900 p-4 flex justify-between items-center border-b border-gray-700">
        <h2 className="text-xl font-bold">{book?.title || "Book"}</h2>
        <button
          onClick={() => navigate("/library")}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded"
        >
          Exit
        </button>
      </div>

      {/* Timers */}
      <div className="w-full flex justify-center gap-10 mt-4 text-yellow-300 text-sm">
        {seatTimeLeft != null && (
          <div>Seat Time Left: {formatTime(seatTimeLeft)}</div>
        )}
        {readTimeLeft != null && (
          <div>Reading Time Left: {formatTime(readTimeLeft)}</div>
        )}
      </div>

      {/* PDF */}
      <canvas ref={canvasRef} className="mt-6 shadow-xl rounded bg-black" />

      {/* Controls */}
      <div className="flex mt-6 gap-4">
        <button
          onClick={prevPage}
          disabled={pageNum <= 1}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded disabled:opacity-40"
        >
          ← Prev
        </button>

        <span className="px-3 py-2 bg-gray-800 rounded text-sm">
          Page {pageNum} / {totalPages}
        </span>

        <button
          onClick={nextPage}
          disabled={pageNum >= totalPages}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
