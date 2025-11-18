// Auto-detect existing file with multiple extensions
export async function loadFileAuto(basePath, exts = ["png", "jpg", "jpeg", "webp", "mp3", "wav"]) {
  for (const ext of exts) {
    const url = `${basePath}.${ext}`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url;
    } catch {}
  }
  return null;
}
