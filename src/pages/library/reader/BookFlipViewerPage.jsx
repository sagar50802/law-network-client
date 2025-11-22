import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BookFlipViewer from "../../../components/library/BookFlipViewer";

/* ------------------------------------------------------------
   API CONSTANTS (same as your existing logic)
------------------------------------------------------------ */
const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000")
    .replace(/\/$/, "")}/api`;

const API_ROOT = API_BASE.replace(/\/api\/?$/, "");

/* ------------------------------------------------------------
   SAFE URL normalizer
------------------------------------------------------------ */
function resolvePdfUrl(url) {
  if (!url) return null;
  url = String(url).trim();
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return API_ROOT + url;
  return `${API_ROOT}/${url.replace(/^\/+/, "")}`;
}

/* ------------------------------------------------------------
   FULL SCREEN 3D FLIP VIEWER PAGE
------------------------------------------------------------ */
export default function BookFlipViewerPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [book, setBook] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/library/books/${bookId}`);
        const json = await res.json();

        if (!json.success) {
          navigate("/library");
          return;
        }

        setBook(json.data);

        const url = resolvePdfUrl(json.data.pdfUrl);
        setPdfUrl(url);
      } catch (err) {
        console.error("Flip view load error:", err);
        navigate("/library");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [bookId, navigate]);

  if (loading)
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        Loading Flipbook…
      </div>
    );

  if (!pdfUrl)
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-red-400">
        PDF not found
      </div>
    );

  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden">
      <BookFlipViewer pdfUrl={pdfUrl} onExit={() => navigate(-1)} />
    </div>
  );
}
