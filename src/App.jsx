// src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useParams,
} from "react-router-dom";
import { useEffect } from "react";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer.jsx";
import AdminRoute from "./components/common/AdminRoute.jsx";
import IfOwnerOnly from "./components/common/IfOwnerOnly.jsx";
import "./styles/ui.css";

/* ---------- NEW: Classroom Drawer Menu ---------- */
import ClassroomDrawerMenu from "./components/ClassroomDrawerMenu.jsx";

/* ---------- Ambience ---------- */
import AmbiencePage from "./pages/classroom/AmbiencePage.jsx";

/* ---------- Group Key Bridge ---------- */
import GroupKeyBridge from "./pages/GroupKeyBridge.jsx";

/* ---------- Main Pages ---------- */
import HomePage from "./pages/HomePage.jsx";
import ArticlesPage from "./pages/ArticlesPage.jsx";
import NewsPage from "./pages/NewsPage.jsx";
import VideosPage from "./pages/VideosPage.jsx";
import PodcastsPage from "./pages/PodcastsPage.jsx";
import NotebookPage from "./pages/NotebookPage.jsx";
import ScholarPage from "./pages/ScholarPage.jsx";
import PdfDemo from "./pages/PdfDemo.jsx";
import Plagiarism from "./pages/Plagiarism.jsx";

/* ---------- Magazine ---------- */
import MagazineReader from "./pages/MagazineReader.jsx";
import MagazinesPage from "./pages/MagazinesPage.jsx";
import AdminMagazines from "./pages/admin/AdminMagazines.jsx";

/* ---------- Admin Pages ---------- */
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminConsultancyEditor from "./components/Admin/AdminConsultancyEditor.jsx";
import AdminFooterTermsEditor from "./pages/AdminFooterTermsEditor.jsx";

/* ---------- Exam Prep ---------- */
import PrepList from "./pages/prep/PrepList.jsx";
import PrepWizard from "./pages/prep/PrepWizard.jsx";
import AdminPrepPanel from "./pages/prep/AdminPrepPanel.jsx";
import PrepOverlayEditor from "./pages/prep/PrepOverlayEditor.jsx";
import PrepAccessAdmin from "./pages/admin/PrepAccessAdmin.jsx";

/* ---------- Test Series ---------- */
import TestDashboard from "./pages/testseries/TestDashboard.jsx";
import TestIntro from "./pages/testseries/TestIntro.jsx";
import TestPlayer from "./pages/testseries/TestPlayer.jsx";
import ResultScreen from "./pages/testseries/ResultScreen.jsx";
import AdminTestImporter from "./pages/testseries/AdminTestImporter.jsx";
import AdminTestResults from "./pages/testseries/AdminTestResults.jsx";
import AdminTestManager from "./pages/testseries/AdminTestManager.jsx";

/* ---------- Research Drafting ---------- */
import ResearchDrafting from "./pages/ResearchDrafting.jsx";
import ResearchDraftingLab from "./pages/ResearchDraftingLab.jsx";
import AdminResearchPanel from "./components/ResearchDrafting/AdminResearchPanel.jsx";

/* ---------- LIVE Channel ---------- */
import LiveChannelPage from "./pages/LiveChannelPage.jsx";
import LiveAdminPage from "./pages/LiveAdminPage.jsx";

/* ---------- Classroom Feature ---------- */
import ClassroomLivePage from "./pages/ClassroomLivePage.jsx";
import AdminLectureManager from "./pages/AdminLectureManager.jsx";
import ClassroomSharePage from "./pages/ClassroomSharePage.jsx";
import ClassroomLinkCreator from "./pages/ClassroomLinkCreator.jsx";

/* ---------- Theme Page ---------- */
import ThemeFocusPage from "./pages/classroom/ThemeFocusPage.jsx";

/* ---------- 404 ---------- */
function NotFound() {
  return (
    <div className="flex flex-col items-center py-24">
      <h1 className="text-6xl font-extrabold text-[#1e293b]">404</h1>
      <p className="text-gray-600 mt-2">Page not found.</p>
      <a href="/" className="mt-4 px-6 py-3 bg-[#0b1220] text-white rounded-lg">
        Home
      </a>
    </div>
  );
}

