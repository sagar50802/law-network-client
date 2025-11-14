// utils/loadBackgrounds.js

// Auto-generate background list from /public/backgrounds
// This assumes files named: bg1.jpg, bg2.jpg, ... bg20.jpg
// You can increase MAX_BG if you add more.
export function loadBackgroundImages() {
  const MAX_BG = 20; // change to 30, 40 etc. if you want more
  const result = [];

  for (let i = 1; i <= MAX_BG; i++) {
    const file = `bg${i}.jpg`;
    result.push({
      name: file,
      url: `/backgrounds/${file}`, // served from public/backgrounds
    });
  }

  return result;
}
