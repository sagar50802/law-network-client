export async function loadImageAuto(basePath) {
  const extensions = ["png", "jpg", "jpeg", "webp"];

  for (const ext of extensions) {
    const url = `${basePath}.${ext}`;
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return url; // Works!
    } catch {}
  }

  return null; // Nothing found
}
