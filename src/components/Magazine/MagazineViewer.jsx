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

/* -----------------------------------------------------------
   API helper (same as admin)
----------------------------------------------------------- */
const API_BASE = import.meta.env.VITE_BACKEND_URL || "";
function apiUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

async function safeFetchJSON(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();

  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
    console.error("❌ MagazineViewer: server returned HTML for", path);
    throw new Error("Server returned HTML instead of JSON");
  }

  if (!text) {
    throw new Error("Empty response from server");
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error("❌ MagazineViewer: JSON parse failed. Raw:", text);
    throw new Error("Invalid JSON from server");
  }
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
        const data = await safeFetchJSON(`/api/magazines/slug/${slug}`);

        if (!data.ok || !data.issue) {
          console.warn("No magazine found for slug:", slug);
          setIssue(null);
          setPages([]);
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
      } finally {
        setLoading(false);
      }
    }

    if (slug) load();
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

      <div className="aspect-[4/3] md:aspect-[16/9]">{renderPage()}</div>

      <div className="mt-3 text-[10px] md:text-xs text-gray-500 text-center">
        Styled by admin • Dynamic layouts • Watermark: LawPrepX
      </div>
    </div>
  );
}
