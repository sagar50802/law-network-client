import html2canvas from "html2canvas";
import { useState } from "react";

export default function ShareCard({ slide, orientation = "landscape", onDone }) {
  const [loading, setLoading] = useState(false);

  if (!slide) return null;

  const avatarImg = `/avatars/${(slide.avatars?.[0]?.avatarType || "lawyer").toLowerCase()}.png`;
  const programLabel = {
    LEGAL_NEWS: "LEGAL NEWS",
    HISTORY: "HISTORY SPECIAL",
    POLICE: "CRIME & POLICE",
    INFO: "INFO & TECH",
    DEBATE: "DEBATE LIVE",
  }[slide.programType] || "LAWNETWORK LIVE";

  const bullets = slide.content
    ?.split(/[\n.]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 10)
    .slice(0, 4);

  async function generateImage() {
    setLoading(true);
    const element = document.getElementById("share-card-preview");
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const dataURL = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `${slide.title.replace(/\s+/g, "_")}.png`;
    link.click();

    setLoading(false);
    onDone?.();
  }

  return (
    <div className="mt-4 text-center">
      <div
        id="share-card-preview"
        className={`relative overflow-hidden text-white font-sans rounded-2xl shadow-2xl border-4 border-[#c7a537]/80 ${
          orientation === "portrait" ? "w-[360px] h-[640px]" : "w-[800px] h-[450px]"
        }`}
        style={{
          background: "radial-gradient(circle at top left, #111 0%, #000 70%)",
        }}
      >
        {/* Header Bar */}
        <div className="flex justify-between items-center px-4 py-2 bg-gradient-to-r from-black to-neutral-900 border-b border-[#c7a537]/40">
          <div className="flex items-center gap-2">
            <span className="text-[#c7a537] font-extrabold tracking-wide">
              LAWNETWORK LIVE
            </span>
            <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-red-700 text-white px-2 py-0.5 text-xs rounded-full font-semibold shadow-md animate-pulse">
              LIVE
            </span>
            <span className="text-[#facc15] font-medium text-sm">{programLabel}</span>
          </div>
        </div>

        {/* Main Content */}
        <div
          className={`flex ${
            orientation === "portrait" ? "flex-col items-center" : "flex-row items-center"
          } p-5 gap-4`}
        >
          <div className="flex-shrink-0 flex justify-center">
            <img
              src={avatarImg}
              alt="avatar"
              className={`rounded-full border-4 border-[#c7a537] shadow-[0_0_25px_rgba(199,165,55,0.4)] ${
                orientation === "portrait" ? "w-36 h-36 mb-4" : "w-32 h-32"
              }`}
            />
          </div>

          <div
            className={`flex flex-col ${
              orientation === "portrait" ? "text-center items-center" : "text-left"
            }`}
          >
            <h2
              className="text-2xl md:text-3xl font-extrabold mb-3 bg-gradient-to-r from-[#facc15] via-[#eab308] to-[#c7a537] bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(250,204,21,0.4)]"
            >
              {slide.title}
            </h2>
            <ul className="space-y-1.5 text-sm md:text-base text-gray-200">
              {bullets.map((b, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-[#facc15]">⚖️</span>
                  <span className="leading-snug">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 w-full flex justify-between items-center text-xs bg-gradient-to-r from-black via-neutral-900 to-black px-4 py-1 border-t border-[#c7a537]/40 text-gray-300">
          <span>Law Network – LAWPREPX</span>
          <span>🌐 lawnetwork.in</span>
        </div>
      </div>

      <button
        onClick={generateImage}
        disabled={loading}
        className={`mt-3 ${
          loading ? "bg-gray-400" : "bg-[#c7a537] hover:bg-yellow-400"
        } text-black font-semibold px-4 py-2 rounded-lg transition`}
      >
        {loading ? "⏳ Generating..." : "📸 Generate Story Card"}
      </button>
    </div>
  );
}
