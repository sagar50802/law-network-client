// src/utils/loadImage.js
export async function loadImageAuto(basePath) {
  const exts = [".png", ".jpg", ".jpeg", ".webp"];

  for (const ext of exts) {
    const url = basePath + ext;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url; // Found!
    } catch {}
  }

  return null; // no file found
}
