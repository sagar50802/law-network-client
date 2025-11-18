// src/utils/loadImage.js
export async function loadImageAuto(basePath) {
  const extensions = ["png", "jpg", "jpeg", "webp"];

  for (const ext of extensions) {
    const url = `${basePath}.${ext}`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url;   // file exists
    } catch {}
  }

  return null;  // no file found
}
