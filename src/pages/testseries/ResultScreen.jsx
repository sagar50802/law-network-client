import { useEffect, useState } from "react";
import { getJSON } from "../../utils/api";

export default function ResultScreen({ id }) {
  const [data, setData] = useState(null);
  useEffect(() => { getJSON(`/testseries/result/${id}`).then(setData); }, [id]);
  if (!data) return <div className="p-6">Loading…</div>;

  const { test, score, answers, solutions } = data;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-semibold mb-2">{test.paper} — {test.title}</h2>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Correct" value={score.correct} />
        <Stat label="Incorrect" value={score.wrong} />
        <Stat label="Unattempted" value={score.blank} />
        <Stat label="Marks" value={score.marks.toFixed(2)} />
      </div>

      <div className="space-y-4">
        {solutions.map(sol => {
          const chosen = answers[String(sol.n)];
          const isCorrect = chosen === sol.ans;
          return (
            <div key={sol.n} className="bg-white rounded-2xl shadow p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-gray-500">Q{sol.n}</div>
                <div className={`text-sm ${chosen==null?"text-gray-500":isCorrect?"text-green-700":"text-red-700"}`}>
                  {chosen==null ? "Unattempted" : isCorrect ? "Correct" : "Wrong"}
                </div>
              </div>
              <div className="font-medium mb-3">{sol.q}</div>
              <ul className="space-y-1">
                {sol.options.map((o, idx) => (
                  <li key={idx}>
                    <span className={`mr-2 font-semibold ${idx===sol.ans?"text-green-700":""}`}>{String.fromCharCode(65+idx)}.</span>
                    <span className={`${idx===sol.ans?"text-green-700": chosen===idx?"text-red-700":""}`}>{o}</span>
                  </li>
                ))}
              </ul>
              {(sol.expl || sol.source) && (
                <div className="mt-3 text-sm text-gray-700">
                  {sol.expl && <div className="mb-1"><b>Explanation:</b> {sol.expl}</div>}
                  {sol.source && <div><b>Source:</b> {sol.source}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function Stat({label, value}){return <div className="bg-white rounded-xl shadow p-4 text-center"><div className="text-gray-500">{label}</div><div className="text-2xl font-semibold">{value}</div></div>;}
