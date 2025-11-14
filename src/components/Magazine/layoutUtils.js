// client/src/components/Magazine/layoutUtils.js

export function parseSlideText(rawText = "") {
  // Split into lines, trim empties
  const lines = rawText.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  if (!nonEmpty.length) {
    return {
      localTitle: "",
      paragraphs: [],
    };
  }

  const localTitle = nonEmpty[0];
  const remaining = nonEmpty.slice(1).join("\n");

  const paragraphs = remaining
    .split(/\n{2,}/) // double newline separates paragraphs
    .map((p) => p.trim())
    .filter(Boolean);

  return { localTitle, paragraphs };
}

// Split paragraphs into "page chunks" if slide text is very long
export function chunkParagraphs(paragraphs, maxPerPage = 6) {
  const pages = [];
  for (let i = 0; i < paragraphs.length; i += maxPerPage) {
    pages.push(paragraphs.slice(i, i + maxPerPage));
  }
  return pages.length ? pages : [[]];
}

// Choose template name for page index + slide index
export function pickTemplateName(slideIndex, pageIndex) {
  const variants = [
    "cover",
    "twoColumn",
    "highlightRight",
    "fullBleedGlass",
    "pullQuote",
  ];

  // First slide, first page => cover
  if (slideIndex === 0 && pageIndex === 0) return "cover";

  // simple pattern
  const idx = (slideIndex + pageIndex) % (variants.length - 1); // exclude 'cover'
  return variants[idx + 1]; // skip cover
}