function ScrollToHash() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    const scroll = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    };
    setTimeout(scroll, 0);
    setTimeout(scroll, 150);
    setTimeout(scroll, 350);
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

function ClassroomWrapper({ children }) {
  const location = useLocation();
  const isClass = location.pathname.startsWith("/classroom");
  return (
    <>
      {isClass && <ClassroomDrawerMenu />}
      {children}
    </>
  );
}

/* ---------- MAIN APP CONTENT ---------- */
function AppContent() {
  const location = useLocation();

  const isPrepHome = location.pathname === "/prep";
  const isLivePage = location.pathname.startsWith("/live"); // ✅ FIX ADDED

  return (
    <div
      className={`min-h-screen flex flex-col font-inter antialiased ${
        isPrepHome || isLivePage
          ? "bg-transparent" // LIVE + PREP handle their own backgrounds
          : "bg-gradient-to-br from-[#f8fafc] to-[#e6edf5]"
      }`}
    >
      <nav className="bg-white/70 backdrop-blur-md shadow-md sticky top-0 z-50">
        <Navbar />
      </nav>

      <ScrollToHash />

      <div className="flex-1 animate-fadeIn">
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

          {/* Magazines */}
          <Route path="/magazine/:slug" element={<MagazineReader />} />
          <Route path="/magazines" element={<MagazinesPage />} />

          {/* LIVE */}
          <Route path="/live" element={<LiveChannelPage />} />
          <Route
            path="/admin/live"
            element={
              <AdminRoute>
                <LiveAdminPage />
              </AdminRoute>
            }
          />

          {/* Classroom */}
          <Route
            path="/classroom"
            element={
              <ClassroomWrapper>
                <ClassroomLivePage />
              </ClassroomWrapper>
            }
          />
          <Route path="/classroom/share" element={<ClassroomSharePage />} />
          <Route path="/classroom/ambience" element={<AmbiencePage />} />
          <Route path="/classroom/theme" element={<ThemeFocusPage />} />

          {/* Group Key */}
          <Route
            path="/bridge/gk/:key/t/:token"
            element={<GroupKeyBridge />}
          />

          {/* Admin classroom */}
          <Route
            path="/admin/classroom-link"
            element={
              <AdminRoute>
                <ClassroomLinkCreator />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/classroom"
            element={
              <AdminRoute>
                <AdminLectureManager />
              </AdminRoute>
            }
          />

          {/* Research Drafting */}
          <Route path="/research-drafting" element={<ResearchDrafting />} />
          <Route
            path="/research-drafting/lab/:id"
            element={<ResearchDraftingLab />}
          />
          <Route
            path="/admin/research-drafting"
            element={
              <IfOwnerOnly>
                <AdminResearchPanel />
              </IfOwnerOnly>
            }
          />

          {/* Exam Prep */}
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
            path="/admin/prep-access"
            element={
              <AdminRoute>
                <PrepAccessAdmin />
              </AdminRoute>
            }
          />

          {/* Test Series */}
          <Route path="/tests" element={<TestDashboard />} />
          <Route
            path="/tests/:code"
            element={<RouteWithCode Comp={TestIntro} />}
          />
          <Route
            path="/tests/:code/play"
            element={<RouteWithCode Comp={TestPlayer} />}
          />
          <Route
            path="/tests/result/:id"
            element={<RouteWithResultId Comp={ResultScreen} />}
          />

          {/* Admin tests */}
          <Route
            path="/owner/tests/import"
            element={
              <IfOwnerOnly>
                <AdminTestImporter />
              </IfOwnerOnly>
            }
          />
          <Route
            path="/owner/tests/results"
            element={
              <IfOwnerOnly>
                <AdminTestResults />
              </IfOwnerOnly>
            }
          />
          <Route
            path="/owner/tests"
            element={
              <IfOwnerOnly>
                <AdminTestManager />
              </IfOwnerOnly>
            }
          />

          {/* Admin general */}
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
          <Route
            path="/admin/footer"
            element={
              <AdminRoute>
                <AdminFooterTermsEditor />
              </AdminRoute>
            }
          />

          {/* Magazines admin */}
          <Route
            path="/admin/magazines"
            element={
              <AdminRoute>
                <AdminMagazines />
              </AdminRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
