import { useEffect, useState } from "react";
import isOwner from "../../utils/isOwner";
import { getJSON } from "../../utils/api";

export default function Navbar() {
  const [articleCount, setArticleCount] = useState(0);
  const [testCount, setTestCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [adminKey, setAdminKey] = useState(localStorage.getItem("ADMIN_KEY") || "");

  // 🔄 Auto-refresh ADMIN_KEY every second (reactive without reload)
  useEffect(() => {
    const interval = setInterval(() => {
      const current = localStorage.getItem("ADMIN_KEY") || "";
      setAdminKey(current);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    getJSON("/api/articles")
      .then((r) => setArticleCount((r.articles || r.data || []).length))
      .catch(() => {});
  }, []);

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

  const showLiveAdmin = isOwner() || adminKey === "LAWNOWNER2025";

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="font-black text-xl">
          Law Network
        </a>

        {/* Desktop */}
        <div className="hidden md:flex gap-6 items-center">
          <a href="/articles" className="hover:text-blue-600">
            Articles ({articleCount})
          </a>

          <a href="/#consultancy" onClick={goConsultancy} className="hover:text-blue-600">
            Consultancy
          </a>

          <a href="/prep" className="hover:text-blue-600">
            Preparation
          </a>

          <a href="/tests" className="hover:text-blue-600">
            Test Series {testCount ? `(${testCount})` : ""}
          </a>

          <a href="/podcasts" className="hover:text-blue-600">
            Podcasts
          </a>

          <a href="/videos" className="hover:text-blue-600">
            Video Gallery
          </a>

          <a href="/notebook" className="hover:text-blue-600">
            PDF Notebook
          </a>

          <a href="/plagiarism" className="hover:text-blue-600">
            Plagiarism
          </a>

          <a href="/research-drafting" className="hover:text-blue-600">
            Research Drafting
          </a>

          <a href="/scholar" className="hover:text-blue-600">
            Scholar Space
          </a>

          {/* ✅ Classroom Link (Public) */}
          <a href="/classroom" className="text-green-600 font-semibold hover:underline">
            Classroom
          </a>

          {/* ✅ LIVE link (Public) */}
          <a href="/live" className="text-red-600 font-semibold hover:underline">
            LIVE
          </a>

          {/* ✅ Owner & Admin links */}
          {(isOwner() || adminKey === "LAWNOWNER2025") && (
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

              {/* ✅ Classroom Admin */}
              <a
                href="/admin/classroom"
                className="px-2 py-1 rounded-md bg-green-200 text-green-900 font-semibold hover:bg-green-300 transition"
              >
                🎓 Classroom Manager
              </a>

              {/* ✅ LIVE Admin */}
              {showLiveAdmin && (
                <a
                  href="/admin/live"
                  className="px-2 py-1 rounded-md bg-yellow-400 text-black font-semibold hover:bg-yellow-300 transition"
                >
                  🎥 Live Studio
                </a>
              )}

              <button
                className="ml-2 text-xs border px-2 py-1 rounded"
                onClick={() => {
                  localStorage.removeItem("ownerKey");
                  localStorage.removeItem("ADMIN_KEY");
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
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu">
            ☰
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden px-4 pb-3 flex flex-col gap-2">
          <a href="/articles">Articles</a>
          <a href="/#consultancy" onClick={goConsultancy}>
            Consultancy
          </a>
          <a href="/prep">Preparation</a>
          <a href="/tests">
            Test Series {testCount ? `(${testCount})` : ""}
          </a>
          <a href="/podcasts">Podcasts</a>
          <a href="/videos">Video Gallery</a>
          <a href="/notebook">PDF Notebook</a>
          <a href="/plagiarism">Plagiarism</a>
          <a href="/research-drafting">Research Drafting</a>
          <a href="/scholar">Scholar Space</a>

          {/* ✅ Classroom Link */}
          <a href="/classroom" className="text-green-600 font-semibold">
            Classroom
          </a>

          {/* ✅ LIVE Link */}
          <a href="/live" className="text-red-600 font-semibold">
            LIVE
          </a>

          {(isOwner() || adminKey === "LAWNOWNER2025") && (
            <>
              <a href="/admin/dashboard" className="underline">
                Admin
              </a>
              <a href="/admin/prep" className="underline">
                Prep Admin
              </a>
              <a href="/admin/prep-access" className="underline">
                Access Requests
              </a>
              <a href="/owner/tests" className="underline">
                Manage Tests
              </a>
              <a href="/owner/tests/import" className="underline">
                Import Tests
              </a>
              <a href="/admin/research" className="underline">
                Research Admin
              </a>
              <a href="/admin/research-drafting" className="underline">
                Research Drafting Admin
              </a>

              {/* ✅ Classroom Admin */}
              <a
                href="/admin/classroom"
                className="px-2 py-1 rounded-md bg-green-200 text-green-900 font-semibold text-center hover:bg-green-300 transition"
              >
                🎓 Classroom Manager
              </a>

              {showLiveAdmin && (
                <a
                  href="/admin/live"
                  className="px-2 py-1 rounded-md bg-yellow-400 text-black font-semibold text-center hover:bg-yellow-300 transition"
                >
                  🎥 Live Studio
                </a>
              )}

              <button
                className="text-left text-xs border px-2 py-1 rounded w-fit"
                onClick={() => {
                  localStorage.removeItem("ownerKey");
                  localStorage.removeItem("ADMIN_KEY");
                  location.reload();
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}

      {(isOwner() || adminKey === "LAWNOWNER2025") && (
        <div className="text-center text-xs py-1 bg-amber-50 border-t">
          Admin Mode Enabled
        </div>
      )}
    </nav>
  );
}
