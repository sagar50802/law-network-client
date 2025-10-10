import { useMemo, useState } from "react";
import { postJSON } from "../../utils/api";

/** Parse your raw pasted text into {paper, code, title, questions[]} */
function parseRaw(raw) {
  // normalize
  const text = raw.replace(/\r/g,"").trim();

  // split by question numbers like "10." "11." at line starts
  const parts = text.split(/\n\s*(?=\d+\.\s)/g);

  const qs = [];
  for (const block of parts) {
    const mNum = block.match(/^(\d+)\.\s*(.*)$/s);
    if (!mNum) continue;
    const n = Number(mNum[1]);
    const rest = mNum[2];

    // capture options like (a) ... newlines
    const optionMatches = [...rest.matchAll(/\(([a-dA-D])\)\s*([^\n]+)(?:\n|$)/g)];
    let qText = rest.split(/\n/)[0]; // first line after the number
    if (optionMatches.length >= 2) {
      // Better question text: everything before first option marker
      const firstOptIdx = rest.search(/\([a-dA-D]\)\s/);
      if (firstOptIdx > 0) qText = rest.slice(0, firstOptIdx).trim();
    }

    const options = optionMatches.map(m => m[2].trim());

    // answer letter
    let ansIdx = null;
    const mAns = block.match(/Ans\.\s*\(([a-dA-D])\)/i);
    if (mAns) ansIdx = "ABCD".indexOf(mAns[1].toUpperCase());

    // explanation (anything after "See the explanation" or plain paragraph after Ans.)
    let expl = "";
    const explMatch = block.match(/Ans\.[^\n]*\n([\s\S]*)$/i);
    if (explMatch) expl = explMatch[1].trim();

    // source (grab lines containing years like 2013/2020/2024 in block tail)
    const sourceMatch = block.match(/(?:\d{4}[^.\n]*)+$/m);
    const source = sourceMatch ? sourceMatch[0].trim() : "";

    if (qText && options.length) {
      qs.push({ n, q: qText, options, ans: ansIdx ?? 0, expl, source });
    }
  }
  return qs.sort((a,b)=>a.n-b.n);
}

export default function AdminTestImporter() {
  const [paper, setPaper] = useState("UP Judicial Services Prelims Paper 1");
  const [title, setTitle] = useState("Mock Test - 1");
  const [code, setCode] = useState("upjs-paper1-mock1");
  const [raw, setRaw] = useState("");
  const parsed = useMemo(() => parseRaw(raw), [raw]);

  async function save() {
    const ownerKey = localStorage.getItem("ownerKey") || "";
    try {
      await postJSON("/testseries/admin/create", {
        paper, title, code,
        durationMin: 120, totalMarks: parsed.length,
        questions: parsed
      }, ownerKey ? { "X-Owner-Key": ownerKey } : {});
      alert("Saved!");
    } catch (e) {
      alert("Save failed");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-xl font-semibold mb-3">Admin — Import Test (Paste Only)</h2>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <input className="border rounded-lg px-3 py-2" value={paper} onChange={e=>setPaper(e.target.value)} placeholder="Paper"/>
        <input className="border rounded-lg px-3 py-2" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title"/>
        <input className="border rounded-lg px-3 py-2" value={code} onChange={e=>setCode(e.target.value)} placeholder="Unique code (slug)"/>
      </div>
      <textarea className="w-full h-64 border rounded-xl p-3 font-mono"
        placeholder="Paste questions text here (like your example)…"
        value={raw} onChange={e=>setRaw(e.target.value)} />

      <div className="flex items-center justify-between mt-3">
        <div className="text-sm text-gray-600">{parsed.length} questions parsed</div>
        <button onClick={save} className="px-5 py-2 rounded-xl bg-slate-800 text-white">Save Test</button>
      </div>

      {/* preview */}
      <div className="mt-6">
        {parsed.slice(0,5).map(q=>(
          <div key={q.n} className="bg-white rounded-xl shadow p-4 mb-3">
            <div className="text-gray-500 mb-1">Q{q.n}</div>
            <div className="font-medium mb-2">{q.q}</div>
            <ul className="text-sm text-gray-700">
              {q.options.map((o,i)=><li key={i}>{String.fromCharCode(65+i)}. {o}</li>)}
            </ul>
            {q.expl && <div className="mt-2 text-xs text-gray-600"><b>Expl:</b> {q.expl.slice(0,160)}...</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
