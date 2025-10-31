import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveIntake } from "../utils/researchDraftingApi";

const label = "block text-sm font-semibold mb-1 text-gray-700";
const input =
  "w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-300 outline-none transition-all duration-200";

export default function ResearchDrafting() {
  const nav = useNavigate();
  const [id, setId] = useState(null);
  const [tab, setTab] = useState("form"); // form → preview → choose
  const [v, setV] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    place: "",
    nationality: "",
    country: "",
    instituteType: "college",
    instituteName: "",
    qualifications: [],
    subject: "",
    title: "",
    nature: "auto",
    abstract: "",
    totalPages: "",
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
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Research Drafting</h1>

      {/* ---------- FORM ---------- */}
      {tab === "form" && (
        <div className="grid md:grid-cols-2 gap-6 bg-white rounded-2xl p-6 shadow-sm">
          {/* Left side */}
          <div className="space-y-4">
            <div>
              <label className={label}>Full Name</label>
              <input
                className={input}
                value={v.name}
                onChange={(e) => setV({ ...v, name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Email</label>
                <input
                  className={input}
                  type="email"
                  value={v.email}
                  onChange={(e) => setV({ ...v, email: e.target.value })}
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <label className={label}>Phone</label>
                <input
                  className={input}
                  value={v.phone}
                  onChange={(e) => setV({ ...v, phone: e.target.value })}
                  placeholder="+91-XXXXXXXXXX"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Gender</label>
                <input
                  className={input}
                  value={v.gender}
                  onChange={(e) => setV({ ...v, gender: e.target.value })}
                  placeholder="Male / Female / Other"
                />
              </div>
              <div>
                <label className={label}>Place (City)</label>
                <input
                  className={input}
                  value={v.place}
                  onChange={(e) => setV({ ...v, place: e.target.value })}
                  placeholder="Your city"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Nationality</label>
                <input
                  className={input}
                  value={v.nationality}
                  onChange={(e) => setV({ ...v, nationality: e.target.value })}
                />
              </div>
              <div>
                <label className={label}>Country</label>
                <input
                  className={input}
                  value={v.country}
                  onChange={(e) => setV({ ...v, country: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className={label}>University / College / School Name</label>
              <input
                className={input}
                value={v.instituteName}
                onChange={(e) =>
                  setV({ ...v, instituteName: e.target.value })
                }
                placeholder="Ambedkar Law College"
              />
            </div>

            <div>
              <label className={label}>Institute Type</label>
              <select
                className={input}
                value={v.instituteType}
                onChange={(e) =>
                  setV({ ...v, instituteType: e.target.value })
                }
              >
                <option value="school">School</option>
                <option value="college">College</option>
                <option value="university">University</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Right side */}
          <div className="space-y-4">
            <div>
              <label className={label}>Qualifications</label>
              <div className="flex flex-wrap gap-2">
                {["10", "12", "ug", "pg", "diploma", "phd"].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => toggleQual(q)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                      v.qualifications.includes(q)
                        ? "bg-indigo-600 text-white shadow-md scale-105"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {q.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={label}>Research Subject</label>
              <input
                className={input}
                value={v.subject}
                onChange={(e) => setV({ ...v, subject: e.target.value })}
              />
            </div>

            <div>
              <label className={label}>Research Title</label>
              <input
                className={input}
                value={v.title}
                onChange={(e) => setV({ ...v, title: e.target.value })}
              />
            </div>

            <div>
              <label className={label}>Nature of Research</label>
              <div className="flex gap-4 mt-1">
                {["doctrinal", "empirical", "auto"].map((n) => (
                  <label key={n} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={v.nature === n}
                      onChange={() => setV({ ...v, nature: n })}
                    />
                    <span className="capitalize">{n}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={label}>Abstract (optional)</label>
              <textarea
                className={input}
                rows={6}
                value={v.abstract}
                onChange={(e) => setV({ ...v, abstract: e.target.value })}
                placeholder="Write short abstract or leave blank for auto generation..."
              />
              <p className="text-xs text-gray-500">
                If empty, system will auto-suggest 250–450 words later.
              </p>
            </div>

            <div>
              <label className={label}>Total Pages</label>
              <input
                type="number"
                min="1"
                className={input}
                value={v.totalPages}
                onChange={(e) =>
                  setV({ ...v, totalPages: Number(e.target.value) })
                }
                placeholder="Enter number of pages (e.g. 6)"
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------- PREVIEW ---------- */}
      {tab !== "form" && (
        <div className="mt-6 bg-white rounded-2xl p-6 border shadow-sm">
          <h3 className="font-bold text-lg mb-3 text-gray-800">
            Preview of your details
          </h3>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-xl border">
{`Name: ${v.name}
Email: ${v.email} | Phone: ${v.phone}
Gender: ${v.gender} | Place: ${v.place}
Nationality: ${v.nationality} | Country: ${v.country}
Institute: [${v.instituteType}] ${v.instituteName}
Qualifications: ${v.qualifications.join(", ") || "-"}
Subject: ${v.subject}
Title: ${v.title}
Nature: ${v.nature}
Total Pages: ${v.totalPages || "-"}
Abstract (preview): ${
  v.abstract?.slice(0, 180) || "(will be auto-suggested)"
}${v.abstract?.length > 180 ? "..." : ""}`}
          </pre>
        </div>
      )}

      {/* ---------- ACTION BUTTONS ---------- */}
      <div className="mt-6 flex flex-wrap gap-3">
        {tab === "form" && (
          <>
            <button
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
              onClick={() => handleSave("preview")}
            >
              Save & Preview
            </button>
            <button
              className="px-5 py-2.5 rounded-xl border hover:bg-gray-50 transition-all"
              onClick={() => handleSave("choose")}
            >
              Save & Next
            </button>
          </>
        )}

        {tab === "preview" && (
          <>
            <button
              className="px-5 py-2.5 rounded-xl border hover:bg-gray-50 transition-all"
              onClick={() => setTab("form")}
            >
              Back to Edit
            </button>
            <button
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
              onClick={goChoose}
            >
              Next
            </button>
          </>
        )}

        {tab === "choose" && (
          <>
            <button
              className="px-5 py-2.5 rounded-xl border hover:bg-gray-50 transition-all"
              onClick={() => setTab("form")}
            >
              Back & Edit
            </button>
            <button
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all"
              onClick={() => id && nav(`/research-drafting/lab/${id}`)}
            >
              Create in Your Lab
            </button>
            <a
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow-md transition-all"
              href={`https://wa.me/919999999999?text=${encodeURIComponent(
                "Research Query regarding: " + (v.title || v.subject)
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Create with Professionals (Query)
            </a>
          </>
        )}
      </div>
    </div>
  );
}
