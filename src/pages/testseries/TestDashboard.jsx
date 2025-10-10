import { useEffect, useState } from "react";
import { getJSON } from "../../utils/api";

export default function TestDashboard() {
  const [papers, setPapers] = useState([]);
  const [open, setOpen] = useState({});

  useEffect(() => {
    getJSON("/testseries/papers").then(setPapers).catch(console.error);
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Test Series</h1>
      {papers.map((p, idx) => (
        <div key={idx} className="bg-white rounded-2xl shadow mb-4">
          <button className="w-full text-left p-5 flex items-center justify-between"
                  onClick={() => setOpen(o => ({ ...o, [p.paper]: !o[p.paper] }))}>
            <div className="text-lg font-medium">{p.paper}</div>
            <span className="text-sm text-gray-500">{p.tests?.length || 0} Tests</span>
          </button>
          {open[p.paper] && (
            <div className="border-t">
              {p.tests.map((t, i) => (
                <a key={i} href={`/tests/${t.code}`} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-sm text-gray-500">
                    150 ques · {t.durationMin} min
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
