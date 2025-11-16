import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import "../../pdf-worker";

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
  /* Fetch Book + Access Permission                                             */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const bookRes = await fetch(`${API_URL}/api/library/books/${bookId}`);
        const bookData = await bookRes.json();

        if (!bookData.success) return navigate("/library");
        setBook(bookData.data);

        const accessRes = await fetch(
          `${API_URL}/api/library/books/${bookId}/access`,
          { credentials: "include" }
        );
        const accessData = await accessRes.json();
        setAccess(accessData.data);

        if (!accessData.data.canRead) {
          alert("Access denied. Please purchase book or reserve seat.");
          return navigate("/library");
        }

        startTimers(accessData.data);

        loadPDF(bookData.data.pdfFile);
      } catch (err) {
        console.error("Reader load error:", err);
      }
    }

    load();
  }, [bookId]);

  /* -------------------------------------------------------------------------- */
  /* Start Timers for Seat + Reading                                            */
  /* -------------------------------------------------------------------------- */
  function startTimers(data) {
    if (data.seatEndsAt) {
      const end = new Date(data.seatEndsAt).getTime();
      setSeatTimeLeft(end - Date.now());
    }

    if (data.purchaseExpiresAt) {
      const end = new Date(data.purchaseExpiresAt).getTime();
      setReadTimeLeft(end - Date.now());
    }
  }

  /* Update timers every second */
  useEffect(() => {
    const interval = setInterval(() => {
      setSeatTimeLeft((t) => (t !== null ? t - 1000 : null));
      setReadTimeLeft((t) => (t !== null ? t - 1000 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /* -------------------------------------------------------------------------- */
  /* Auto-lock if any timer expires                                             */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (seatTimeLeft !== null && seatTimeLeft <= 0) {
      alert("Your seat time expired. Reading session locked.");
      navigate("/library");
    }
    if (readTimeLeft !== null && readTimeLeft <= 0) {
      alert("Reading time expired. Purchase again to continue.");
      navigate("/library");
    }
  }, [seatTimeLeft, readTimeLeft]);

  /* -------------------------------------------------------------------------- */
  /* Load & Render PDF                                                          */
  /* -------------------------------------------------------------------------- */
  async function loadPDF(pdfPath) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

      const loadingTask = pdfjsLib.getDocument(`${API_URL}${pdfPath}`);
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
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    page.render({
      canvasContext: context,
      viewport,
    });

    setPageNum(num);
  }

  /* -------------------------------------------------------------------------- */
  /* Page Controls                                                              */
  /* -------------------------------------------------------------------------- */
  const nextPage = () => {
    if (pageNum < totalPages) renderPage(pageNum + 1);
  };

  const prevPage = () => {
    if (pageNum > 1) renderPage(pageNum - 1);
  };

  /* -------------------------------------------------------------------------- */
  /* Time Display Helper                                                        */
  /* -------------------------------------------------------------------------- */
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
  /* Audio ambience on mount                                                    */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    ambience.current = new Audio("/library-ambience.mp3");
    ambience.current.loop = true;
    ambience.current.volume = 0.4;
    ambience.current.play().catch(() => {});

    return () => {
      ambience.current.pause();
    };
  }, []);

  /* -------------------------------------------------------------------------- */
  /* RENDER UI                                                                  */
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
