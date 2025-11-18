import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import "../../../pdf-worker";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  /* -------------------------------------------------------------------------- */
  /* Load Book + Access Check                                                   */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        /* 1. Load book metadata */
        const bookRes = await fetch(`${API_URL}/api/library/books/${bookId}`);
        const bookJson = await bookRes.json();

        if (!bookJson.success) return navigate("/library");
        setBook(bookJson.data);

        /* 2. Load access permissions */
        const accessRes = await fetch(
          `${API_URL}/api/library/books/${bookId}/access`,
          { credentials: "include" }
        );
        const accessJson = await accessRes.json();
        setAccess(accessJson.data);

        if (!accessJson.data.canRead) {
          alert("You don't have reading access for this book.");
          return navigate("/library");
        }

        startTimers(accessJson.data);

        /* 3. Load PDF correctly */
        loadPDF(bookJson.data.pdfUrl); // FIXED
      } catch (err) {
        console.error("Reader load error:", err);
      }
    }

    load();
  }, [bookId]);

  /* -------------------------------------------------------------------------- */
  /* Timers                                                                     */
  /* -------------------------------------------------------------------------- */
  function startTimers(data) {
    if (data.seatEndsAt) {
      setSeatTimeLeft(new Date(data.seatEndsAt).getTime() - Date.now());
    }
    if (data.purchaseExpiresAt) {
      setReadTimeLeft(new Date(data.purchaseExpiresAt).getTime() - Date.now());
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setSeatTimeLeft((t) => (t != null ? t - 1000 : null));
      setReadTimeLeft((t) => (t != null ? t - 1000 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (seatTimeLeft != null && seatTimeLeft <= 0) {
      alert("Your seat time has expired.");
      return navigate("/library");
    }
    if (readTimeLeft != null && readTimeLeft <= 0) {
      alert("Your reading window has expired.");
      return navigate("/library");
    }
  }, [seatTimeLeft, readTimeLeft]);

  /* -------------------------------------------------------------------------- */
  /* Load PDF from R2                                                           */
  /* -------------------------------------------------------------------------- */
  async function loadPDF(pdfUrl) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;

      setPdf(pdfDoc);
      setTotalPages(pdfDoc.numPages);

      renderPage(1, pdfDoc);
      setLoading(false);
    } catch (err) {
      console.error("PDF load error:", err);
    }
  }

  async function renderPage(num, pdfDoc = pdf) {
    if (!pdfDoc) return;

    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    setPageNum(num);
  }

  /* Controls */
  const nextPage = () => {
    if (pageNum < totalPages) renderPage(pageNum + 1);
  };
  const prevPage = () => {
    if (pageNum > 1) renderPage(pageNum - 1);
  };

  function formatTime(ms) {
    if (ms == null) return null;
    if (ms <= 0) return "Expired";

    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    return `${h}h ${m}m ${sec}s`;
  }

  /* -------------------------------------------------------------------------- */
  /* Ambience                                                                   */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    ambience.current = new Audio("/audio/library-ambience.mp3"); // FIXED PATH
    ambience.current.loop = true;
    ambience.current.volume = 0.4;

    ambience.current.play().catch(() => {});

    return () => ambience.current.pause();
  }, []);

  /* -------------------------------------------------------------------------- */
  /* UI                                                                         */
  /* -------------------------------------------------------------------------- */
  if (loading) return <div className="p-6 text-white">Loading reader...</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center pb-10">
      {/* Header Bar */}
      <div className="w-full bg-gray-900 p-4 flex justify-between items-center border-b border-gray-700">
        <h2 className="text-xl font-bold">{book.title}</h2>
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

      {/* PDF Canvas */}
      <canvas ref={canvasRef} className="mt-6 shadow-xl rounded" />

      {/* Controls */}
      <div className="flex mt-6 gap-4">
        <button
          onClick={prevPage}
          disabled={pageNum <= 1}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded"
        >
          ← Prev
        </button>

        <span className="px-3 py-2 bg-gray-800 rounded text-sm">
          Page {pageNum} / {totalPages}
        </span>

        <button
          onClick={nextPage}
          disabled={pageNum >= totalPages}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
