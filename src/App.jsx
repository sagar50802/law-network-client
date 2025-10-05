// client/src/App.jsx
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

import Navbar from "./components/layout/Navbar";
import AdminRoute from "./components/common/AdminRoute.jsx";

// static imports (pages)
import HomePage from "./pages/HomePage.jsx";
import ArticlesPage from "./pages/ArticlesPage.jsx";
import NewsPage from "./pages/NewsPage.jsx";
import VideosPage from "./pages/VideosPage.jsx";
import PodcastsPage from "./pages/PodcastsPage.jsx";
import NotebookPage from "./pages/NotebookPage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";

// admin editor for consultancy (component page)
import AdminConsultancyEditor from "./components/Admin/AdminConsultancyEditor.jsx";

// ✅ NEW: plagiarism page
import Plagiarism from "./pages/Plagiarism.jsx";

// ✅ NEW: Scholar Space page
import ScholarPage from "./pages/ScholarPage.jsx";

// ✅ NEW: PDF Demo page (for GridFS testing)
import PdfDemo from "./pages/PdfDemo.jsx";

// ✅ Prep Wizard component (page wrapper not required)
import PrepWizard from "./components/Prep/PrepWizard";

/* -------------------- Local helpers/components -------------------- */

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-6xl font-extrabold text-[#1e293b] mb-4">404</h1>
      <p className="text-lg text-gray-600 mb-6">
        Oops! The page you’re looking for doesn’t exist.
      </p>
      <a
        href="/"
        className="px-6 py-3 rounded-lg bg-[#0b1220] text-white shadow-lg hover:bg-[#1e293b] transition"
      >
        Go Back Home
      </a>
    </div>
  );
}

/** Scroll to #hash after route changes (tries a few times to wait for render) */
function ScrollToHash() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = hash.replace(/^#/, "");
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const t0 = setTimeout(tryScroll, 0);
    const t1 = setTimeout(tryScroll, 120);
    const t2 = setTimeout(tryScroll, 350);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [hash, pathname]);
  return null;
}

/** Minimal, safe list page for /prep (doesn't touch other modules) */
function PreparationPage() {
  const exams = [
    { id: "UP_APO", name: "UP APO" },
    { id: "MP_ADPO", name: "MP ADPO" },
    { id: "BIHAR_APO", name: "Bihar APO" },
  ];
  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">Preparation</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {exams.map((e) => (
          <Link
            key={e.id}
            to={`/prep/${encodeURIComponent(e.id)}`}
            className="border rounded-xl bg-white p-4 hover:shadow transition"
          >
            <div className="text-lg font-semibold">{e.name}</div>
            <div className="text-xs text-gray-500 mt-1">Tap to resume</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------- App ------------------------------- */

export default function App() {
  return (
    <Router>
      <div className="bg-gradient-to-br from-[#f8fafc] to-[#e6edf5] text-[#0b1220] min-h-screen font-inter antialiased">
        {/* Navbar with subtle glass effect */}
        <nav className="bg-white/70 backdrop-blur-md shadow-md sticky top-0 z-50">
          <Navbar />
        </nav>

        {/* 🔎 hash scroller (handles /#consultancy) */}
        <ScrollToHash />

        {/* Page transition wrapper */}
        <div className="animate-fadeIn">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="/podcasts" element={<PodcastsPage />} />
            <Route path="/notebook" element={<NotebookPage />} />
            {/* ✅ Scholar Space */}
            <Route path="/scholar" element={<ScholarPage />} />
            {/* ✅ NEW route */}
            <Route path="/plagiarism" element={<Plagiarism />} />
            {/* ✅ PDF Demo route */}
            <Route path="/pdfdemo" element={<PdfDemo />} />

            {/* ✅ Exam Preparation routes (isolated, won’t affect others) */}
            <Route path="/prep" element={<PreparationPage />} />
            <Route path="/prep/:examId" element={<PrepWizard />} />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/consultancy"
              element={
                <AdminRoute>
                  <AdminConsultancyEditor />
                </AdminRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
