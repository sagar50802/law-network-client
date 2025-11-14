// client/src/components/Magazine/MagazineTemplates.jsx

function Watermark() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <span className="text-5xl md:text-7xl font-extrabold tracking-[0.6em] text-white/5 rotate-[-18deg]">
        LA W P R E P X
      </span>
    </div>
  );
}

export function CoverTemplate({ issueTitle, issueSubtitle, localTitle, slide, pageIndex }) {
  const displayTitle = localTitle || issueTitle;
  const displaySubtitle = issueSubtitle || "LawPrepX Magazine";

  return (
    <div
      className="relative h-full w-full rounded-3xl overflow-hidden shadow-2xl bg-black text-white"
      style={{
        backgroundImage: `url(${slide.backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <Watermark />

      <div className="relative h-full flex flex-col justify-between p-6 md:p-10">
        <div className="flex justify-between items-center text-xs md:text-sm text-white/80">
          <span>LawPrepX Magazine</span>
          <span>Issue • {pageIndex + 1}</span>
        </div>

        <div>
          <h1 className="text-2xl md:text-4xl font-black leading-tight mb-2">
            {displayTitle}
          </h1>
          <p className="text-xs md:text-sm text-white/80 max-w-xl">
            {displaySubtitle}
          </p>
        </div>

        <div className="text-[10px] md:text-xs text-white/60 flex justify-between">
          <span>Swipe / click next to start reading</span>
          <span>LawPrepX</span>
        </div>
      </div>
    </div>
  );
}

export function TwoColumnTemplate({ localTitle, paragraphs, slide }) {
  const mid = Math.ceil(paragraphs.length / 2);
  const col1 = paragraphs.slice(0, mid);
  const col2 = paragraphs.slice(mid);

  return (
    <div
      className="relative h-full w-full rounded-3xl overflow-hidden shadow-xl bg-slate-900"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${slide.backgroundUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(4px)",
          transform: "scale(1.05)",
        }}
      />
      <div className="absolute inset-0 bg-slate-900/75" />
      <Watermark />

      <div className="relative h-full p-5 md:p-8 flex flex-col">
        {localTitle && (
          <div className="mb-3 md:mb-4">
            <h2 className="text-lg md:text-2xl font-bold text-white">
              {localTitle}
            </h2>
            <div className="w-12 h-0.5 bg-amber-400 mt-1" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-xs md:text-sm text-slate-100 leading-relaxed">
          <div className="space-y-2">
            {col1.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="space-y-2">
            {col2.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HighlightRightTemplate({ localTitle, paragraphs, slide, highlight }) {
  const main = paragraphs.slice(0, 4);
  const extra = paragraphs.slice(4);

  return (
    <div
      className="relative h-full w-full rounded-3xl overflow-hidden shadow-xl bg-slate-950"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${slide.backgroundUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.7)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/85 via-slate-950/40 to-slate-900/70" />
      <Watermark />

      <div className="relative h-full p-6 md:p-8 flex flex-col">
        {localTitle && (
          <h2 className="text-lg md:text-2xl font-bold text-white mb-3">
            {localTitle}
          </h2>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs md:text-sm text-slate-100">
          <div className="md:col-span-2 space-y-2 leading-relaxed">
            {main.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {extra.length > 0 && (
              <p className="text-slate-300 text-[11px] md:text-xs">
                {extra.join(" ")}
              </p>
            )}
          </div>

          <div className="md:col-span-1">
            <div className="bg-amber-50/95 text-slate-900 rounded-2xl p-3 md:p-4 shadow-lg border border-amber-200">
              <div className="text-[11px] uppercase tracking-wide text-amber-700 font-semibold mb-1">
                Highlight
              </div>
              <div className="text-xs md:text-sm leading-relaxed">
                {highlight || "Add a key quote or takeaway for this slide in the admin panel."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FullBleedGlassTemplate({ localTitle, paragraphs, slide }) {
  const first = paragraphs[0] || "";
  const rest = paragraphs.slice(1);

  return (
    <div
      className="relative h-full w-full rounded-3xl overflow-hidden shadow-2xl"
      style={{
        backgroundImage: `url(${slide.backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Watermark />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-950/40 to-slate-900/80" />

      <div className="relative h-full p-5 md:p-8 flex items-center">
        <div className="bg-white/12 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 md:p-6 max-w-3xl text-slate-50 shadow-xl">
          {localTitle && (
            <h2 className="text-lg md:text-2xl font-bold mb-2">
              {localTitle}
            </h2>
          )}
          <div className="text-xs md:text-sm leading-relaxed space-y-2">
            {first && (
              <p>
                <span className="text-2xl md:text-3xl font-black text-amber-400 leading-none align-top mr-1">
                  {first[0]}
                </span>
                {first.slice(1)}
              </p>
            )}
            {rest.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PullQuoteTemplate({ localTitle, paragraphs, slide, highlight }) {
  const mid = Math.floor(paragraphs.length / 2);
  const before = paragraphs.slice(0, mid);
  const after = paragraphs.slice(mid);

  return (
    <div
      className="relative h-full w-full rounded-3xl overflow-hidden shadow-xl bg-slate-950"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${slide.backgroundUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.55)",
        }}
      />
      <div className="absolute inset-0 bg-slate-950/65" />
      <Watermark />

      <div className="relative h-full p-5 md:p-8 flex flex-col text-slate-50">
        {localTitle && (
          <h2 className="text-lg md:text-2xl font-bold mb-3">
            {localTitle}
          </h2>
        )}

        <div className="grid md:grid-cols-3 gap-4 text-xs md:text-sm leading-relaxed">
          <div className="md:col-span-1 space-y-2">
            {before.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="md:col-span-1 flex items-center">
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 shadow-lg">
              <div className="text-4xl md:text-5xl text-amber-400 leading-none mb-2">
                “
              </div>
              <div className="text-xs md:text-sm">
                {highlight ||
                  "Add a strong pull-quote for this section in the admin panel to make the page feel like a real magazine spread."}
              </div>
            </div>
          </div>

          <div className="md:col-span-1 space-y-2">
            {after.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
