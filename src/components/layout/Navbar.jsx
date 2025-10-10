// client/src/components/layout/Navbar.jsx
import { useEffect, useState } from "react";
import isOwner from "../../utils/isOwner";
import { getJSON } from "../../utils/api";

export default function Navbar() {
  const [articleCount, setArticleCount] = useState(0);
  const [testCount, setTestCount] = useState(0); // ✅ NEW: total tests
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getJSON("/api/articles")
      .then((r) => setArticleCount((r.articles || r.data || []).length))
      .catch(() => {});
  }, []);

  // ✅ NEW: fetch total number of tests (safe, read-only)
  useEffect(() => {
    getJSON("/api/testseries/tests")
      .then((r) => setTestCount(Array.isArray(r) ? r.length : 0))
      .catch(() => {});
  }, []);

  // Smooth-scroll to #consultancy if we're already on "/"
  // Otherwise navigate to "/#consultancy" so the browser jumps after the home loads.
  function goConsultancy(e) {
    e.preventDefault();

    const scrollNow = () => {
      const el = document.getElementById("consultancy");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.location.hash = "#consultancy"; // fallback
    };

    if (window.location.pathname === "/") {
      scrollNow();
    } else {
      window.location.href = "/#consultancy";
    }
  }

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="font-black text-xl">Law Network</a>

        {/* Desktop */}
        <div className="hidden md:flex gap-6 items-center">
          <a href="/articles" className="hover:text-blue-600">
            Articles ({articleCount})
          </a>

          {/* Consultancy (scrolls or navigates to #consultancy) */}
          <a
            href="/#consultancy"
            onClick={goConsultancy}
            className="hover:text-blue-600"
          >
            Consultancy
          </a>

          {/* ✅ New: Exam Preparation */}
          <a href="/prep" className="hover:text-blue-600">
            Preparation
          </a>

          {/* ✅ NEW: Test Series (dashboard) */}
          <a href="/tests" className="hover:text-blue-600">
            Test Series {testCount ? `(${testCount})` : ""}
          </a>

          <a href="/podcasts" className="hover:text-blue-600">Podcasts</a>
          <a href="/videos" className="hover:text-blue-600">Video Gallery</a>
          <a href="/notebook" className="hover:text-blue-600">PDF Notebook</a>
          <a href="/plagiarism" className="hover:text-blue-600">Plagiarism</a>
          <a href="/scholar" className="hover:text-blue-600">Scholar Space</a>

          {/* ✅ Owner-only links (admin view) */}
          {isOwner() && (
            <>
              <span className="text-gray-300">|</span>
              <a href="/admin/dashboard" className="text-blue-600 underline">Admin</a>
              <a href="/admin/prep" className="text-blue-600 underline">Prep Admin</a>
              <a href="/admin/prep-access" className="text-blue-600 underline">Access Requests</a>
              {/* ✅ NEW: Test Importer (owner only) */}
              <a href="/owner/tests/import" className="text-blue-600 underline">Import Tests</a>
              <button
                className="ml-2 text-xs border px-2 py-1 rounded"
                onClick={() => {
                  localStorage.removeItem("ownerKey");
                  location.reload();
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <div className="md:hidden">
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu">☰</button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden px-4 pb-3 flex flex-col gap-2">
          <a href="/articles">Articles</a>
          <a href="/#consultancy" onClick={goConsultancy}>Consultancy</a>
          <a href="/prep">Preparation</a>
          {/* ✅ NEW: Test Series (mobile) */}
          <a href="/tests">Test Series {testCount ? `(${testCount})` : ""}</a>
          <a href="/podcasts">Podcasts</a>
          <a href="/videos">Video Gallery</a>
          <a href="/notebook">PDF Notebook</a>
          <a href="/plagiarism">Plagiarism</a>
          <a href="/scholar">Scholar Space</a>

          {/* ✅ Owner-only mobile links */}
          {isOwner() && (
            <>
              <a href="/admin/dashboard" className="underline">Admin</a>
              <a href="/admin/prep" className="underline">Prep Admin</a>
              <a href="/admin/prep-access" className="underline">Access Requests</a>
              {/* ✅ NEW: Test Importer (mobile) */}
              <a href="/owner/tests/import" className="underline">Import Tests</a>
            </>
          )}
        </div>
      )}

      {isOwner() && (
        <div className="text-center text-xs py-1 bg-amber-50 border-t">
          Admin Mode Enabled
        </div>
      )}
    </nav>
  );
}
