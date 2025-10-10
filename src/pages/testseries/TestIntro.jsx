import { useEffect, useState } from "react";
import { getJSON } from "../../utils/api";

export default function TestIntro({ code }) {
  const [t, setT] = useState(null);

  useEffect(() => { getJSON(`/testseries/test/${code}/intro`).then(setT); }, [code]);

  if (!t) return <div className="p-6">Loading…</div>;
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-semibold mb-2">{t.paper} — {t.title}</h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Info label="Questions" value={t.totalQ} />
        <Info label="Duration" value={`${t.durationMin} min`} />
        <Info label="Marks" value={t.totalQ} />
      </div>
      <h3 className="font-semibold mb-2">Instructions</h3>
      <ol className="list-decimal ml-5 space-y-1 text-gray-700">
        <li>Test cannot be paused. You can re-attempt in practice mode.</li>
        <li>Auto-submit when time ends.</li>
        <li>MCQs may have one correct answer.</li>
        <li>Negative marks may apply. Answer carefully.</li>
      </ol>
      <a className="mt-6 inline-flex px-6 py-3 rounded-xl bg-slate-800 text-white"
         href={`/tests/${code}/play`}>Start Test</a>
    </div>
  );
}
function Info({label, value}) {
  return <div className="bg-white rounded-xl shadow p-4 text-center">
    <div className="text-gray-500">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>;
}
