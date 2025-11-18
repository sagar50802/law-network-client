// src/utils/loadImage.js
export async function loadImageAuto(basePath) {
  const exts = [".png", ".jpg", ".jpeg", ".webp"];

  for (const ext of exts) {
    const url = basePath + ext;

    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (res.ok) return url; // Found the file!
    } catch (err) {
      // ignore and try next extension
    }
  }

  // Nothing found
  return null;
}
