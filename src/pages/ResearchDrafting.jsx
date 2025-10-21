// client/src/pages/ResearchDrafting.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postJSON } from "../utils/api"; // uses your existing helper

// If you created a dedicated API helper, you can swap saveIntake to that.
// Keeping it inline so you can drop this file in and go.
async function saveIntake(payload, id) {
  const qs = id ? `?id=${encodeURIComponent(id)}` : "";
  return await postJSON(`/api/research-drafting/${qs}`, payload);
}

const label = "block text-sm font-semibold mb-1";
const input = "w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-200 outline-none";

export default function ResearchDrafting() {
  const nav = useNavigate();
  const [id, setId] = useState(null);
  const [tab, setTab] = useState("form"); // form → preview → choose
  const [v, setV] = useState({
    name: "", email: "", phone: "",
    gender: "", place: "", nationality: "", country: "",
    instituteType: "college", instituteName: "",
    qualifications: [], subject: "", title: "",
    nature: "auto", abstract: "", totalPages: 6,
  });

  function toggleQual(q) {
    setV((s) => {
      const i = s.qualifications.indexOf(q);
      const next = [...s.qualifications];
      if (i >= 0) next.splice(i, 1);
      else next.push(q);
      return { ...s, qualifications: next };
    });
  }

  async function handleSave(nextTab) {
    const r = await saveIntake(v, id);
    if (r?.ok) {
      setId(r.draft._id);
      if (nextTab) setTab(nextTab);
    }
  }

  function goChoose() {
    handleSave("choose");
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">Research Drafting</h1>

      {tab === "form" && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* left */}
          <div className="space-y-3">
            <div>
              <label className={label}>Full Name</label>
              <input className={input} value={v.name} onChange={e=>setV({...v,name:e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Email</label>
                <input className={input} value={v.email} onChange={e=>setV({...v,email:e.target.value})}/>
              </div>
              <div>
                <label className={label}>Phone</label>
                <input className={input} value={v.phone} onChange={e=>setV({...v,phone:e.target.value})}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Gender</label>
                <input className={input} value={v.gender} onChange={e=>setV({...v,gender:e.target.value})}/>
              </div>
              <div>
                <label className={label}>Place (City)</label>
                <input className={input} value={v.place} onChange={e=>setV({...v,place:e.target.value})}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Nationality</label>
                <input className={input} value={v.nationality} onChange={e=>setV({...v,nationality:e.target.value})}/>
              </div>
              <div>
                <label className={label}>Country</label>
                <input className={input} value={v.country} onChange={e=>setV({...v,country:e.target.value})}/>
              </div>
            </div>
            <div>
              <label className={label}>University / College / School Name</label>
              <input className={input} value={v.instituteName} onChange={e=>setV({...v,instituteName:e.target.value})}/>
            </div>
            <div>
              <label className={label}>Institute Type</label>
              <select className={input} value={v.instituteType} onChange={e=>setV({...v,instituteType:e.target.value})}>
                <option value="school">School</option>
                <option value="college">College</option>
                <option value="university">University</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* right */}
          <div className="space-y-3">
            <div>
              <label className={label}>Qualifications</label>
              <div className="flex flex-wrap gap-2">
                {["10","12","ug","pg","diploma","phd"].map(q=>(
                  <button key={q}
                    type="button"
                    onClick={()=>toggleQual(q)}
                    className={`px-3 py-1 rounded-full border ${v.qualifications.includes(q)?"bg-indigo-600 text-white":"bg-white"}`}>
                    {q.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={label}>Research Subject</label>
              <input className={input} value={v.subject} onChange={e=>setV({...v,subject:e.target.value})}/>
            </div>
            <div>
              <label className={label}>Research Title</label>
              <input className={input} value={v.title} onChange={e=>setV({...v,title:e.target.value})}/>
            </div>

            <div>
              <label className={label}>Nature of Research</label>
              <div className="flex gap-3">
                {["doctrinal","empirical","auto"].map(n=>(
                  <label key={n} className="flex items-center gap-2">
                    <input type="radio" checked={v.nature===n} onChange={()=>setV({...v,nature:n})}/>
                    <span className="capitalize">{n}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={label}>Abstract (optional)</label>
              <textarea className={input} rows={6} value={v.abstract} onChange={e=>setV({...v,abstract:e.target.value})}/>
              <p className="text-xs text-gray-500">If empty, system will auto-suggest 250–450 words later.</p>
            </div>

            <div>
              <label className={label}>Total Pages</label>
              <select className={input} value={v.totalPages} onChange={e=>setV({...v,totalPages:Number(e.target.value)})}>
                {[1,2,3,4,5,6,8,10,12,15,20].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {tab !== "form" && (
        <div className="mt-4 p-4 border rounded-2xl bg-white">
          <h3 className="font-bold mb-2">Preview of your details</h3>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
{`Name: ${v.name}
Email: ${v.email} | Phone: ${v.phone}
Gender: ${v.gender} | Place: ${v.place}
Nationality: ${v.nationality} | Country: ${v.country}
Institute: [${v.instituteType}] ${v.instituteName}
Qualifications: ${v.qualifications.join(", ") || "-"}
Subject: ${v.subject}
Title: ${v.title}
Nature: ${v.nature}
Total Pages: ${v.totalPages}
Abstract (preview): ${v.abstract?.slice(0,180) || "(will be auto-suggested)"}${(v.abstract?.length>180)?"...":""}`}
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        {tab === "form" && (
          <>
            <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white" onClick={()=>handleSave("preview")}>
              Save & Preview
            </button>
            <button className="px-4 py-2 rounded-xl border" onClick={()=>handleSave("choose")}>
              Save & Next
            </button>
          </>
        )}
        {tab === "preview" && (
          <>
            <button className="px-4 py-2 rounded-xl border" onClick={()=>setTab("form")}>Back to Edit</button>
            <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white" onClick={goChoose}>
              Next
            </button>
          </>
        )}
        {tab === "choose" && (
          <>
            <button className="px-4 py-2 rounded-xl border" onClick={()=>setTab("form")}>
              Back & Edit
            </button>
            {/* This navigates to your existing LabFlow route */}
            <button
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
              onClick={()=> id && nav(`/research-drafting/lab/${id}`)}
            >
              Create in Your Lab
            </button>
            {/* Hand-off to professionals via WhatsApp query */}
            <a
              className="px-4 py-2 rounded-xl bg-amber-600 text-white"
              href={`https://wa.me/919999999999?text=${encodeURIComponent("Research Query regarding: " + (v.title||v.subject))}`}
              target="_blank" rel="noreferrer"
            >
              Create with Professionals (Query)
            </a>
          </>
        )}
      </div>
    </div>
  );
}
