// utils/loadBackgrounds.js
// Auto-detect ALL images inside /public/backgrounds (any extension)

export function loadBackgroundImages() {
  // Import all files inside /public/backgrounds/*
  const images = import.meta.glob("/public/backgrounds/*", { eager: true });

  return Object.keys(images).map((path) => {
    const name = path.split("/").pop(); // e.g., "bg2.jpg"

    return {
      name,
      url: path.replace("/public", ""), // remove /public prefix → becomes /backgrounds/bg2.jpg
    };
  });
}
