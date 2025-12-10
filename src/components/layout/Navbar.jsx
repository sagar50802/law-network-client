import { useEffect, useState } from "react";
import isOwner from "../../utils/isOwner";
import { getJSON } from "../../utils/api";

export default function Navbar() {
  const [articleCount, setArticleCount] = useState(0);
  const [testCount, setTestCount] = useState(0);
  const [open, setOpen] = useState(false);

  const [adminKey, setAdminKey] = useState(
    localStorage.getItem("ADMIN_KEY") || ""
  );

  const isAdmin = isOwner() || adminKey === "LAWNOWNER2025";
  const showLiveAdmin = isAdmin;

  /* Keep ADMIN_KEY synced with localStorage */
  useEffect(() => {
    const interval = setInterval(() => {
      setAdminKey(localStorage.getItem("ADMIN_KEY") || "");
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /* Fetch article count */
  useEffect(() => {
    getJSON("/api/articles")
      .then((r) => setArticleCount((r.articles || r.data || []).length))
      .catch(() => {});
  }, []);

  /* Fetch test series count */
  useEffect(() => {
    getJSON("/api/testseries/tests")
      .then((r) => setTestCount(r?.tests?.length || 0))
      .catch(() => {});
  }, []);

  function goConsultancy(e) {
    e.preventDefault();

    const scrollNow = () => {
      const el = document.getElementById("consultancy");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.location.hash = "#consultancy";
    };

    if (window.location.pathname === "/") {
      scrollNow();
    } else {
      window.location.href = "/#consultancy";
    }
  }

  function handleLogout() {
    localStorage.removeItem("ownerKey");
    localStorage.removeItem("ADMIN_KEY");
    localStorage.removeItem("adminToken");
    location.reload();
  }

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* Brand */}
        <a href="/" className="font-black text-xl">
          Law Network
        </a>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex gap-6 items-center">
          <a href="/articles">Articles ({articleCount})</a>

          <a href="/#consultancy" onClick={goConsultancy}>Consultancy</a>

          <a href="/prep">Preparation</a>

          <a href="/tests">Test Series {testCount ? `(${testCount})` : ""}</a>

          <a href="/podcasts">Podcasts</a>

          <a href="/videos">Video Gallery</a>

          <a href="/notebook">PDF Notebook</a>

          <a href="/plagiarism">Plagiarism</a>

          <a href="/research-drafting">Research Drafting</a>

          {/* Classroom */}
          <a href="/classroom" className="text-green-600 font-semibold hover:underline">
            Classroom
          </a>

          {/* Library */}
          <a href="/library">Library</a>

          {/* LIVE */}
          <a href="/live" className="text-red-600 font-semibold hover:underline">
            LIVE
          </a>

          {/* QnA PRACTICE */}
          <a href="/qna/exams" className="text-purple-600 font-semibold hover:underline">
            QnA Practice
          </a>

          {/* ------- ADMIN ------- */}
          {isAdmin && (
            <>
              <span className="text-gray-300">|</span>

              <a href="/admin/dashboard" className="text-blue-600 underline">
                Admin
              </a>

              <a href="/admin/prep" className="text-blue-600 underline">
                Prep Admin
              </a>

              <a href="/admin/prep-access" className="text-blue-600 underline">
                Access Requests
              </a>

              <a href="/owner/tests" className="text-blue-600 underline">
                Manage Tests
              </a>

              <a href="/owner/tests/import" className="text-blue-600 underline">
                Import Tests
              </a>

              <a href="/admin/research" className="text-blue-600 underline">
                Research Admin
              </a>

              <a href="/admin/research-drafting" className="text-blue-600 underline">
                Research Drafting Admin
              </a>

              {/* Library Admin */}
              <a href="/admin/library" className="text-blue-600 underline">
                Library Admin
              </a>

              <a href="/admin/library/payments" className="text-blue-600 underline">
                Library Payments
              </a>

              <a href="/admin/library/seats" className="text-blue-600 underline">
                Library Seats
              </a>

              <a href="/admin/library/book-purchases" className="text-blue-600 underline">
                Book Purchases
              </a>

              <a href="/admin/library/settings" className="text-blue-600 underline">
                Library Settings
              </a>

              {/* ⭐ FIXED: QnA ADMIN route ⭐ */}
              <a href="/admin/qna" className="text-purple-700 underline">
                QnA Admin
              </a>

              {/* Classroom Admin */}
              <a
                href="/admin/classroom"
                className="px-2 py-1 rounded-md bg-green-200 text-green-900 font-semibold hover:bg-green-300"
              >
                🎓 Classroom Manager
              </a>

              {/* Live Admin */}
              {showLiveAdmin && (
                <a
                  href="/admin/live"
                  className="px-2 py-1 rounded-md bg-yellow-400 text-black font-semibold hover:bg-yellow-300"
                >
                  🎥 Live Studio
                </a>
              )}

              {/* Footer */}
              <a
                href="/admin/footer"
                className="px-2 py-1 rounded-md bg-blue-200 text-blue-900 font-semibold hover:bg-blue-300"
              >
                📝 Edit Footer
              </a>

              {/* Change Password */}
              <a
                href="/admin/change-password"
                className="px-2 py-1 rounded-md bg-red-200 text-red-900 font-semibold hover:bg-red-300"
              >
                🔑 Change Password
              </a>

              <button
                className="ml-2 text-xs border px-2 py-1 rounded"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* MOBILE BURGER */}
        <div className="md:hidden">
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu">
            ☰
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {open && (
        <div className="md:hidden px-4 pb-3 flex flex-col gap-2">
          <a href="/articles">Articles</a>
          <a href="/#consultancy" onClick={goConsultancy}>
            Consultancy
          </a>
          <a href="/prep">Preparation</a>

          <a href="/qna/exams" className="text-purple-600 font-semibold">
            QnA Practice
          </a>

          <a href="/tests">Test Series {testCount ? `(${testCount})` : ""}</a>
          <a href="/podcasts">Podcasts</a>
          <a href="/videos">Video Gallery</a>
          <a href="/notebook">PDF Notebook</a>
          <a href="/plagiarism">Plagiarism</a>
          <a href="/research-drafting">Research Drafting</a>

          <a href="/classroom" className="text-green-600 font-semibold">
            Classroom
          </a>

          <a href="/library" className="text-blue-600 font-semibold">
            Library
          </a>

          <a href="/live" className="text-red-600 font-semibold">
            LIVE
          </a>

          {isAdmin && (
            <>
              <a href="/admin/dashboard" className="underline">Admin</a>

              {/* ⭐ FIXED MOBILE ROUTE ⭐ */}
              <a href="/admin/qna" className="text-purple-600 underline">
                QnA Admin
              </a>

              <a href="/admin/prep" className="underline">Prep Admin</a>
              <a href="/admin/prep-access" className="underline">Access Requests</a>
              <a href="/owner/tests" className="underline">Manage Tests</a>
              <a href="/owner/tests/import" className="underline">Import Tests</a>

              <a href="/admin/research" className="underline">Research Admin</a>
              <a href="/admin/research-drafting" className="underline">
                Research Drafting Admin
              </a>

              <a href="/admin/library" className="underline">Library Admin</a>
              <a href="/admin/library/payments" className="underline">Library Payments</a>
              <a href="/admin/library/seats" className="underline">Library Seats</a>
              <a href="/admin/library/book-purchases" className="underline">Book Purchases</a>
              <a href="/admin/library/settings" className="underline">Library Settings</a>

              <a
                href="/admin/classroom"
                className="px-2 py-1 rounded-md bg-green-200 text-green-900 font-semibold text-center"
              >
                🎓 Classroom Manager
              </a>

              <a
                href="/admin/footer"
                className="px-2 py-1 rounded-md bg-blue-200 text-blue-900 font-semibold text-center"
              >
                📝 Edit Footer
              </a>

              <a
                href="/admin/change-password"
                className="px-2 py-1 rounded-md bg-red-200 text-red-900 font-semibold text-center"
              >
                🔑 Change Password
              </a>

              <button
                className="text-left text-xs border px-2 py-1 rounded w-fit"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="text-center text-xs py-1 bg-amber-50 border-t">
          Admin Mode Enabled
        </div>
      )}
    </nav>
  );
}
