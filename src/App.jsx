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

/* ---------- Classroom Drawer Menu ---------- */
import ClassroomDrawerMenu from "./components/ClassroomDrawerMenu.jsx";

/* ---------- Ambience Page ---------- */
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
import PdfDemo from "./pages/PdfDemo.jsx";
import Plagiarism from "./pages/Plagiarism.jsx";
import LibraryPage from "./pages/LibraryPage.jsx";

/* ---------- BOOK READERS ---------- */
import BookReaderPage from "./pages/library/reader/BookReaderPage.jsx";
import BookFlipViewerPage from "./pages/library/reader/BookFlipViewerPage.jsx";

/* ---------- Admin Pages ---------- */
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminConsultancyEditor from "./components/Admin/AdminConsultancyEditor.jsx";
import AdminFooterTermsEditor from "./pages/AdminFooterTermsEditor.jsx";

/* ---------- Library Admin Pages ---------- */
import LibraryAdminPage from "./pages/admin/library/LibraryAdminPage.jsx";
import PaymentsPage from "./pages/admin/library/PaymentsPage.jsx";
import SeatsPage from "./pages/admin/library/SeatsPage.jsx";
import BookPurchasesPage from "./pages/admin/library/BookPurchasesPage.jsx"];
import SettingsPage from "./pages/admin/library/SettingsPage.jsx";
import BooksPage from "./pages/admin/library/BooksPage.jsx";

/* ---------- NEW — Change Password ---------- */
import ChangePassword from "./pages/ChangePassword.jsx";

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

/* ---------- QNA EXAM PLATFORM (RESTORED) ---------- */
import StudentExamList from "./pages/qna/StudentExamList.jsx";
import StudentStudyPage from "./pages/qna/StudentStudyPage.jsx";
import AdminQnaPortal from "./pages/qna/AdminPortal.jsx";
import AdminExamManagement from "./pages/qna/AdminExamManagement.jsx";
import AdminSyllabusManagement from "./pages/qna/AdminSyllabusManagement.jsx";
import AdminQuestionManagement from "./pages/qna/AdminQuestionManagement.jsx";

/* ---------- Theme Page ---------- */
import ThemeFocusPage from "./pages/classroom/ThemeFocusPage.jsx";

/* ========================================== */
/* Not Found
/* ========================================== */
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

/* ========================================== */
/* Helpers
/* ========================================== */

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

function ClassroomWrapper({ children }) {
  const location = useLocation();
  const isClassroom = location.pathname.startsWith("/classroom");
  return (
    <>
      {isClassroom && <ClassroomDrawerMenu />}
      {children}
    </>
  );
}

/* ========================================== */
/* Main Routes
/* ========================================== */
function AppContent() {
  const location = useLocation();
  const isPrepHome = location.pathname === "/prep";

  return (
    <div
      className={`text-[#0b1220] min-h-screen font-inter antialiased flex flex-col ${
        isPrepHome
          ? "bg-transparent"
          : "bg-gradient-to-br from-[#f8fafc] to-[#e6edf5]"
      }`}
    >
      <nav className="bg-white/70 backdrop-blur-md shadow-md sticky top-0 z-50">
        <Navbar />
      </nav>

      <ScrollToHash />

      <div className="animate-fadeIn flex-1">
        <Routes>

          {/* PUBLIC PAGES */}
          <Route path="/" element={<HomePage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/podcasts" element={<PodcastsPage />} />
          <Route path="/notebook" element={<NotebookPage />} />
          <Route path="/plagiarism" element={<Plagiarism />} />
          <Route path="/pdfdemo" element={<PdfDemo />} />
          <Route path="/library" element={<LibraryPage />} />

          {/* QNA PUBLIC ROUTES */}
          <Route path="/qna" element={<StudentExamList />} />
          <Route path="/qna/exams/:examId" element={<StudentStudyPage />} />

          {/* BOOK READERS */}
          <Route path="/library/reader/:bookId" element={<BookReaderPage />} />
          <Route path="/library/flip/:bookId" element={<BookFlipViewerPage />} />

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

          {/* CLASSROOM */}
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

          {/* GROUP KEY */}
          <Route path="/bridge/gk/:key/t/:token" element={<GroupKeyBridge />} />

          {/* ADMIN CLASSROOM */}
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

          {/* RESEARCH */}
          <Route path="/research-drafting" element={<ResearchDrafting />} />
          <Route path="/research-drafting/lab/:id" element={<ResearchDraftingLab />} />
          <Route
            path="/admin/research-drafting"
            element={
              <IfOwnerOnly>
                <AdminResearchPanel />
              </IfOwnerOnly>
            }
          />

          {/* PREP */}
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

          {/* TEST SERIES */}
          <Route path="/tests" element={<TestDashboard />} />
          <Route path="/tests/:code" element={<RouteWithCode Comp={TestIntro} />} />
          <Route path="/tests/:code/play" element={<RouteWithCode Comp={TestPlayer} />} />
          <Route path="/tests/result/:id" element={<RouteWithResultId Comp={ResultScreen} />} />

          {/* TEST ADMIN */}
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

          {/* ADMIN ROUTES */}
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

          {/* QNA ADMIN ROUTES */}
          <Route
            path="/admin/qna"
            element={
              <IfOwnerOnly>
                <AdminQnaPortal />
              </IfOwnerOnly>
            }
          />

          <Route
            path="/admin/qna/exams"
            element={
              <IfOwnerOnly>
                <AdminExamManagement />
              </IfOwnerOnly>
            }
          />

          <Route
            path="/admin/qna/syllabus"
            element={
              <IfOwnerOnly>
                <AdminSyllabusManagement />
              </IfOwnerOnly>
            }
          />

          <Route
            path="/admin/qna/questions"
            element={
              <IfOwnerOnly>
                <AdminQuestionManagement />
              </IfOwnerOnly>
            }
          />

          {/* FOOTER ADMIN */}
          <Route
            path="/admin/footer"
            element={
              <AdminRoute>
                <AdminFooterTermsEditor />
              </AdminRoute>
            }
          />

          {/* LIBRARY ADMIN */}
          <Route
            path="/admin/library"
            element={
              <AdminRoute>
                <LibraryAdminPage />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/library/payments"
            element={
              <AdminRoute>
                <PaymentsPage />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/library/seats"
            element={
              <AdminRoute>
                <SeatsPage />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/library/book-purchases"
            element={
              <AdminRoute>
                <BookPurchasesPage />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/library/books"
            element={
              <AdminRoute>
                <BooksPage />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/library/settings"
            element={
              <AdminRoute>
                <SettingsPage />
              </AdminRoute>
            }
          />

          {/* CHANGE PASSWORD */}
          <Route
            path="/admin/change-password"
            element={
              <AdminRoute>
                <ChangePassword />
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
