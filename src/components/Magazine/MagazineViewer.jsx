import { useEffect, useState } from "react";
import {
  parseSlideText,
  chunkParagraphs,
  pickTemplateName,
} from "./layoutUtils";

import {
  CoverTemplate,
  TwoColumnTemplate,
  HighlightRightTemplate,
  FullBleedGlassTemplate,
  PullQuoteTemplate,
} from "./MagazineTemplates";

/* API BASE */
const API_BASE =
  import.meta.env.VITE_BACKEND_URL || "https://law-network.onrender.com";

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export default function MagazineViewer({ slug }) {
  const [issue, setIssue] = useState(null);
  const [pages, setPages] = useState([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(apiUrl(`/api/magazines/slug/${slug}`));
        const text = await res.text();

        if (text.startsWith("<")) {
          console.error("MagazineViewer: backend returned HTML");
          throw new Error("Invalid JSON from server");
        }

        const data = JSON.parse(text);

        if (!data.ok || !data.issue) {
          setIssue(null);
          setPages([]);
          setError("Magazine not found.");
          return;
        }

        const issue = data.issue;
        setIssue(issue);

        if (!issue.slides || issue.slides.length === 0) {
          setPages([]);
          return;
        }

        const built = [];

        issue.slides.forEach((slide, slideIndex) => {
          const raw = slide.rawText || "";
          const { localTitle, paragraphs } = parseSlideText(raw);
          const safeParagraphs = Array.isArray(paragraphs)
            ? paragraphs
            : [raw];

          const chunks = chunkParagraphs(safeParagraphs, 6);
          if (chunks.length === 0) chunks.push([raw]);

          chunks.forEach((chunk, pageIndex) => {
            built.push({
              slideIndex,
              pageIndex,
              slide: {
                ...slide,
                backgroundUrl: slide.backgroundUrl || "",
              },
              localTitle: localTitle || "Untitled Page",
              paragraphs: chunk,
              templateName: pickTemplateName(slideIndex, pageIndex),
            });
          });
        });

        setPages(built);
        setPageIdx(0);
      } catch (e) {
        console.error("Failed to load magazine:", e);
        setIssue(null);
        setPages([]);
        setError("Invalid JSON from server");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  function goPrev() {
    setPageIdx((idx) => Math.max(0, idx - 1));
  }

  function goNext() {
    setPageIdx((idx) => Math.min(pages.length - 1, idx + 1));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-sm text-gray-500 animate-pulse">
          Loading magazine...
        </div>
      </div>
    );
  }

  if (!issue || pages.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-sm text-red-600">
          {error || "No magazine content available."}
        </div>
      </div>
    );
  }

  const current = pages[pageIdx];

  function renderPage() {
    const commonProps = {
      issueTitle: issue.title,
      issueSubtitle: issue.subtitle,
      localTitle: current.localTitle,
      paragraphs: current.paragraphs,
      slide: current.slide,
      highlight: current.slide.highlight,
      pageIndex: current.pageIndex,
    };

    switch (current.templateName) {
      case "cover":
        return <CoverTemplate {...commonProps} />;

      case "twoColumn":
        return <TwoColumnTemplate {...commonProps} />;

      case "highlightRight":
        return <HighlightRightTemplate {...commonProps} />;

      case "fullBleedGlass":
        return <FullBleedGlassTemplate {...commonProps} />;

      case "pullQuote":
      default:
        return <PullQuoteTemplate {...commonProps} />;
    }
  }

  const totalPages = pages.length;

  return (
    <div className="max-w-6xl mx-auto p-3 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">
            LawPrepX Magazine
          </div>
          <div className="text-sm md:text-lg font-semibold text-gray-900">
            {issue.title}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
          <button
            onClick={goPrev}
            disabled={pageIdx === 0}
            className={`px-2 py-1 rounded-full border text-xs ${
              pageIdx === 0
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-gray-50"
            }`}
          >
            ← Prev
          </button>

          <span className="text-[11px] md:text-xs">
            Page {pageIdx + 1} / {totalPages}
          </span>

          <button
            onClick={goNext}
            disabled={pageIdx === totalPages - 1}
            className={`px-2 py-1 rounded-full border text-xs ${
              pageIdx === totalPages - 1
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-gray-50"
            }`}
          >
            Next →
          </button>
        </div>
      </div>

      <div className="aspect-[4/3] md:aspect-[16/9]">{renderPage()}</div>

      <div className="mt-3 text-[10px] md:text-xs text-gray-500 text-center">
        Styled by admin • Dynamic layouts • Watermark: LawPrepX
      </div>
    </div>
  );
}
