// client/src/components/Magazine/MagazineViewer.jsx
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

export default function MagazineViewer({ slug }) {
  const [issue, setIssue] = useState(null);
  const [pages, setPages] = useState([]); // flattened pages
  const [pageIdx, setPageIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/magazines/${slug}`);
        const data = await res.json();
        const issue = data.issue;
        setIssue(issue);

        // Build pages: each slide may become multiple pages
        const built = [];
        issue.slides.forEach((slide, slideIndex) => {
          const { localTitle, paragraphs } = parseSlideText(slide.rawText);
          const chunks = chunkParagraphs(paragraphs, 6);
          chunks.forEach((chunk, pageIndex) => {
            const templateName = pickTemplateName(slideIndex, pageIndex);
            built.push({
              slideIndex,
              pageIndex,
              slide,
              localTitle,
              paragraphs: chunk,
              templateName,
            });
          });
        });

        setPages(built);
        setPageIdx(0);
      } catch (e) {
        console.error("Failed to load magazine:", e);
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
        <div className="text-sm text-gray-500">
          No magazine content available.
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

      <div className="aspect-[4/3] md:aspect-[16/9]">
        {renderPage()}
      </div>

      <div className="mt-3 text-[10px] md:text-xs text-gray-500 text-center">
        Styled automatically from admin text • Watermark: LawPrepX • Layouts: mixed magazine-style
      </div>
    </div>
  );
}
