// Auto-import all images from /public/backgrounds (any extension)
export function loadBackgroundImages() {
  const images = import.meta.glob("/public/backgrounds/*", { eager: true });
  
  return Object.keys(images).map((path) => {
    const file = path.split("/").pop();
    return {
      name: file,
      url: path.replace("/public", ""), // Vite serves /public as root
    };
  });
}
