import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function MagazinesPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/magazines/slug/${slug}`)
        const data = await res.json();
        if (data.ok) setIssues(data.issues);
      } catch (err) {
        console.error("Magazine list error:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-600 text-lg">
        Loading magazines...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-center mb-8">
        LawPrepX Magazine Library
      </h1>

      {issues.length === 0 && (
        <p className="text-center text-gray-500">
          No magazines found. Create one from admin panel.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {issues.map((issue) => (
          <MagazineCard key={issue._id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Magazine Card Component (Safe & Improved)                  */
/* ---------------------------------------------------------- */
function MagazineCard({ issue }) {
  // Backend list does NOT return slides → safe fallback cover
  const cover = issue.coverUrl || "/backgrounds/default-mag.jpg";

  return (
    <div className="bg-white rounded-2xl shadow-sm border hover:shadow-lg transition overflow-hidden">
      {/* Cover Preview */}
      <div
        className="relative h-44 bg-cover bg-center"
        style={{ backgroundImage: `url(${cover})` }}
      >
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-2xl font-bold opacity-20">
            LawPrepX
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h2 className="font-bold text-lg leading-tight mb-1">
          {issue.title}
        </h2>

        <p className="text-gray-600 text-sm mb-4">
          {issue.subtitle || "A LawPrepX visual magazine"}
        </p>

        <Link
          to={`/magazine/${issue.slug}`}
          className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
        >
          Read Now →
        </Link>
      </div>
    </div>
  );
}
