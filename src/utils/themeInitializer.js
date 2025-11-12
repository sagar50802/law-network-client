// src/utils/themeInitializer.js
// Handles saved theme + focus mode across classroom
// Auto applies theme and creates a floating "Focus Mode ON" badge.

export function applySavedTheme() {
  try {
    const savedTheme = localStorage.getItem("lnx_theme") || "default";
    const focus = localStorage.getItem("lnx_focus") === "true";

    // Apply immediately on page load
    document.body.dataset.theme = savedTheme;
    document.body.dataset.focus = focus ? "on" : "off";

    const isClassroom = window.location.pathname.startsWith("/classroom");
    if (isClassroom && focus) showFocusBadge();
  } catch (err) {
    console.warn("Theme initialization failed:", err);
  }

  // React to storage updates (live sync between pages)
  window.addEventListener("storage", (e) => {
    if (e.key === "lnx_focus" || e.key === "lnx_theme") {
      const theme = localStorage.getItem("lnx_theme") || "default";
      const focus = localStorage.getItem("lnx_focus") === "true";

      document.body.dataset.theme = theme;
      document.body.dataset.focus = focus ? "on" : "off";

      const isClassroom = window.location.pathname.startsWith("/classroom");
      if (isClassroom && focus) showFocusBadge();
      else removeFocusBadge();
    }
  });
}

/* -----------------------------
   🧘 Focus Mode Floating Badge
------------------------------ */
function showFocusBadge() {
  removeFocusBadge(); // avoid duplicates

  const badge = document.createElement("div");
  badge.id = "focus-mode-badge";
  badge.textContent = "🧘 Focus Mode: ON";
  badge.title = "Click to turn off Focus Mode";

  // ✨ Style (responsive, glowing, avoids hamburger overlap)
  Object.assign(badge.style, {
    position: "fixed",
    bottom: window.innerWidth < 640 ? "5.5rem" : "4rem", // above bottom
    right: window.innerWidth < 640 ? "5rem" : "6rem",   // left of hamburger
    padding: "10px 18px",
    borderRadius: "9999px",
    fontWeight: "600",
    fontSize: "0.95rem",
    background: "var(--theme-accent, #10b981)",
    color: "white",
    boxShadow: "0 0 15px var(--theme-glow, rgba(16,185,129,0.4))",
    zIndex: "10050",
    opacity: "0.95",
    animation: "focusBadgePulse 3s infinite ease-in-out",
    transition: "opacity 0.3s ease, transform 0.2s ease",
    cursor: "pointer",
  });

  // 🖱️ Click → disable Focus Mode instantly
  badge.addEventListener("click", () => {
    localStorage.setItem("lnx_focus", "false");
    document.body.dataset.focus = "off";
    removeFocusBadge();

    // ✅ Small feedback toast
    const toast = document.createElement("div");
    toast.textContent = "Focus Mode Disabled 👀";
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "2rem",
      right: "2rem",
      padding: "10px 16px",
      background: "#1e293b",
      color: "#fff",
      borderRadius: "8px",
      boxShadow: "0 0 10px rgba(0,0,0,0.3)",
      opacity: "0",
      transition: "opacity 0.4s ease",
      zIndex: "10051",
    });
    document.body.appendChild(toast);
    setTimeout(() => (toast.style.opacity = "1"), 50);
    setTimeout(() => toast.remove(), 2500);
  });

  document.body.appendChild(badge);

  // Responsive reposition on resize
  window.addEventListener("resize", () => {
    const b = document.getElementById("focus-mode-badge");
    if (!b) return;
    b.style.bottom = window.innerWidth < 640 ? "5.5rem" : "4rem";
    b.style.right = window.innerWidth < 640 ? "5rem" : "6rem";
  });
}

/* -----------------------------
   🧹 Remove badge safely
------------------------------ */
function removeFocusBadge() {
  const existing = document.getElementById("focus-mode-badge");
  if (existing) existing.remove();
}

/* -----------------------------
   🎨 Animation
------------------------------ */
const style = document.createElement("style");
style.textContent = `
@keyframes focusBadgePulse {
  0%, 100% { transform: scale(1); opacity: 0.92; }
  50% { transform: scale(1.08); opacity: 1; }
}
`;
document.head.appendChild(style);
