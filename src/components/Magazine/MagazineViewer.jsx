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

const API_BASE = import.meta.env.VITE_BACKEND_URL;
function api(path) {
  return `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
}

export default function MagazineViewer({ slug }) {
  const [issue, setIssue] = useState(null);
  const [pages, setPages] = useState([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const res = await fetch(api(`/magazines/slug/${slug}`));
        const text = await res.text();
        if (!text || text.startsWith("<")) throw new Error("Invalid JSON");

        const data = JSON.parse(text);
        if (!data.ok) throw new Error(data.error);

        const issue = data.issue;
        setIssue(issue);

        let built = [];

        issue.slides.forEach((slide, slideIndex) => {
          const raw = slide.rawText || "";
          const { localTitle, paragraphs } = parseSlideText(raw);
          const chunks = chunkParagraphs(paragraphs, 6);

          chunks.forEach((chunk, pageIndex) => {
            built.push({
              slideIndex,
              pageIndex,
              slide,
              localTitle,
              paragraphs: chunk,
              templateName: pickTemplateName(slideIndex, pageIndex),
            });
          });
        });

        setPages(built);
        setPageIdx(0);
      } catch {
        setIssue(null);
        setPages([]);
      }

      setLoading(false);
    }

    load();
  }, [slug]);

  if (loading) return <div className="p-10">Loading…</div>;
  if (!issue) return <div className="p-10 text-red-500">Invalid JSON from server</div>;
  if (pages.length === 0) return <div>No content</div>;

  const current = pages[pageIdx];

  function renderPage() {
    const props = {
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
        return <CoverTemplate {...props} />;
      case "twoColumn":
        return <TwoColumnTemplate {...props} />;
      case "highlightRight":
        return <HighlightRightTemplate {...props} />;
      case "fullBleedGlass":
        return <FullBleedGlassTemplate {...props} />;
      default:
        return <PullQuoteTemplate {...props} />;
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between mb-3">
        <div>
          <div className="text-xs text-gray-500">Magazine</div>
          <div className="font-bold">{issue.title}</div>
        </div>

        <div className="text-xs flex items-center gap-2">
          <button
            onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
            disabled={pageIdx === 0}
            className="border rounded px-2 py-1"
          >
            Prev
          </button>

          <span>
            {pageIdx + 1} / {pages.length}
          </span>

          <button
            onClick={() => setPageIdx((i) => Math.min(pages.length - 1, i + 1))}
            disabled={pageIdx === pages.length - 1}
            className="border rounded px-2 py-1"
          >
            Next
          </button>
        </div>
      </div>

      <div className="aspect-[4/3]">{renderPage()}</div>
    </div>
  );
}
