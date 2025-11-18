// src/utils/loadFile.js
export async function loadFileAuto(basePath, exts = ["mp3", "wav", "ogg"]) {
  for (const ext of exts) {
    const url = `${basePath}.${ext}`;

    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (res.ok) return url; // Found the file!
    } catch (err) {
      // skip and try next
    }
  }

  return null; // No extension matched
}
