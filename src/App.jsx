// client/src/App.jsx
import { BrowserRouter as Router, Routes, Route, useLocation, useParams } from "react-router-dom";
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

// ✅ NEW: Preparation pages (user & admin)
import PrepList from "./pages/prep/PrepList.jsx";
import PrepWizard from "./pages/prep/PrepWizard.jsx";
import AdminPrepPanel from "./pages/prep/AdminPrepPanel.jsx";

// ✅ Admin overlay editor
import PrepOverlayEditor from "./pages/prep/PrepOverlayEditor.jsx";

// ✅ Prep access control admin page
import PrepAccessAdmin from "./pages/admin/PrepAccessAdmin.jsx";

// ✅ NEW: Test Series pages (Step 4 integration)
import TestDashboard from "./pages/testseries/TestDashboard.jsx";
import TestIntro from "./pages/testseries/TestIntro.jsx";
import TestPlayer from "./pages/testseries/TestPlayer.jsx";
import ResultScreen from "./pages/testseries/ResultScreen.jsx";
import AdminTestImporter from "./pages/testseries/AdminTestImporter.jsx";

// ✅ NEW: Admin results + manager pages
import AdminTestResults from "./pages/testseries/AdminTestResults.jsx";
import AdminTestManager from "./pages/testseries/AdminTestManager.jsx";

// ✅ Admin-only component wrapper
import IfOwnerOnly from "./components/common/IfOwnerOnly.jsx";

/* 🔤 Global UI styles */
import "./styles/ui.css";

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
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [hash, pathname]);
  return null;
}

function RouteWithCode({ Comp }) {
  const { code } = useParams();
  return <Comp code={code} />;
}

function RouteWithResultId({ Comp }) {
  const { id } = useParams();
  return <Comp id={id} />;
}

/* ------------------------------- App ------------------------------- */

export default function App() {
  return (
    <Router>
      <div className="bg-gradient-to-br from-[#f8fafc] to-[#e6edf5] text-[#0b1220] min-h-screen font-inter antialiased">
        <nav className="bg-white/70 backdrop-blur-md shadow-md sticky top-0 z-50">
          <Navbar />
        </nav>

        <ScrollToHash />

        <div className="animate-fadeIn">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="/podcasts" element={<PodcastsPage />} />
            <Route path="/notebook" element={<NotebookPage />} />

            <Route path="/scholar" element={<ScholarPage />} />
            <Route path="/plagiarism" element={<Plagiarism />} />
            <Route path="/pdfdemo" element={<PdfDemo />} />

            {/* ✅ Exam Preparation */}
            <Route path="/prep" element={<PrepList />} />
            <Route path="/prep/:examId" element={<PrepWizard />} />

            <Route
              path="/admin/prep"
              element={
                <AdminRoute>
                  <AdminPrepPanel />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/prep-overlay"
              element={
                <AdminRoute>
                  <PrepOverlayEditor />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/prep/overlay"
              element={
                <AdminRoute>
                  <PrepOverlayEditor />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/prep-access"
              element={
                <AdminRoute>
                  <PrepAccessAdmin />
                </AdminRoute>
              }
            />

            {/* ✅ Test Series */}
            <Route path="/tests" element={<TestDashboard />} />
            <Route path="/tests/:code" element={<RouteWithCode Comp={TestIntro} />} />
            <Route path="/tests/:code/play" element={<RouteWithCode Comp={TestPlayer} />} />
            <Route path="/tests/result/:id" element={<RouteWithResultId Comp={ResultScreen} />} />

            {/* ✅ Admin Test Importer */}
            <Route
              path="/owner/tests/import"
              element={
                <IfOwnerOnly>
                  <AdminTestImporter />
                </IfOwnerOnly>
              }
            />

            {/* ✅ Admin Results */}
            <Route
              path="/owner/tests/results"
              element={
                <IfOwnerOnly>
                  <AdminTestResults />
                </IfOwnerOnly>
              }
            />

            {/* ✅ Admin Test Manager */}
            <Route
              path="/owner/tests"
              element={
                <IfOwnerOnly>
                  <AdminTestManager />
                </IfOwnerOnly>
              }
            />

            {/* ✅ Admin core pages */}
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
