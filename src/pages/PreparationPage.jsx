import { useEffect, useState } from "react";
import { getJSON } from "../utils/api";
import { Link } from "react-router-dom";

export default function PreparationPage() {
  const [exams, setExams] = useState([]);
  const email = localStorage.getItem("userEmail") || "";

  useEffect(() => {
    (async () => {
      const r = await getJSON("/api/exams");
      const items = r?.items || [];
      // augment with progress
      const withProg = await Promise.all(items.map(async (ex) => {
        const ov = await getJSON(`/api/exams/${ex.examId}/overview?email=${encodeURIComponent(email)}`).catch(()=>({}));
        const total = ov?.total || 0;
        const completed = ov?.completed || 0;
        const pct = total ? Math.round((completed/total)*100) : 0;
        return { ...ex, progressPct: pct };
      }));
      setExams(withProg);
    })();
  }, [email]);

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">Preparation</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.map(ex => (
          <div key={ex.examId} className="border rounded-xl bg-white p-4">
            <div className="text-lg font-semibold">{ex.name}</div>
            <div className="text-xs text-gray-500">Mode: Cohort</div>
            <div className="mt-3">
              <div className="text-sm mb-1">Progress: {ex.progressPct}%</div>
              <div className="w-full h-2 bg-gray-200 rounded">
                <div className="h-2 bg-blue-600 rounded" style={{ width: `${ex.progressPct}%` }} />
              </div>
            </div>
            <div className="mt-4">
              <Link to={`/prep/${encodeURIComponent(ex.examId)}`} className="px-3 py-1 rounded bg-black text-white">Resume</Link>
            </div>
          </div>
        ))}
        {exams.length === 0 && <div className="text-gray-500">No exams yet</div>}
      </div>
    </section>
  );
}
