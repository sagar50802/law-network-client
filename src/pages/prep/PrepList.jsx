import { useEffect, useState } from "react";
import { getJSON, absUrl } from "../../utils/api";

export default function PrepList() {
  const [exams, setExams] = useState([]);

  useEffect(() => { getJSON("/api/prep/exams").then(r => setExams(r.exams||[])).catch(()=>{}); }, []);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Preparation</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.map(ex => (
          <a
            key={ex.examId}
            href={`/prep/${encodeURIComponent(ex.examId)}`}
            className="p-4 rounded-xl border bg-white hover:shadow"
          >
            <div className="text-lg font-semibold">{ex.name}</div>
            <div className="text-xs text-gray-500">{ex.examId}</div>
            <div className="mt-2 text-sm text-blue-600">Resume →</div>
          </a>
        ))}
        {exams.length===0 && <div className="text-gray-500">No exams yet.</div>}
      </div>
    </div>
  );
}
