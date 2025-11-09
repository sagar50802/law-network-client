import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveIntake } from "../utils/researchDraftingApi";
import { motion } from "framer-motion";

const label =
  "block text-sm font-semibold mb-1 text-gray-700";
const input =
  "w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-300 outline-none transition-all duration-200";

export default function ResearchDrafting() {
  const nav = useNavigate();
  const [id, setId] = useState(null);
  const [tab, setTab] = useState("form");
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
    qualification: "",
    subject: "",
    title: "",
    nature: "auto",
    abstract: "",
    totalPages: "",
  });

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

  const bannerItems = [
    {
      img: "/ads/ai.png",
      text: "AI-Powered Draft Suggestions",
      color: "from-indigo-500 to-blue-500",
    },
    {
      img: "/ads/lawbooks.png",
      text: "Access 100+ Law Templates",
      color: "from-amber-500 to-orange-400",
    },
    {
      img: "/ads/research.png",
      text: "Auto-Assembled Research Drafts",
      color: "from-emerald-500 to-teal-400",
    },
    {
      img: "/ads/global.png",
      text: "Collaborate Globally with Scholars",
      color: "from-purple-500 to-pink-500",
    },
  ];

  const scrollingItems = [...bannerItems, ...bannerItems];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-10 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-8 drop-shadow-sm">
          Research Drafting Portal
        </h1>

        {/* ✅ Auto-Scrolling Image Banner */}
        <div className="relative overflow-hidden mb-10">
          <motion.div
            className="flex gap-8 whitespace-nowrap"
            animate={{ x: ["0%", "-100%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
          >
            {scrollingItems.map((b, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center bg-white/70 rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg hover:scale-[1.03] transition-all min-w-[250px] cursor-pointer"
              >
                {/* Banner Image */}
                <img
                  src={b.img}
                  alt={b.text}
                  className="w-full h-40 object-cover"
                />
                {/* Caption below image */}
                <div
                  className={`w-full py-3 text-center bg-gradient-to-r ${b.color} text-white font-semibold text-sm md:text-base`}
                >
                  {b.text}
                </div>
              </div>
            ))}
          </motion.div>

          {/* gradient fade edges */}
          <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-indigo-50 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-indigo-50 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* ---------- FORM ---------- */}
        {tab === "form" && (
          <div className="bg-white rounded-3xl shadow-md p-8 md:p-10 border border-gray-100 backdrop-blur-sm">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className={label}>Full Name</label>
                  <input
                    className={input}
                    placeholder="Enter your full name"
                    value={v.name}
                    onChange={(e) => setV({ ...v, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Email</label>
                    <input
                      className={input}
                      placeholder="example@email.com"
                      value={v.email}
                      onChange={(e) => setV({ ...v, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={label}>Phone</label>
                    <input
                      className={input}
                      placeholder="+91-XXXXXXXXXX"
                      value={v.phone}
                      onChange={(e) => setV({ ...v, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Gender</label>
                    <input
                      className={input}
                      placeholder="Male / Female / Other"
                      value={v.gender}
                      onChange={(e) => setV({ ...v, gender: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={label}>Place (City)</label>
                    <input
                      className={input}
                      placeholder="Your city"
                      value={v.place}
                      onChange={(e) => setV({ ...v, place: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Nationality</label>
                    <input
                      className={input}
                      value={v.nationality}
                      onChange={(e) =>
                        setV({ ...v, nationality: e.target.value })
                      }
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
                  <label className={label}>
                    University / College / School Name
                  </label>
                  <input
                    className={input}
                    placeholder="Ambedkar Law College"
                    value={v.instituteName}
                    onChange={(e) =>
                      setV({ ...v, instituteName: e.target.value })
                    }
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

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className={label}>Qualification</label>
                  <select
                    className={input}
                    value={v.qualification}
                    onChange={(e) =>
                      setV({ ...v, qualification: e.target.value })
                    }
                  >
                    <option value="">Select your qualification</option>
                    <option value="10">10th</option>
                    <option value="12">12th</option>
                    <option value="ug">Undergraduate (UG)</option>
                    <option value="pg">Postgraduate (PG)</option>
                    <option value="diploma">Diploma</option>
                    <option value="phd">PhD</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={label}>Research Subject</label>
                  <input
                    className={input}
                    value={v.subject}
                    onChange={(e) => setV({ ...v, subject: e.target.value })}
                    placeholder="Example: Constitutional Law"
                  />
                </div>

                <div>
                  <label className={label}>Research Title</label>
                  <input
                    className={input}
                    value={v.title}
                    onChange={(e) => setV({ ...v, title: e.target.value })}
                    placeholder="Enter research title"
                  />
                </div>

                <div>
                  <label className={label}>Nature of Research</label>
                  <div className="flex gap-4 mt-1">
                    {["doctrinal", "empirical", "auto"].map((n) => (
                      <label
                        key={n}
                        className="flex items-center gap-2 cursor-pointer"
                      >
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
                    placeholder="Write a short abstract or leave blank for auto-generation..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If empty, system will auto-suggest 250–450 words later.
                  </p>
                </div>

                <div>
                  <label className={label}>Total Pages</label>
                  <input
                    type="number"
                    className={input}
                    min="1"
                    placeholder="Enter number of pages (e.g. 6)"
                    value={v.totalPages}
                    onChange={(e) =>
                      setV({ ...v, totalPages: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-4 justify-center md:justify-end">
              <button
                onClick={() => handleSave("preview")}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow hover:shadow-lg transform hover:scale-105 transition-all"
              >
                Save & Preview
              </button>
              <button
                onClick={() => handleSave("choose")}
                className="px-6 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 font-medium shadow-sm transform hover:scale-105 transition-all"
              >
                Save & Next
              </button>
            </div>
          </div>
        )}

        {/* ---------- PREVIEW ---------- */}
        {tab !== "form" && tab !== "choose" && (
          <div className="mt-6 bg-white rounded-3xl p-8 border shadow-sm">
            <h3 className="font-bold text-lg mb-3 text-gray-800">
              Preview of your details
            </h3>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-xl border">
{`Name: ${v.name}
Email: ${v.email} | Phone: ${v.phone}
Gender: ${v.gender} | Place: ${v.place}
Nationality: ${v.nationality} | Country: ${v.country}
Institute: [${v.instituteType}] ${v.instituteName}
Qualification: ${v.qualification || "-"}
Subject: ${v.subject}
Title: ${v.title}
Nature: ${v.nature}
Total Pages: ${v.totalPages || "-"}
Abstract (preview): ${v.abstract?.slice(0, 180) || "(will be auto-suggested)"}${
  v.abstract?.length > 180 ? "..." : ""
}`}
            </pre>

            <div className="mt-6 flex flex-wrap gap-4 justify-center md:justify-end">
              <button
                className="px-6 py-2.5 rounded-xl border hover:bg-gray-50 font-medium transition-all"
                onClick={() => setTab("form")}
              >
                Back to Edit
              </button>
              <button
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow hover:shadow-lg transform hover:scale-105 transition-all"
                onClick={goChoose}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ---------- CHOOSE ---------- */}
        {tab === "choose" && (
          <div className="mt-8 bg-white rounded-3xl shadow-md p-8 text-center border">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Choose how you want to create your research draft
            </h2>
            <p className="text-gray-500 mb-6 text-sm">
              You can generate it automatically in your lab or connect with professionals for expert drafting.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow hover:shadow-lg transform hover:scale-105 transition-all"
                onClick={() => id && nav(`/research-drafting/lab/${id}`)}
              >
                Create in Your Lab
              </button>
              <a
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium shadow hover:shadow-lg transform hover:scale-105 transition-all"
                href={`https://wa.me/919999999999?text=${encodeURIComponent(
                  "Research Query regarding: " + (v.title || v.subject)
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Create with Professionals (Query)
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
