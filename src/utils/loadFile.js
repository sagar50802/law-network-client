export async function loadFileAuto(basePath, exts = ["mp3", "wav", "ogg"]) {
  for (const ext of exts) {
    const url = `${basePath}.${ext}`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url;
    } catch {}
  }
  return null;
}
