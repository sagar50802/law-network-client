import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";

import { loadFileAuto } from "../../../utils/loadFile";
import "../../../pdf-worker";

// backend root (MUST NOT include /api)
const API =
  import.meta.env.VITE_API ||
  "https://law-network-server.onrender.com";

// build absolute R2 URLs
function resolvePdfUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return API + url;
  return API + "/" + url;
}

export default function BookReaderPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState(null);
  const [pdf, setPdf] = useState(null);

  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const canvasRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/api/library/books/${bookId}`);
        const json = await res.json();

        if (!json.success) return navigate("/library");

        const data = json.data;
        setBook(data);

        const raw =
          data.pdfUrl ||
          data.pdf ||
          data.fileUrl ||
          data.file ||
          data.path ||
          null;

        if (!raw) {
          console.error("No pdfUrl on book:", data);
          alert("Book has no PDF.");
          return;
        }

        const url = resolvePdfUrl(raw);
        await loadPDF(url);
      } catch (err) {
        console.error("Reader load error:", err);
      }
    }

    load();
  }, [bookId]);

  async function loadPDF(url) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

      const task = pdfjsLib.getDocument({ url });
      const doc = await task.promise;

      setPdf(doc);
      setTotalPages(doc.numPages);

      await renderPage(1, doc);
      setLoading(false);
    } catch (err) {
      console.error("PDF load error:", err);
      setLoading(false);
    }
  }

  async function renderPage(num, doc = pdf) {
    if (!doc) return;

    const page = await doc.getPage(num);
    const viewport = page.getViewport({ scale: 1.4 });

    const canvas = canvasRef.current;
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

  if (loading)
    return <div className="p-6 text-white">Loading PDF...</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center pb-10">

      <div className="w-full bg-gray-900 px-4 py-3 flex justify-between items-center">
        <h2 className="font-bold text-xl">{book?.title}</h2>

        <button
          onClick={() => navigate("/library")}
          className="bg-red-600 px-4 py-2 rounded"
        >
          Exit
        </button>
      </div>

      <canvas ref={canvasRef} className="mt-6 rounded shadow-xl" />

      <div className="flex gap-4 mt-6">
        <button
          onClick={prevPage}
          disabled={pageNum <= 1}
          className="px-4 py-2 bg-gray-700 rounded"
        >
          ← Prev
        </button>

        <span className="px-3 py-2 bg-gray-800 rounded">
          Page {pageNum} / {totalPages}
        </span>

        <button
          onClick={nextPage}
          disabled={pageNum >= totalPages}
          className="px-4 py-2 bg-gray-700 rounded"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
