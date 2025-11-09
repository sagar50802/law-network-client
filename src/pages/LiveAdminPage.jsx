import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import html2canvas from "html2canvas";
import ShareCard from "../components/live/ShareCard";

const API_URL = import.meta.env.VITE_API_URL;
const ADMIN_KEY = "LAWNOWNER2025";

export default function LiveAdminPage() {
  const [slides, setSlides] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [tickerText, setTickerText] = useState("");
  const [creatingCard, setCreatingCard] = useState(null);

  const [form, setForm] = useState({
    programType: "LEGAL_NEWS",
    programName: "",
    title: "",
    content: "",
    avatars: [],
  });

  /* ============================================================
     🔄 Load slides & tickers
  ============================================================ */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [slidesRes, tickersRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/live/slides`, {
          headers: { "x-admin-key": ADMIN_KEY },
        }),
        fetch(`${API_URL}/api/admin/live/tickers`, {
          headers: { "x-admin-key": ADMIN_KEY },
        }),
      ]);
      setSlides(await slidesRes.json());
      setTickers(await tickersRes.json());
    } catch (err) {
      console.error("❌ Failed to load admin data:", err);
    }
  }

  /* ============================================================
     💾 Save slide
  ============================================================ */
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/admin/live/slide`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": ADMIN_KEY,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("❌ Failed to save:", res.status, errData);
        alert(`Failed: ${res.status} - ${errData.error || "Unknown error"}`);
        return;
      }

      alert("✅ Slide saved successfully!");
      setForm({
        programType: "LEGAL_NEWS",
        programName: "",
        title: "",
        content: "",
        avatars: [],
      });
      loadData();
    } catch (err) {
      console.error("❌ Network error:", err);
      alert("Network error — could not save slide.");
    }
  }

  /* ============================================================
     📰 Add / delete tickers
  ============================================================ */
  async function handleAddTicker() {
    if (!tickerText.trim()) return;
    await fetch(`${API_URL}/api/admin/live/ticker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY,
      },
      body: JSON.stringify({ text: tickerText }),
    });
    setTickerText("");
    loadData();
  }

  async function handleDeleteTicker(id) {
    await fetch(`${API_URL}/api/admin/live/ticker/${id}`, {
      method: "DELETE",
      headers: { "x-admin-key": ADMIN_KEY },
    });
    loadData();
  }

  /* ============================================================
     🧾 Delete slides
  ============================================================ */
  async function handleDeleteSlide(id) {
    if (!confirm("Delete this slide?")) return;
    await fetch(`${API_URL}/api/admin/live/slide/${id}`, {
      method: "DELETE",
      headers: { "x-admin-key": ADMIN_KEY },
    });
    loadData();
  }

  /* ============================================================
     📡 Generate & Share LawNetwork Chat-Preview Card
     (WhatsApp / Telegram style)
  ============================================================ */
  async function handleShareSlide(slide) {
    setCreatingCard(slide.title);

    // 🧱 Build compact horizontal preview card (like WhatsApp link preview)
    const temp = document.createElement("div");
    temp.style.position = "fixed";
    temp.style.top = "-9999px";
    temp.style.left = "-9999px";
    temp.style.width = "900px";
    temp.style.height = "470px";
    temp.style.borderRadius = "16px";
    temp.style.overflow = "hidden";
    temp.style.display = "flex";
    temp.style.flexDirection = "row";
    temp.style.alignItems = "stretch";
    temp.style.background = "linear-gradient(135deg, #111, #1a1a1a)";
    temp.style.border = "2px solid #c7a537";
    temp.style.fontFamily = "Poppins, sans-serif";
    temp.style.color = "#fff";
    temp.style.boxShadow = "0 0 40px rgba(255,215,0,0.25)";
    temp.style.padding = "0";

    // 🪶 Prepare content teaser
    const teaser = (slide.content || "")
      .split(/[.!?]/)
      .filter((s) => s.trim())
      .slice(0, 2)
      .join(". ");

    // 💎 Fill HTML for left + right sections
    temp.innerHTML = `
      <div style="flex: 0 0 40%; background: radial-gradient(circle at top left, #2b0000, #000); display:flex;align-items:center;justify-content:center;padding:16px;">
        <img src="/avatars/${(slide.avatars?.[0]?.avatarType || "lawyer").toLowerCase()}.png"
             alt="avatar"
             style="width: 90%; border-radius: 12px; border: 3px solid gold; box-shadow: 0 0 25px rgba(255,215,0,0.4); object-fit: cover;">
      </div>

      <div style="flex: 1; padding: 24px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <span style="color:gold; font-weight:bold; font-size:1rem;">LAWNETWORK LIVE</span>
            <span style="background:red; color:white; padding:2px 6px; border-radius:4px; font-size:0.8rem;">LIVE NOW</span>
            <span style="font-size:0.8rem; color:#facc15;">${slide.programType?.replace(/_/g, " ") || "LEGAL NEWS"}</span>
          </div>
          <h2 style="font-size:1.6rem; color:gold; margin-bottom:10px; line-height:1.3;">${slide.title}</h2>
          <p style="font-size:1rem; color:#ddd; line-height:1.5;">
            ${teaser}...
          </p>
        </div>
        <div style="border-top:1px solid rgba(255,215,0,0.2); padding-top:8px; display:flex; justify-content:space-between; align-items:center; font-size:0.9rem;">
          <span style="color:#facc15;">🌐 lawnetwork.in</span>
          <span style="opacity:0.8;">Law Network – LAWPREPX</span>
        </div>
      </div>
    `;

    document.body.appendChild(temp);

    // 🧾 Capture + remove
   const canvas = await html2canvas(temp, {
  scale: 2,
  useCORS: true,
  backgroundColor: "#000",
  onclone: (clonedDoc) => {
    // Select all nodes in the cloned DOM
    clonedDoc.querySelectorAll("*").forEach((el) => {
      // Inline style fix for all color properties that html2canvas parses
      const s = el.getAttribute("style") || "";

      // Replace any oklch/oklab in inline styles directly
      if (s.includes("oklch(") || s.includes("oklab(")) {
        el.setAttribute(
          "style",
          s
            .replace(/oklch\([^)]+\)/g, "#c7a537")
            .replace(/oklab\([^)]+\)/g, "#c7a537")
        );
      }

      // Also sanitize computed styles if present
      const styles = clonedDoc.defaultView.getComputedStyle(el);
      ["background", "backgroundColor", "color", "borderColor"].forEach((prop) => {
        const val = styles[prop];
        if (val && (val.includes("oklch(") || val.includes("oklab("))) {
          el.style[prop] = val
            .replace(/oklch\([^)]+\)/g, "#c7a537")
            .replace(/oklab\([^)]+\)/g, "#c7a537");
        }
      });
    });
  },
});


    document.body.removeChild(temp);

    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    const file = new File([blob], "LawNetwork-Preview.png", { type: "image/png" });

    // 📤 Share or fallback to download
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: slide.title,
          text: `${slide.title} — Watch full story live on LawNetwork.`,
          files: [file],
        });
      } else {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "LawNetwork-Preview.png";
        link.click();
        alert("Sharing not supported — image downloaded.");
      }
    } catch (err) {
      console.error("❌ Share failed:", err);
    }

    setCreatingCard(null);
  }

  /* ============================================================
     👤 Avatar management (with Voice Selector)
  ============================================================ */
  function addAvatar() {
    setForm({
      ...form,
      avatars: [
        ...form.avatars,
        {
          code: `A${form.avatars.length + 1}`,
          name: "",
          role: "",
          avatarType: "LAWYER",
          voiceName: "",
        },
      ],
    });
  }

  function handleAvatarChange(i, field, value) {
    const newAvatars = [...form.avatars];
    newAvatars[i] = { ...newAvatars[i], [field]: value };
    setForm({ ...form, avatars: newAvatars });
  }

  // Prefill default avatar when type changes
  useEffect(() => {
    if (form.avatars.length === 0) {
      let defaults = [];
      switch (form.programType) {
        case "LEGAL_NEWS":
          defaults = [{ name: "Anchor", role: "Host", avatarType: "LAWYER" }];
          break;
        case "POLICE":
          defaults = [{ name: "Officer", role: "Host", avatarType: "POLICE" }];
          break;
        case "HISTORY":
          defaults = [{ name: "Historian", role: "Narrator", avatarType: "HISTORY" }];
          break;
        case "INFO":
          defaults = [{ name: "Reporter", role: "Anchor", avatarType: "IT" }];
          break;
        default:
          break;
      }
      setForm((f) => ({ ...f, avatars: defaults }));
    }
  }, [form.programType]);

  /* ============================================================
     🖼️ UI RENDER
  ============================================================ */
  return (
    <div className="p-6 min-h-screen bg-black text-white font-sans">
      <h1 className="text-3xl font-bold text-[#c7a537] mb-6">
        🎥 LawNetwork LIVE Studio Console
      </h1>

      {/* --- Create Slide --- */}
      <div className="grid grid-cols-3 gap-6">
        <form
          onSubmit={handleSubmit}
          className="col-span-2 bg-neutral-900 border border-[#c7a537]/40 rounded-xl p-4 shadow-lg"
        >
          <h2 className="text-xl text-[#c7a537] font-semibold mb-3">
            Create Program
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <label>
              Type:
              <select
                value={form.programType}
                onChange={(e) =>
                  setForm({ ...form, programType: e.target.value, avatars: [] })
                }
                className="w-full bg-black border border-[#c7a537] text-white p-2 rounded"
              >
                <option value="LEGAL_NEWS">Legal News</option>
                <option value="DEBATE">Debate</option>
                <option value="POLICE">Police</option>
                <option value="HISTORY">History</option>
                <option value="INFO">Information</option>
              </select>
            </label>

            <label>
              Program Name:
              <input
                className="w-full bg-black border border-[#c7a537] p-2 rounded"
                value={form.programName}
                onChange={(e) =>
                  setForm({ ...form, programName: e.target.value })
                }
                placeholder="Politics Ki Baat"
              />
            </label>

            <label className="col-span-2">
              Title:
              <input
                className="w-full bg-black border border-[#c7a537] p-2 rounded"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="Headline"
              />
            </label>

            <label className="col-span-2">
              Main Content:
              <textarea
                className="w-full bg-black border border-[#c7a537] p-2 rounded"
                rows={5}
                value={form.content}
                onChange={(e) =>
                  setForm({ ...form, content: e.target.value })
                }
              />
            </label>
          </div>

          {/* Avatars Section */}
          <div className="mt-4 border-t border-[#c7a537]/40 pt-3">
            <h3 className="text-lg text-[#c7a537] mb-2">Program Avatars</h3>

            {form.avatars.map((av, i) => (
              <div
                key={i}
                className="flex flex-col md:flex-row items-center gap-3 mb-3 bg-neutral-800 p-3 rounded-xl border border-[#c7a537]/20"
              >
                <img
                  src={`/avatars/${av.avatarType.toLowerCase()}.png`}
                  alt={av.avatarType}
                  className="w-16 h-16 rounded-full border-2 border-[#c7a537] object-cover"
                />

                <div className="flex flex-col flex-grow w-full">
                  <input
                    className="bg-black border border-[#c7a537] p-1 rounded text-white mb-1"
                    placeholder="Name"
                    value={av.name}
                    onChange={(e) =>
                      handleAvatarChange(i, "name", e.target.value)
                    }
                  />
                  <input
                    className="bg-black border border-[#c7a537] p-1 rounded text-white mb-1"
                    placeholder="Role"
                    value={av.role}
                    onChange={(e) =>
                      handleAvatarChange(i, "role", e.target.value)
                    }
                  />

                  {/* 🎙 Voice Selector + Test Button */}
                  <div className="mt-2">
                    <label className="text-xs text-[#c7a537] block mb-1">
                      Select Voice:
                    </label>
                    <select
                      className="w-full bg-black border border-[#c7a537] p-1 rounded text-white text-sm"
                      value={av.voiceName || ""}
                      onChange={(e) =>
                        handleAvatarChange(i, "voiceName", e.target.value)
                      }
                    >
                      <option value="">Auto (Default)</option>
                      {(window.speechSynthesis?.getVoices?.() || []).map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>

                    {/* 🔊 Voice Test Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const voices =
                          window.speechSynthesis?.getVoices?.() || [];
                        const voice = voices.find(
                          (v) => v.name === av.voiceName
                        );
                        if (voice) {
                          const u = new SpeechSynthesisUtterance(
                            `Hello, I am ${av.name || "this avatar"} speaking using ${voice.name}`
                          );
                          u.voice = voice;
                          u.lang = voice.lang;
                          window.speechSynthesis.speak(u);
                        } else {
                          alert(
                            "⚠️ Voice not loaded yet. Please wait or reload voices."
                          );
                        }
                      }}
                      className="mt-1 bg-[#c7a537] text-black text-xs px-2 py-1 rounded hover:bg-yellow-400"
                    >
                      🔊 Test Voice
                    </button>
                  </div>
                </div>

                {/* Avatar Type Buttons */}
                <div className="flex gap-2">
                  {["LAWYER", "POLICE", "IT", "HISTORY"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        handleAvatarChange(i, "avatarType", type)
                      }
                      className={`p-1 rounded-full border-2 ${
                        av.avatarType === type
                          ? "border-[#c7a537] bg-[#c7a537]/20"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                      title={type}
                    >
                      <img
                        src={`/avatars/${type.toLowerCase()}.png`}
                        alt={type}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addAvatar}
              className="bg-[#c7a537] text-black px-3 py-1 rounded hover:bg-yellow-400 font-semibold"
            >
              + Add Avatar
            </button>
          </div>

          <button
            type="submit"
            className="mt-4 bg-green-500 hover:bg-green-600 px-4 py-2 rounded text-black font-bold"
          >
            🚀 Save & Go Live
          </button>
        </form>

        {/* --- Live Preview --- */}
        <div className="bg-neutral-900 border border-[#c7a537]/40 rounded-xl p-3">
          <h2 className="text-lg font-semibold text-[#c7a537] mb-2">
            Live Preview
          </h2>
          <div className="h-64 bg-gradient-to-b from-black to-neutral-900 border border-[#c7a537]/30 rounded flex flex-col justify-center items-center text-center text-gray-300">
            <h3 className="text-xl text-[#c7a537] mb-1">
              {form.title || "Your Headline"}
            </h3>
            <p className="px-2 text-sm text-gray-400">
              {form.content.slice(0, 100) ||
                "Your live content will appear here..."}
            </p>
          </div>
          {/* ✅ ShareCard preview section */}
          <div className="mt-4 space-y-3">
            <ShareCard slide={form} orientation="landscape" />
            <ShareCard slide={form} orientation="portrait" />
          </div>
        </div>
      </div>

      {/* --- Ticker Manager --- */}
      <div className="mt-8 bg-neutral-900 border border-[#c7a537]/40 rounded-xl p-4">
        <h2 className="text-lg font-semibold text-[#c7a537] mb-3">
          Ticker / Bulletin Manager
        </h2>
        <div className="flex gap-2 mb-3">
          <input
            value={tickerText}
            onChange={(e) => setTickerText(e.target.value)}
            className="flex-grow bg-black border border-[#c7a537] p-2 rounded text-white"
            placeholder="Breaking News..."
          />
          <button
            onClick={handleAddTicker}
            className="bg-[#c7a537] text-black px-4 py-2 rounded hover:bg-yellow-400"
          >
            ➕ Add
          </button>
        </div>
        <div className="space-y-2">
          {tickers.map((t) => (
            <div
              key={t._id}
              className="flex justify-between bg-neutral-800 p-2 rounded"
            >
              <span>{t.text}</span>
              <button
                onClick={() => handleDeleteTicker(t._id)}
                className="text-red-400 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* --- Slides List --- */}
      <div className="mt-8 bg-neutral-900 border border-[#c7a537]/40 rounded-xl p-4">
        <h2 className="text-lg font-semibold text-[#c7a537] mb-3">
          Current Slides
        </h2>
        {slides.map((s) => (
          <div
            key={s._id}
            className="flex justify-between items-start border-b border-[#c7a537]/20 py-2"
          >
            <div>
              <strong className="text-[#c7a537]">{s.title}</strong>
              <div className="text-sm text-gray-400">{s.programType}</div>
              <div className="text-xs text-gray-500">
                {s.content.slice(0, 120)}...
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <button
                onClick={() => handleShareSlide(s)}
                className="text-green-400 hover:text-green-600"
              >
                📤 Share
              </button>
              <button
                onClick={() => handleDeleteSlide(s._id)}
                className="text-red-400 hover:text-red-600"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ Loading overlay (indicator) */}
      {creatingCard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="animate-pulse text-[#c7a537] text-2xl font-semibold">
            🪄 Creating Story Card...
          </div>
          <p className="text-gray-300 mt-2 text-sm">{creatingCard}</p>
        </div>
      )}
    </div>
  );
}
